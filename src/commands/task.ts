// ============================================================
// commands/task.ts — エージェントタスク管理コマンド
// TaskHandle.stream() によるSSEリアルタイム進捗表示
// ============================================================

import React from 'react'
import { render, useApp } from 'ink'
import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider } from '../lib/format.js'
import { TaskProgress } from '../ui/TaskProgress.js'
import type { Task, TaskResult, TaskProgressEvent, TaskStatus, TaskType, TaskPriority } from '@mdl-systems/cocoro-sdk'

// ────────────────────────────────────────────────────────────
// task run
// ────────────────────────────────────────────────────────────

interface TaskRunOptions {
    type?: string
    priority?: string
    json?: boolean
}

/** TaskProgressをレンダリングするラッパーコンポーネント */
interface TaskRunnerProps {
    task: Task
    stream: AsyncGenerator<TaskProgressEvent>
}

const TaskRunner: React.FC<TaskRunnerProps> = ({ task, stream }) => {
    const { exit } = useApp()

    const handleComplete = React.useCallback((result: TaskResult | null, error: string | null) => {
        // 完了後1秒待って終了
        setTimeout(() => exit(), 1500)
    }, [exit])

    return React.createElement(TaskProgress, { task, stream, onComplete: handleComplete })
}

export async function taskRunCommand(description: string, opts: TaskRunOptions): Promise<void> {
    const client = await createClient()

    console.log()
    console.log(chalk.bold.magenta('🤖 タスク投入中...'))

    const spinner = ora({ text: 'タスクを作成中...', color: 'magenta' }).start()

    try {
        // 型安全なtype/priority変換
        const validTypes: TaskType[] = ['research', 'write', 'analyze', 'schedule', 'auto']
        const validPriorities: TaskPriority[] = ['low', 'normal', 'high']

        const taskType: TaskType = validTypes.includes(opts.type as TaskType)
            ? opts.type as TaskType
            : 'auto'
        const priority: TaskPriority = validPriorities.includes(opts.priority as TaskPriority)
            ? opts.priority as TaskPriority
            : 'normal'

        // TaskHandle を取得（createTask + TaskHandleラップ）
        const handle = await client.agent.run({
            title: description.slice(0, 100),
            description,
            type: taskType,
            priority,
        })

        spinner.stop()

        if (opts.json) {
            // JSON出力: ポーリングで完了を待つ
            console.log(JSON.stringify({ task_id: handle.id, status: handle.status }, null, 2))
            const result = await handle.result()
            console.log(JSON.stringify(result, null, 2))
            return
        }

        // SSEストリームを取得してinkでリアルタイム表示
        const currentTask = await handle.refresh()
        const stream = handle.stream()

        const { waitUntilExit } = render(
            React.createElement(TaskRunner, { task: currentTask, stream }),
        )

        await waitUntilExit()
        console.log()

    } catch (err) {
        spinner.fail('タスクの作成に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))

        // cocoro-agentが起動していない場合のフォールバック
        console.log(chalk.yellow('\n⚠ cocoro-agentが起動していない可能性があります'))
        console.log(chalk.dim('  設定: cocoro config でagentUrlを確認してください'))
        process.exit(1)
    }
}

// ────────────────────────────────────────────────────────────
// task list
// ────────────────────────────────────────────────────────────

interface TaskListOptions {
    status?: string
    limit?: number
    json?: boolean
}

// タスクステータスの表示
function colorStatus(status: TaskStatus): string {
    switch (status) {
        case 'running': return chalk.yellow('⠿ 実行中')
        case 'queued': return chalk.blue('⏳ 待機中')
        case 'completed': return chalk.green('✅ 完了')
        case 'failed': return chalk.red('✗ 失敗')
        default: return chalk.gray(status)
    }
}

export async function taskListCommand(opts: TaskListOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'タスク一覧を取得中...', color: 'magenta' }).start()

    try {
        const validStatuses: TaskStatus[] = ['queued', 'running', 'completed', 'failed']
        const status = validStatuses.includes(opts.status as TaskStatus)
            ? opts.status as TaskStatus
            : undefined

        const res = await client.agent.listTasks({ status, limit: opts.limit ?? 20 })
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(res, null, 2))
            return
        }

        printHeader(`タスク一覧`, `${res.total} 件中 ${res.tasks.length} 件表示`)

        if (res.tasks.length === 0) {
            console.log(chalk.dim('  タスクがありません'))
        } else {
            for (const task of res.tasks) {
                const id = chalk.cyan(task.task_id.slice(0, 12))
                const status = colorStatus(task.status)
                const pct = task.progress != null
                    ? chalk.dim(` ${Math.round(task.progress * 100)}%`)
                    : ''
                const assignee = task.assignedTo
                    ? chalk.dim(` @${task.assignedTo}`)
                    : ''
                console.log(`  ${id}  ${status}${pct}${assignee}`)
                console.log(chalk.dim(`    ${task.title}`))
                console.log()
            }
        }

        // 統計サマリー
        const stats = await client.agent.getStats().catch(() => null)
        if (stats) {
            console.log(chalk.dim(`  合計: ${stats.total} タスク`))
            for (const [st, count] of Object.entries(stats.byStatus)) {
                if (count > 0) console.log(chalk.dim(`  ${st}: ${count}`))
            }
        }

        printDivider()
    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

// ────────────────────────────────────────────────────────────
// task status
// ────────────────────────────────────────────────────────────

export async function taskStatusCommand(taskId: string, opts: { json?: boolean }): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'タスク状態を取得中...', color: 'magenta' }).start()

    try {
        const task = await client.agent.getTask(taskId)
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(task, null, 2))
            return
        }

        printHeader(`タスク: ${taskId.slice(0, 12)}...`)
        console.log(`  ${chalk.bold('状態')}       ${colorStatus(task.status)}`)
        console.log(`  ${chalk.bold('タイトル')}   ${task.title}`)
        if (task.assignedTo) {
            console.log(`  ${chalk.bold('担当')}       ${task.assignedTo}`)
        }
        if (task.progress != null) {
            const pct = Math.round(task.progress * 100)
            console.log(`  ${chalk.bold('進捗')}       ${pct}%`)
        }
        if (task.currentStep) {
            console.log(`  ${chalk.bold('現在')}       ${chalk.dim(task.currentStep)}`)
        }
        if (task.estimatedSeconds) {
            console.log(`  ${chalk.bold('推定時間')}   ${task.estimatedSeconds}秒`)
        }
        if (task.result) {
            console.log()
            console.log(chalk.bold('📋 結果:'))
            const r = task.result
            console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2))
        }
        if (task.error) {
            console.log()
            console.log(chalk.red(`✗ エラー: ${task.error}`))
        }

        // 感情状態（タスク実行エージェントの感情）
        if (task.emotion) {
            console.log()
            console.log(chalk.dim(`  感情: ${task.emotion.dominant} (happiness: ${task.emotion.happiness.toFixed(2)})`))
        }

        printDivider()
    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

// ────────────────────────────────────────────────────────────
// task stats
// ────────────────────────────────────────────────────────────

export async function taskStatsCommand(opts: { json?: boolean }): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'タスク統計を取得中...', color: 'magenta' }).start()

    try {
        const stats = await client.agent.getStats()
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(stats, null, 2))
            return
        }

        printHeader('タスク統計')
        console.log(`  ${chalk.bold('合計')}  ${chalk.cyan(String(stats.total))} 件`)
        console.log()
        console.log(chalk.bold('ステータス別:'))
        for (const [status, count] of Object.entries(stats.byStatus)) {
            console.log(`  ${status.padEnd(12)} ${chalk.cyan(String(count))} 件`)
        }
        if (stats.byAgent.length > 0) {
            console.log()
            console.log(chalk.bold('エージェント別:'))
            for (const { agent, count, avgDuration } of stats.byAgent) {
                const dur = avgDuration ? ` (平均 ${(avgDuration / 1000).toFixed(1)}s)` : ''
                console.log(`  ${agent.padEnd(16)} ${chalk.cyan(String(count))} 件${chalk.dim(dur)}`)
            }
        }
        printDivider()
    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}
