// ============================================================
// index.ts — cocoro-cli エントリポイント
// Commander.js ベースのCLIルーター
// ============================================================

import { Command } from 'commander'
import chalk from 'chalk'

const program = new Command()

program
    .name('cocoro')
    .description(chalk.magenta('🌸 Cocoro CLI — ローカルAIをターミナルから操作'))
    .version('0.1.0')

// ────────────────────────────────────────────────────────────
// cocoro config
// ────────────────────────────────────────────────────────────

program
    .command('config')
    .description('接続設定を管理する')
    .option('--url <url>', 'cocoro-core URL')
    .option('--key <key>', 'API Key')
    .option('--show', '現在の設定を表示')
    .action(async (opts) => {
        const { configCommand } = await import('./commands/config.js')
        await configCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro ask
// ────────────────────────────────────────────────────────────

program
    .command('ask <question>')
    .description('ワンショット質問（ストリーミング表示）')
    .option('--no-stream', 'ストリーミングなし（パイプ用）')
    .option('--json', 'JSON形式で出力')
    .option('--user <userId>', 'ユーザーID')
    .action(async (question: string, opts) => {
        const { askCommand } = await import('./commands/ask.js')
        await askCommand(question, {
            noStream: opts.noStream === false,
            json: opts.json,
            userId: opts.user,
        })
    })

// ────────────────────────────────────────────────────────────
// cocoro chat
// ────────────────────────────────────────────────────────────

program
    .command('chat')
    .description('インタラクティブチャット（SSEストリーミング）')
    .option('--session <id>', 'セッションID（省略時は自動生成）')
    .action(async (opts) => {
        const { chatCommand } = await import('./commands/chat.js')
        await chatCommand({ sessionId: opts.session })
    })

// ────────────────────────────────────────────────────────────
// cocoro status
// ────────────────────────────────────────────────────────────

program
    .command('status')
    .description('ノード状態・感情・シンクロ率を表示')
    .option('--json', 'JSON形式で出力')
    .option('--watch', '3秒ごとに更新し続ける')
    .action(async (opts) => {
        const { statusCommand } = await import('./commands/status.js')
        await statusCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro personality
// ────────────────────────────────────────────────────────────

program
    .command('personality')
    .description('人格情報・価値観・感情状態を表示')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { personalityCommand } = await import('./commands/personality.js')
        await personalityCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro memory
// ────────────────────────────────────────────────────────────

const memCmd = program
    .command('memory')
    .description('メモリ操作')

memCmd
    .command('list')
    .description('最近の記憶を一覧表示')
    .option('--limit <n>', '件数', '10')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { memoryListCommand } = await import('./commands/memory.js')
        await memoryListCommand({ limit: parseInt(opts.limit, 10), json: opts.json })
    })

memCmd
    .command('search <query>')
    .description('記憶を検索')
    .option('--limit <n>', '件数', '10')
    .option('--json', 'JSON形式で出力')
    .action(async (query: string, opts) => {
        const { memorySearchCommand } = await import('./commands/memory.js')
        await memorySearchCommand(query, { limit: parseInt(opts.limit, 10), json: opts.json })
    })

memCmd
    .command('stats')
    .description('メモリ統計を表示')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { memoryStatsCommand } = await import('./commands/memory.js')
        await memoryStatsCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro task
// ────────────────────────────────────────────────────────────

const taskCmd = program
    .command('task')
    .description('エージェントタスク管理')

taskCmd
    .command('run <description>')
    .description('タスクを実行してリアルタイム進捗を表示')
    .option('--type <type>', 'タスク種別 (research/write/analyze/general)', 'general')
    .option('--priority <priority>', '優先度 (high/normal/low)', 'normal')
    .option('--json', 'JSON形式で出力')
    .action(async (description: string, opts) => {
        const { taskRunCommand } = await import('./commands/task.js')
        await taskRunCommand(description, opts)
    })

taskCmd
    .command('list')
    .description('タスク一覧を表示')
    .option('--status <status>', 'フィルター (running/pending/completed/failed)')
    .option('--limit <n>', '件数', '20')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { taskListCommand } = await import('./commands/task.js')
        await taskListCommand({ ...opts, limit: parseInt(opts.limit, 10) })
    })

taskCmd
    .command('status <taskId>')
    .description('タスク状態を確認')
    .option('--json', 'JSON形式で出力')
    .action(async (taskId: string, opts) => {
        const { taskStatusCommand } = await import('./commands/task.js')
        await taskStatusCommand(taskId, opts)
    })

// ────────────────────────────────────────────────────────────
// エラーハンドリングと起動
// ────────────────────────────────────────────────────────────

program.addHelpText('afterAll', `
${chalk.dim('例:')}
  ${chalk.cyan('cocoro config')}              設定ウィザード
  ${chalk.cyan('cocoro ask "今日は？"')}      ワンショット質問
  ${chalk.cyan('cocoro chat')}                インタラクティブチャット
  ${chalk.cyan('cocoro status')}              ノード状態確認
  ${chalk.cyan('cocoro task run "調査して"')}  タスク実行
`)

program.parse(process.argv)
