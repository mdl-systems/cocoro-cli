// ============================================================
// commands/agent.ts — エージェント管理コマンド
// cocoro agent list / cocoro agent run <role> <task>
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import React from 'react'
import { render } from 'ink'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider } from '../lib/format.js'
import { TaskProgress } from '../ui/TaskProgress.js'
import type { Task, TaskResult, TaskProgressEvent } from '@mdl-systems/cocoro-sdk'

// ────────────────────────────────────────────────────────────
// agent list
// ────────────────────────────────────────────────────────────

interface AgentListOptions {
    json?: boolean
}

/** エージェントステータスのカラー表示 */
function colorAgentStatus(status: string): string {
    switch (status) {
        case 'idle': return chalk.green('○ アイドル')
        case 'busy': return chalk.yellow('⠿ 実行中')
        case 'offline': return chalk.dim('✗ オフライン')
        default: return chalk.dim(status)
    }
}

export async function agentListCommand(opts: AgentListOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'エージェント一覧を取得中...', color: 'magenta' }).start()

    try {
        const agents = await client.agent.list()
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(agents, null, 2))
            return
        }

        printHeader('🤖 エージェント一覧', `${agents.length} 件`)

        if (agents.length === 0) {
            console.log(chalk.dim('  エージェントが見つかりません'))
        } else {
            for (const agent of agents) {
                const id = chalk.cyan(agent.id.slice(0, 12))
                const name = chalk.bold(agent.name)
                const dept = chalk.dim(`[${agent.department}]`)
                const status = colorAgentStatus(agent.status)
                const completed = chalk.dim(`完了: ${agent.completedTasks}  失敗: ${agent.failedTasks}`)

                console.log(`  ${id}  ${name} ${dept}`)
                console.log(`    ${status}  ${completed}`)
                if (agent.currentTask) {
                    console.log(`    ${chalk.dim('実行中: ' + agent.currentTask)}`)
                }
                if (agent.personality?.emotion) {
                    const dom = agent.personality.emotion.dominant
                    console.log(`    ${chalk.dim(`感情: ${dom}`)}`)
                }
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

// ────────────────────────────────────────────────────────────
// agent run <role> <task>
// ────────────────────────────────────────────────────────────

interface AgentRunOptions {
    priority?: string
    json?: boolean
}

interface TaskRunnerProps {
    task: Task
    stream: AsyncGenerator<TaskProgressEvent>
}

const TaskRunner: React.FC<TaskRunnerProps> = ({ task, stream }) => {
    const inkApp = React.useRef<{ exit: () => void } | null>(null)

    // useApp相当の処理 — exit後1.5s待機
    const handleComplete = React.useCallback((_result: TaskResult | null, _error: string | null) => {
        setTimeout(() => {
            if (inkApp.current) inkApp.current.exit()
        }, 1500)
    }, [])

    return React.createElement(TaskProgress, { task, stream, onComplete: handleComplete })
}

export async function agentRunCommand(role: string, taskDescription: string, opts: AgentRunOptions): Promise<void> {
    const client = await createClient()

    console.log()
    console.log(chalk.bold.magenta(`🤖 エージェント [${role}] にタスクを投入中...`))

    const spinner = ora({ text: 'タスクを作成中...', color: 'magenta' }).start()

    try {
        const handle = await client.agent.run({
            title: taskDescription.slice(0, 100),
            description: taskDescription,
            type: 'auto',
            priority: (opts.priority as 'low' | 'normal' | 'high') ?? 'normal',
            assignTo: role !== 'default' ? role : undefined,
        })

        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify({ task_id: handle.id, status: handle.status }, null, 2))
            const result = await handle.result()
            console.log(JSON.stringify(result, null, 2))
            return
        }

        const currentTask = await handle.refresh()
        const stream = handle.stream()

        const { waitUntilExit } = render(
            React.createElement(TaskRunner, { task: currentTask, stream }),
        )
        await waitUntilExit()
        console.log()
    } catch (err) {
        spinner.fail('タスクの投入に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        console.log(chalk.yellow('\n⚠  cocoro-agentが起動していない可能性があります'))
        process.exit(1)
    }
}
