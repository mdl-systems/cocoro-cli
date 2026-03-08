// ============================================================
// commands/status.ts — ノード状態表示コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import {
    printHeader,
    printDivider,
    cpuBar,
    formatUptime,
    emotionEmoji,
    dominantEmotion,
} from '../lib/format.js'

interface StatusOptions {
    json?: boolean
    watch?: boolean
}

export async function statusCommand(opts: StatusOptions): Promise<void> {
    const client = await createClient()

    if (opts.watch) {
        // ウォッチモード：3秒ごとに更新
        while (true) {
            process.stdout.write('\x1Bc') // 画面クリア
            await renderStatus(client, opts.json ?? false)
            await sleep(3000)
        }
    } else {
        await renderStatus(client, opts.json ?? false)
    }
}

async function renderStatus(client: Awaited<ReturnType<typeof createClient>>, asJson: boolean): Promise<void> {
    const spinner = ora({ text: '情報取得中...', color: 'magenta' }).start()

    try {
        // 並列取得
        const [health, dashboard, emotion, growth, memStats] = await Promise.allSettled([
            client.health.check(),
            client.monitor.getDashboard(),
            client.emotion.getState(),
            client.personality.getGrowth(),
            client.memory.getStats(),
        ])

        spinner.stop()

        if (asJson) {
            console.log(JSON.stringify({
                health: settled(health),
                dashboard: settled(dashboard),
                emotion: settled(emotion),
                growth: settled(growth),
                memory: settled(memStats),
            }, null, 2))
            return
        }

        printHeader('Cocoro Node Status')

        // ── ヘルスチェック ──────────────────────────────
        const h = settled(health)
        if (h) {
            const statusColor = h.status === 'ok' ? chalk.green : h.status === 'degraded' ? chalk.yellow : chalk.red
            const statusIcon = h.status === 'ok' ? '✅' : h.status === 'degraded' ? '⚠' : '✗'
            console.log(`  ${chalk.bold('バージョン')}  ${chalk.cyan(h.version)}`)
            console.log(`  ${chalk.bold('状態')}      ${statusColor(`${statusIcon} ${h.status}`)}`)
            console.log(`  ${chalk.bold('稼働時間')}  ${formatUptime(h.uptime)}`)
            console.log()
        }

        // ── システムリソース ─────────────────────────────
        const d = settled(dashboard)
        if (d) {
            console.log(chalk.bold('📊 システム'))
            const cpuPct = Math.round(d.cpu)
            const memPct = Math.round(d.memory)
            console.log(`  CPU      ${cpuPct.toString().padStart(3)}%  │${cpuBar(cpuPct, 12)}│`)
            console.log(`  メモリ   ${memPct.toString().padStart(3)}%  │${cpuBar(memPct, 12)}│`)
            if (d.disk != null) {
                const diskPct = Math.round(d.disk)
                console.log(`  ディスク ${diskPct.toString().padStart(3)}%  │${cpuBar(diskPct, 12)}│`)
            }
            console.log(`  接続数   ${d.activeConnections ?? '-'}`)
            console.log()
        }

        // ── 感情・シンクロ率 ──────────────────────────────
        const em = settled(emotion)
        const gr = settled(growth)
        if (em || gr) {
            console.log(chalk.bold('🧠 人格状態'))
            if (gr) {
                // GrowthState.syncRate は 0-100 の整数値
                console.log(`  シンクロ率  ${gr.syncRate}% (${gr.phase ?? '通常学習'})`)
            }
            if (em) {
                const dom = dominantEmotion(em)
                const emoji = emotionEmoji(dom.name)
                console.log(`  感情        ${emoji} ${dom.name} (${dom.value.toFixed(2)})`)
            }
            console.log()
        }

        // ── メモリ統計 ───────────────────────────────────
        const mem = settled(memStats)
        if (mem) {
            console.log(chalk.bold('💾 メモリ'))
            console.log(`  短期記憶    ${chalk.cyan(String(mem.shortTermCount ?? '-'))} 件`)
            console.log(`  長期記憶    ${chalk.cyan(String(mem.longTermCount ?? '-'))} 件`)
            if (mem.episodicCount != null) {
                console.log(`  エピソード  ${chalk.cyan(String(mem.episodicCount))} 件`)
            }
            console.log()
        }

        // ── サービス状態 ─────────────────────────────────
        if (h?.services) {
            console.log(chalk.bold('🔧 サービス'))
            for (const [name, status] of Object.entries(h.services)) {
                const icon = status === 'ok' ? chalk.green('✅') : chalk.red('✗')
                console.log(`  ${name.padEnd(10)} ${icon} ${status}`)
            }
            console.log()
        }

        printDivider()

    } catch (err) {
        spinner.fail('情報取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

function settled<T>(result: PromiseSettledResult<T>): T | null {
    return result.status === 'fulfilled' ? result.value : null
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
