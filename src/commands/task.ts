// ============================================================
// commands/task.ts — エージェントタスク管理コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider } from '../lib/format.js'
import type { TaskStatus } from '@mdl-systems/cocoro-sdk'

interface TaskRunOptions {
    type?: string
    priority?: string
    json?: boolean
}

interface TaskListOptions {
    status?: string
    limit?: number
    json?: boolean
}

// タスクステータスの色
function colorStatus(status: string): string {
    switch (status) {
        case 'in_progress': return chalk.yellow('実行中')
        case 'completed': return chalk.green('完了')
        case 'failed': return chalk.red('失敗')
        case 'pending': return chalk.blue('待機中')
        default: return chalk.gray(status)
    }
}

export async function taskRunCommand(description: string, opts: TaskRunOptions): Promise<void> {
    const client = await createClient()

    console.log()
    console.log(chalk.bold.magenta('🤖 タスク実行'))
    console.log(chalk.dim(`  ${description}`))
    console.log()

    const spinner = ora({
        text: 'タスクを送信中...',
        color: 'magenta',
        spinner: 'dots',
    }).start()

    try {
        // TaskPriority は 'low' | 'normal' | 'high' | 'urgent'
        const priority = (['low', 'normal', 'high', 'urgent'].includes(opts.priority ?? ''))
            ? opts.priority as 'low' | 'normal' | 'high' | 'urgent'
            : 'normal'

        const task = await client.agent.createTask({
            title: description.slice(0, 100), // titleは必須
            description,
            priority,
        })

        spinner.text = `タスク実行中... (ID: ${task.id})`

        // ポーリングでステータス確認
        const progressChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        let spinIdx = 0
        let pct = 0

        while (true) {
            await sleep(2000)

            // listTasksでフィルタリングして確認
            const tasks = await client.agent.listTasks({ limit: 50 })
            const current = tasks.find(t => t.id === task.id)

            if (!current) {
                spinner.warn('タスクが見つかりません')
                break
            }

            const spin = progressChars[spinIdx++ % progressChars.length]
            pct = Math.min(pct + 10, 90) // シミュレーション的に進捗を上げる
            const bar = buildProgressBar(pct / 100)
            spinner.text = `${spin} ${colorStatus(current.status)}... ${bar} ${pct}%`

            if (current.status === 'completed') {
                spinner.succeed(chalk.green(`✅ 完了`))
                console.log()
                if (current.result) {
                    console.log(chalk.bold('結果:'))
                    console.log(current.result)
                }
                break
            }

            if (current.status === 'failed') {
                spinner.fail(chalk.red('タスクが失敗しました'))
                process.exit(1)
            }
        }

    } catch (err) {
        spinner.fail('タスクの送信に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

export async function taskListCommand(opts: TaskListOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'タスク一覧を取得中...', color: 'magenta' }).start()

    try {
        // TaskStatus は 'pending' | 'in_progress' | 'completed' | 'failed'
        const validStatus: TaskStatus[] = ['pending', 'in_progress', 'completed', 'failed']
        const statusFilter = validStatus.includes(opts.status as TaskStatus)
            ? opts.status as TaskStatus
            : undefined

        const tasks = await client.agent.listTasks({
            status: statusFilter,
            limit: opts.limit ?? 20,
        })
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(tasks, null, 2))
            return
        }

        printHeader('タスク一覧', `${tasks.length} 件`)

        if (tasks.length === 0) {
            console.log(chalk.dim('  タスクがありません'))
        } else {
            for (const task of tasks) {
                const id = task.id.slice(0, 12)
                const status = colorStatus(task.status)
                console.log(`  ${chalk.cyan(id)}  ${status}  [${task.priority}]`)
                console.log(`    ${chalk.dim(task.description ?? task.title ?? '(説明なし)')}`)
                console.log()
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

export async function taskStatusCommand(taskId: string, opts: { json?: boolean }): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'タスク状態を取得中...', color: 'magenta' }).start()

    try {
        // listTasksからIDで検索
        const tasks = await client.agent.listTasks({ limit: 100 })
        const task = tasks.find(t => t.id === taskId || t.id.startsWith(taskId))
        spinner.stop()

        if (!task) {
            console.error(chalk.red(`✗ タスクが見つかりません: ${taskId}`))
            process.exit(1)
        }

        if (opts.json) {
            console.log(JSON.stringify(task, null, 2))
            return
        }

        printHeader(`タスク: ${task.id.slice(0, 12)}...`)
        console.log(`  ${chalk.bold('状態')}     ${colorStatus(task.status)}`)
        console.log(`  ${chalk.bold('優先度')}   ${task.priority}`)
        if (task.title) {
            console.log(`  ${chalk.bold('タイトル')} ${task.title}`)
        }
        if (task.description) {
            console.log(`  ${chalk.bold('説明')}     ${task.description}`)
        }
        if (task.assignedTo) {
            console.log(`  ${chalk.bold('担当')}     ${task.assignedTo}`)
        }
        if (task.result) {
            console.log()
            console.log(chalk.bold('結果:'))
            console.log(task.result)
        }
        printDivider()
    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

function buildProgressBar(ratio: number, width = 20): string {
    const filled = Math.round(Math.min(ratio, 1) * width)
    const empty = width - filled
    return chalk.magenta('█'.repeat(filled)) + chalk.dim('░'.repeat(empty))
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
