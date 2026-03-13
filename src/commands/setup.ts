// ============================================================
// commands/setup.ts — Boot Wizard（初期セットアップ）
// cocoro setup — 初回セットアップをターミナルで対話式に実行
// ============================================================

import { input, confirm, select, password } from '@inquirer/prompts'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.cocoro')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

interface Config {
    baseUrl: string
    agentUrl: string
    apiKey: string
    defaultUserId: string
    defaultAgent?: string
}

export async function setupCommand(): Promise<void> {
    console.log()
    console.log(chalk.bold.magenta('╔═══════════════════════════════════════╗'))
    console.log(chalk.bold.magenta('║') + chalk.bold('  🌸 Cocoro Boot Wizard                ') + chalk.bold.magenta('║'))
    console.log(chalk.bold.magenta('║') + chalk.dim('  ローカルAIとの接続を設定します       ') + chalk.bold.magenta('║'))
    console.log(chalk.bold.magenta('╚═══════════════════════════════════════╝'))
    console.log()

    // 既存設定の確認
    let existingConfig: Partial<Config> = {}
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
        existingConfig = JSON.parse(raw)
        console.log(chalk.yellow('  ⚠  既存の設定が見つかりました。上書きします。'))
        console.log()
    } catch {
        // 初回
    }

    // Step 1: cocoro-core URL
    const coreUrl = await input({
        message: '1️⃣  cocoro-core の URL:',
        default: existingConfig.baseUrl ?? 'http://192.168.50.92:8001',
        validate: (v) => {
            try { new URL(v); return true }
            catch { return '有効なURLを入力してください (例: http://192.168.50.92:8001)' }
        },
    })

    // Step 2: API Key
    const apiKey = await password({
        message: '2️⃣  API Key:',
        mask: '*',
    })
    if (!apiKey) {
        console.log(chalk.red('  API Keyは必須です'))
        process.exit(1)
    }

    // Step 3: cocoro-agent URL
    const useAgent = await confirm({
        message: '3️⃣  cocoro-agent を使用しますか？（タスク実行機能）',
        default: true,
    })

    let agentUrl = ''
    if (useAgent) {
        agentUrl = await input({
            message: '   cocoro-agent の URL:',
            default: existingConfig.agentUrl ?? coreUrl.replace(':8001', ':8002'),
            validate: (v) => {
                try { new URL(v); return true }
                catch { return '有効なURLを入力してください' }
            },
        })
    }

    // Step 4: デフォルトエージェント
    const defaultAgent = await input({
        message: '4️⃣  デフォルトエージェント名:',
        default: existingConfig.defaultAgent ?? 'default',
    })

    // Step 5: User ID
    const defaultUserId = await input({
        message: '5️⃣  ユーザーID:',
        default: existingConfig.defaultUserId ?? 'default',
    })

    // 接続テスト
    console.log()
    const doTest = await confirm({
        message: '接続テストを実行しますか？',
        default: true,
    })

    if (doTest) {
        const spinner = ora({ text: '接続テスト中...', color: 'magenta' }).start()

        try {
            // 動的インポートでcreateClientを使わずに直接テスト
            const testUrl = `${coreUrl.replace(/\/$/, '')}/health`
            const res = await fetch(testUrl, {
                headers: { 'X-API-Key': apiKey },
                signal: AbortSignal.timeout(8000),
            })
            if (res.ok) {
                const data = await res.json().catch(() => ({})) as { version?: string }
                spinner.succeed(`接続成功！ (version: ${data.version ?? '?'})`)
            } else {
                spinner.warn(`HTTP ${res.status} — 設定は保存しますが削除確認してください`)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            spinner.fail(`接続失敗: ${msg}`)
            console.log(chalk.dim('  (設定は保存されます。サーバーを起動後に cocoro status で確認してください)'))
        }
    }

    // 設定を保存
    const config: Config = {
        baseUrl: coreUrl.replace(/\/$/, ''),
        agentUrl: (agentUrl || coreUrl.replace(':8001', ':8002')).replace(/\/$/, ''),
        apiKey,
        defaultUserId,
        defaultAgent,
    }

    await fs.mkdir(CONFIG_DIR, { recursive: true })
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')

    console.log()
    console.log(chalk.green(`  ✅ 設定を保存しました: ${CONFIG_PATH}`))
    console.log()
    console.log(chalk.bold('  次のコマンドで動作確認:'))
    console.log(`    ${chalk.cyan('cocoro status')}       ノード状態確認`)
    console.log(`    ${chalk.cyan('cocoro chat')}         チャット開始`)
    console.log(`    ${chalk.cyan('cocoro emotion')}      感情状態確認`)
    console.log()
}
