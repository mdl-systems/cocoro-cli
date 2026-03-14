// ============================================================
// commands/init.ts — cocoro init 初回セットアップウィザード
// setup.ts より簡潔な接続設定フォーカス版
// ============================================================

import { input, password, confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

const CONFIG_DIR  = path.join(os.homedir(), '.cocoro')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

interface CocoroConfig {
    baseUrl: string
    agentUrl: string
    apiKey: string
    defaultUserId: string
    defaultAgent: string
}

export async function initCommand(): Promise<void> {
    console.log()
    console.log(chalk.bold.magenta('╔════════════════════════════════════════╗'))
    console.log(chalk.bold.magenta('║') + chalk.bold.white('  🌸 Cocoro Init — 初回セットアップ     ') + chalk.bold.magenta('║'))
    console.log(chalk.bold.magenta('║') + chalk.dim('  ローカルAIとの接続を設定します        ') + chalk.bold.magenta('║'))
    console.log(chalk.bold.magenta('╚════════════════════════════════════════╝'))
    console.log()

    // 既存設定読み込み（上書き確認）
    let existingConfig: Partial<CocoroConfig> = {}
    let hasExisting = false
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
        existingConfig = JSON.parse(raw) as Partial<CocoroConfig>
        hasExisting = true

        console.log(chalk.yellow('  ⚠  既存の設定が見つかりました:'))
        console.log(chalk.dim(`     URL: ${existingConfig.baseUrl ?? '未設定'}`))
        console.log(chalk.dim(`     Agent: ${existingConfig.defaultAgent ?? 'default'}`))
        console.log()

        const overwrite = await confirm({
            message: '上書きしますか？',
            default: true,
        })
        if (!overwrite) {
            console.log(chalk.dim('  キャンセルしました'))
            return
        }
        console.log()
    } catch {
        // 初回 — 設定ファイルなし
    }

    // ── Step 1: cocoro-core URL ──
    const coreUrl = await input({
        message: 'cocoro-core の URL:',
        default: existingConfig.baseUrl ?? 'http://192.168.50.92',
        validate: (v) => {
            const withPort = v.includes(':') ? v : `${v}:8001`
            try { new URL(withPort); return true }
            catch { return '有効なURLを入力してください (例: http://192.168.50.92)' }
        },
    })

    // ポート番号がなければ :8001 を補完
    const normalizedCoreUrl = (() => {
        const u = coreUrl.replace(/\/$/, '')
        try {
            const parsed = new URL(u)
            if (!parsed.port) return `${u}:8001`
            return u
        } catch {
            return `${u}:8001`
        }
    })()

    // ── Step 2: API キー ──
    const apiKey = await password({
        message: 'API キー:',
        mask: '*',
        validate: (v) => v.length > 0 ? true : 'APIキーを入力してください',
    })

    // ── Step 3: デフォルトエージェント ──
    const defaultAgent = await input({
        message: 'デフォルトエージェント名:',
        default: existingConfig.defaultAgent ?? 'MDL',
    })

    // ── Step 4: cocoro-agent URL（任意） ──
    const agentUrlDefault = normalizedCoreUrl.replace(':8001', ':8002')
    const agentUrl = await input({
        message: 'cocoro-agent の URL (省略でデフォルト):',
        default: existingConfig.agentUrl ?? agentUrlDefault,
    })

    // ── Step 5: 接続確認 ──
    console.log()
    const doTest = await confirm({
        message: 'cocoro-core への接続を確認しますか？',
        default: true,
    })

    let connectionOk = false
    let coreVersion = ''

    if (doTest) {
        const spinner = ora({ text: '接続確認中...', color: 'magenta' }).start()
        try {
            const res = await fetch(`${normalizedCoreUrl}/health`, {
                headers: { 'X-API-Key': apiKey },
                signal: AbortSignal.timeout(8000),
            })

            if (res.ok) {
                const data = await res.json().catch(() => ({})) as { version?: string; status?: string }
                coreVersion = data.version ?? ''
                connectionOk = true
                spinner.succeed(`接続成功！${coreVersion ? ` (v${coreVersion})` : ''}`)
            } else {
                spinner.warn(`HTTP ${res.status} — サーバーは応答しましたが認証エラーの可能性があります`)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            spinner.fail(`接続失敗: ${msg}`)
            console.log(chalk.dim('  (設定は保存します。サーバー起動後に cocoro status で確認してください)'))
        }
    }

    // ── 設定ファイル保存 ──
    const config: CocoroConfig = {
        baseUrl:      normalizedCoreUrl,
        agentUrl:     (agentUrl || agentUrlDefault).replace(/\/$/, ''),
        apiKey,
        defaultUserId: existingConfig.defaultUserId ?? 'default',
        defaultAgent:  defaultAgent || 'MDL',
    }

    await fs.mkdir(CONFIG_DIR, { recursive: true })
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')

    console.log()
    console.log(chalk.green(`  ✅ ~/.cocoro/config.json を作成しました`))
    if (connectionOk) {
        console.log(chalk.green(`  ✅ cocoro-core への接続を確認しました`))
    }
    console.log()
    console.log(chalk.bold.magenta('  🎉 セットアップ完了！'))
    console.log()
    console.log(chalk.bold('  次のコマンドを試してみましょう:'))
    console.log(`    ${chalk.cyan('cocoro chat')}         💬 AIとチャット開始`)
    console.log(`    ${chalk.cyan('cocoro status')}       📊 ノード状態確認`)
    console.log(`    ${chalk.cyan('cocoro emotion')}      😊 感情状態確認`)
    console.log(`    ${chalk.cyan('cocoro sync')}         ⚡ シンクロ率確認`)
    console.log()
}
