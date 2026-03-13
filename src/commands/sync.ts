// ============================================================
// commands/sync.ts — シンクロ率確認コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider, progressBar } from '../lib/format.js'

interface SyncOptions {
    json?: boolean
}

/** シンクロ率に応じた色を返す */
function syncColor(rate: number): (text: string) => string {
    if (rate >= 80) return (s: string) => chalk.green(s)
    if (rate >= 50) return (s: string) => chalk.yellow(s)
    return (s: string) => chalk.red(s)
}

/** フェーズの日本語表示 */
function phaseLabel(phase: string): string {
    switch (phase) {
        case 'accelerating': return '📈 加速中'
        case 'normal': return '→ 通常'
        case 'slowing': return '📉 鈍化中'
        case 'ceiling': return '⚡ 上限'
        default: return phase
    }
}

export async function syncCommand(opts: SyncOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'シンクロ率を取得中...', color: 'magenta' }).start()

    try {
        const [growth, personality] = await Promise.all([
            client.personality.getGrowth(),
            client.personality.get().catch(() => null),
        ])
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify({ growth, personality: personality?.identity }, null, 2))
            return
        }

        const rate = growth.syncRate
        const color = syncColor(rate)
        const bar = progressBar(rate / 100, 1, 30)

        printHeader('⚡ シンクロ率')

        // 大きくシンクロ率を表示
        console.log()
        console.log(`  ${chalk.bold(color(`${rate}%`))}  ${bar}`)
        console.log()

        // フェーズ・学習レート
        console.log(`  ${chalk.bold('フェーズ')}       ${phaseLabel(growth.phase)}`)
        console.log(`  ${chalk.bold('学習レート')}     ${chalk.cyan(growth.learningRate.toFixed(4))}`)

        // 人格名
        if (personality?.identity) {
            const { name, role } = personality.identity
            console.log(`  ${chalk.bold('AI名')}          ${chalk.magenta(name)}`)
            console.log(`  ${chalk.bold('役割')}          ${chalk.dim(role)}`)
        }

        // シンクロ状態のコメント
        console.log()
        if (rate >= 90) {
            console.log(chalk.green('  ✨ 深い絆が形成されています'))
        } else if (rate >= 70) {
            console.log(chalk.cyan('  💫 良好な関係が築かれています'))
        } else if (rate >= 50) {
            console.log(chalk.yellow('  🌱 関係が育まれています'))
        } else {
            console.log(chalk.dim('  📡 関係を深めましょう'))
        }

        printDivider()
    } catch (err) {
        spinner.fail('シンクロ率の取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}
