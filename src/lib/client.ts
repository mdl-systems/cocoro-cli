// ============================================================
// lib/client.ts — CocoroClient 初期化（設定ファイル読込）
// ============================================================

import { CocoroClient } from '@mdl-systems/cocoro-sdk'
import { loadConfig, getConfigFromEnv, mergeConfig } from './config.js'
import chalk from 'chalk'

/**
 * 設定を読み込んでCocoroClientを返す
 * 設定がなければエラーを表示して終了
 */
export async function createClient(): Promise<CocoroClient> {
    const fileConfig = await loadConfig()
    const envConfig = getConfigFromEnv()
    const config = mergeConfig(fileConfig, envConfig)

    if (!config) {
        console.error(chalk.red('✗ 接続設定が見つかりません'))
        console.error(chalk.dim('  cocoro config を実行して設定してください'))
        process.exit(1)
    }

    return new CocoroClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        userId: config.defaultUserId,
    })
}
