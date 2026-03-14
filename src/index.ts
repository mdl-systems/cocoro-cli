// ============================================================
// index.ts — cocoro-cli エントリポイント
// Commander.js ベースのCLIルーター (Full Implementation)
// ============================================================

import { Command } from 'commander'
import chalk from 'chalk'

const program = new Command()

program
    .name('cocoro')
    .description(chalk.magenta('🌸 Cocoro CLI — ローカルAIをターミナルから操作'))
    .version('0.2.0')

// ────────────────────────────────────────────────────────────
// cocoro setup — Boot Wizard（初回セットアップ）
// ────────────────────────────────────────────────────────────

program
    .command('setup')
    .description('Boot Wizard — 初回セットアップを対話式で実行')
    .action(async () => {
        const { setupCommand } = await import('./commands/setup.js')
        await setupCommand()
    })

// ────────────────────────────────────────────────────────────
// cocoro config / cocoro config set
// ────────────────────────────────────────────────────────────

const configCmd = program
    .command('config')
    .description('接続設定を管理する')

configCmd
    .command('set <key> <value>')
    .description('設定を直接変更 (key: baseUrl/apiKey/agentUrl/defaultUserId/defaultAgent)')
    .action(async (key: string, value: string) => {
        const { configSetCommand } = await import('./commands/config.js')
        await configSetCommand(key, value)
    })

configCmd
    .command('show')
    .description('現在の設定を表示')
    .action(async () => {
        const { configCommand } = await import('./commands/config.js')
        await configCommand({ show: true })
    })

// "cocoro config" 単体（オプション付き）も引き続きサポート
configCmd
    .option('--url <url>', 'cocoro-core URL')
    .option('--key <key>', 'API Key')
    .option('--show', '現在の設定を表示')
    .action(async (opts) => {
        const { configCommand } = await import('./commands/config.js')
        await configCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro chat [question] — インタラクティブ or ワンショット
// ────────────────────────────────────────────────────────────

program
    .command('chat [question]')
    .description('チャット。引数なしでインタラクティブ、引数ありで1回質問して終了')
    .option('--session <id>', 'セッションID（省略時は自動生成）')
    .option('--no-stream', 'ストリーミングなし')
    .option('--json', 'JSON形式で出力')
    .action(async (question: string | undefined, opts) => {
        if (question) {
            // 引数ありの場合は ask コマンドに委譲
            const { askCommand } = await import('./commands/ask.js')
            await askCommand(question, {
                noStream: opts.noStream === false,
                json: opts.json,
            })
        } else {
            const { chatCommand } = await import('./commands/chat.js')
            await chatCommand({ sessionId: opts.session })
        }
    })

// ────────────────────────────────────────────────────────────
// cocoro ask <question>
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
// cocoro status
// ────────────────────────────────────────────────────────────

program
    .command('status')
    .description('ノード状態・感情・シンクロ率を表示')
    .option('--json', 'JSON形式で出力')
    .option('--watch', '5秒ごとに自動更新')
    .action(async (opts) => {
        const { statusCommand } = await import('./commands/status.js')
        await statusCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro emotion — 感情状態
// ────────────────────────────────────────────────────────────

program
    .command('emotion')
    .description('現在の感情状態をバー表示')
    .option('--json', 'JSON形式で出力')
    .option('--watch', '3秒ごとに自動更新')
    .action(async (opts) => {
        const { emotionCommand } = await import('./commands/emotion.js')
        await emotionCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro sync — シンクロ率
// ────────────────────────────────────────────────────────────

program
    .command('sync')
    .description('AIとのシンクロ率を確認')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { syncCommand } = await import('./commands/sync.js')
        await syncCommand(opts)
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

memCmd
    .command('delete <entryId>')
    .description('指定IDのメモリエントリを削除')
    .option('--force', '確認プロンプトをスキップ')
    .option('--json', 'JSON形式で出力')
    .action(async (entryId: string, opts) => {
        const { memoryDeleteCommand } = await import('./commands/memory.js')
        await memoryDeleteCommand(entryId, opts)
    })

memCmd
    .command('clear')
    .description('メモリを一括削除（デフォルト: 短期記憶のみ）')
    .option('--all', '全メモリ（短期+長期+エピソード）を削除')
    .option('--force', '確認プロンプトをスキップ')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { memoryClearCommand } = await import('./commands/memory.js')
        await memoryClearCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro agent — エージェント管理
// ────────────────────────────────────────────────────────────

const agentCmd = program
    .command('agent')
    .description('エージェント管理')

agentCmd
    .command('list')
    .description('エージェント一覧を表示')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { agentListCommand } = await import('./commands/agent.js')
        await agentListCommand(opts)
    })

agentCmd
    .command('run <role> <task>')
    .description('指定ロールのエージェントにタスクを実行させる')
    .option('--priority <priority>', '優先度 (high/normal/low)', 'normal')
    .option('--json', 'JSON形式で出力')
    .action(async (role: string, task: string, opts) => {
        const { agentRunCommand } = await import('./commands/agent.js')
        await agentRunCommand(role, task, opts)
    })

// ────────────────────────────────────────────────────────────
// cocoro task — タスク管理（低レベル）
// ────────────────────────────────────────────────────────────

const taskCmd = program
    .command('task')
    .description('エージェントタスク管理')

taskCmd
    .command('run <description>')
    .description('タスクを実行してリアルタイム進捗を表示')
    .option('--type <type>', 'タスク種別 (research/write/analyze/schedule/auto)', 'auto')
    .option('--priority <priority>', '優先度 (high/normal/low)', 'normal')
    .option('--json', 'JSON形式で出力')
    .action(async (description: string, opts) => {
        const { taskRunCommand } = await import('./commands/task.js')
        await taskRunCommand(description, opts)
    })

taskCmd
    .command('list')
    .description('タスク一覧を表示')
    .option('--status <status>', 'フィルター (running/queued/completed/failed)')
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

taskCmd
    .command('stats')
    .description('タスク統計を表示')
    .option('--json', 'JSON形式で出力')
    .action(async (opts) => {
        const { taskStatsCommand } = await import('./commands/task.js')
        await taskStatsCommand(opts)
    })

// ────────────────────────────────────────────────────────────
// エラーハンドリングと起動
// ────────────────────────────────────────────────────────────

program.addHelpText('afterAll', `
${chalk.dim('例:')}
  ${chalk.cyan('cocoro setup')}                          初回セットアップ
  ${chalk.cyan('cocoro chat')}                           インタラクティブチャット
  ${chalk.cyan('cocoro chat "今日の天気は？"')}           ワンショット質問
  ${chalk.cyan('cocoro emotion')}                        感情状態確認
  ${chalk.cyan('cocoro sync')}                           シンクロ率確認
  ${chalk.cyan('cocoro status')}                         ノード状態確認
  ${chalk.cyan('cocoro agent list')}                     エージェント一覧
  ${chalk.cyan('cocoro agent run default "調査して"')}   タスク実行
  ${chalk.cyan('cocoro memory list')}                    記憶一覧
  ${chalk.cyan('cocoro memory search "旅行"')}           記憶検索
  ${chalk.cyan('cocoro config set baseUrl http://...')}  設定変更
  ${chalk.cyan('cocoro config show')}                    設定表示
`)

program.parse(process.argv)
