// ============================================================
// commands/config.ts — 接続設定コマンド
// ============================================================

import { input, password } from '@inquirer/prompts'
import chalk from 'chalk'
import { loadConfig, saveConfig, getConfigPath } from '../lib/config.js'
import type { CocoroConfig } from '../lib/config.js'
import { CocoroClient } from '@mdl-systems/cocoro-sdk'
import { success, error, printHeader, printDivider } from '../lib/format.js'

interface ConfigOptions {
    url?: string
    key?: string
    show?: boolean
}

export async function configCommand(opts: ConfigOptions): Promise<void> {
    // --show: 現在の設定を表示
    if (opts.show) {
        const config = await loadConfig()
        if (!config) {
            error('設定ファイルが見つかりません')
            console.log(chalk.dim(`  ${getConfigPath()}`))
            return
        }
        printHeader('Cocoro 設定', getConfigPath())
        console.log(`  ${chalk.bold('URL')}      ${chalk.cyan(config.baseUrl)}`)
        if (config.agentUrl) {
            console.log(`  ${chalk.bold('Agent URL')} ${chalk.cyan(config.agentUrl)}`)
        }
        console.log(`  ${chalk.bold('API Key')}  ${chalk.yellow('****' + config.apiKey.slice(-4))}`)
        if (config.defaultUserId) {
            console.log(`  ${chalk.bold('User ID')}  ${config.defaultUserId}`)
        }
        printDivider()
        return
    }

    // --url と --key が両方指定されていれば非対話モード
    if (opts.url && opts.key) {
        await saveAndVerify({
            baseUrl: opts.url,
            apiKey: opts.key,
        })
        return
    }

    // 対話式設定
    printHeader('Cocoro セットアップ')
    console.log(chalk.dim('  接続先のcocoro-core URLとAPIキーを設定します\n'))

    const existing = await loadConfig()

    const baseUrl = await input({
        message: 'cocoro-core URL:',
        default: existing?.baseUrl ?? 'http://localhost:8001',
        validate: (v) => {
            try {
                new URL(v)
                return true
            } catch {
                return '有効なURLを入力してください (例: http://192.168.50.92:8001)'
            }
        },
    })

    const apiKey = await password({
        message: 'API Key:',
        mask: '*',
        validate: (v) => v.length > 0 ? true : 'APIキーを入力してください',
    })

    const agentUrl = await input({
        message: 'Agent URL (省略可):',
        default: existing?.agentUrl ?? '',
    })

    await saveAndVerify({
        baseUrl: baseUrl.replace(/\/$/, ''),
        apiKey,
        agentUrl: agentUrl || undefined,
        defaultUserId: existing?.defaultUserId,
    })
}

async function saveAndVerify(config: CocoroConfig): Promise<void> {
    await saveConfig(config)
    success(`設定を保存しました: ${getConfigPath()}`)

    // 接続確認
    process.stdout.write(chalk.cyan('⟳ 接続確認中...'))

    try {
        const client = new CocoroClient({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
        })
        const health = await client.health.check()
        process.stdout.write('\r')
        success(`接続確認OK (cocoro-core ${health.version})`)

        // 感情状態を取得してみる
        try {
            const emotion = await client.emotion.getState()
            console.log(chalk.dim(`  感情: ${emotion.dominant ?? 'neutral'}`))
        } catch {
            // 感情取得失敗は無視
        }
    } catch (err) {
        process.stdout.write('\r')
        console.log(chalk.yellow('⚠ 設定は保存しましたが、接続確認に失敗しました'))
        console.log(chalk.dim(`  サーバーが起動しているか確認してください: ${config.baseUrl}`))
        if (err instanceof Error) {
            console.log(chalk.dim(`  詳細: ${err.message}`))
        }
    }
}

// ────────────────────────────────────────────────────────────
// config set <key> <value>
// ────────────────────────────────────────────────────────────

const VALID_KEYS = ['baseUrl', 'apiKey', 'agentUrl', 'defaultUserId', 'defaultAgent'] as const
type ConfigKey = typeof VALID_KEYS[number]

export async function configSetCommand(key: string, value: string): Promise<void> {
    if (!VALID_KEYS.includes(key as ConfigKey)) {
        console.log(chalk.red(`  ✗ 不明なキー: ${key}`))
        console.log(chalk.dim(`  有効なキー: ${VALID_KEYS.join(', ')}`))
        process.exit(1)
    }

    const existing = await loadConfig() ?? {} as CocoroConfig
    const updated: CocoroConfig = { ...existing, [key]: value } as CocoroConfig

    if (!updated.baseUrl || !updated.apiKey) {
        console.log(chalk.yellow('  ⚠  baseUrl と apiKey は必須です'))
        console.log(chalk.dim('  先に `cocoro setup` を実行することをお勧めします'))
    }

    await saveConfig(updated)
    success(`${key} を更新しました`)
    console.log(chalk.dim(`  ${key}: ${key === 'apiKey' ? '****' + value.slice(-4) : value}`))
}

