// ============================================================
// commands/memory.ts — メモリ操作コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider } from '../lib/format.js'

interface MemoryListOptions {
    limit?: number
    json?: boolean
}

interface MemorySearchOptions {
    limit?: number
    json?: boolean
}

export async function memoryListCommand(opts: MemoryListOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: '記憶を取得中...', color: 'magenta' }).start()

    try {
        const entries = await client.memory.getShortTerm({ limit: opts.limit ?? 10 })
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(entries, null, 2))
            return
        }

        printHeader('最近の記憶', `${entries.length} 件`)

        if (entries.length === 0) {
            console.log(chalk.dim('  記憶がありません'))
        } else {
            for (const entry of entries) {
                const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleString('ja-JP') : ''
                console.log(chalk.dim(`  [${ts}]`))
                console.log(`  ${chalk.bold(entry.role)}: ${entry.content}`)
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

export async function memorySearchCommand(query: string, opts: MemorySearchOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: `"${query}" を検索中...`, color: 'magenta' }).start()

    try {
        const results = await client.memory.search({ query, limit: opts.limit ?? 10 })
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(results, null, 2))
            return
        }

        printHeader(`メモリ検索: "${query}"`, `${results.length} 件`)

        if (results.length === 0) {
            console.log(chalk.dim('  一致する記憶が見つかりません'))
        } else {
            for (let i = 0; i < results.length; i++) {
                const r = results[i]
                const score = chalk.yellow(` [${(r.score * 100).toFixed(0)}%]`)
                const typeLabel = chalk.dim(`[${r.type}]`)
                console.log(`  ${chalk.cyan(`${i + 1}.`)} ${r.content}${score} ${typeLabel}`)
                console.log()
            }
        }

        printDivider()
    } catch (err) {
        spinner.fail('検索に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

export async function memoryStatsCommand(opts: { json?: boolean }): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: 'メモリ統計を取得中...', color: 'magenta' }).start()

    try {
        const stats = await client.memory.getStats()
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(stats, null, 2))
            return
        }

        printHeader('メモリ統計')
        console.log(`  ${chalk.bold('短期記憶')}    ${chalk.cyan(String(stats.shortTermCount))} 件`)
        console.log(`  ${chalk.bold('長期記憶')}    ${chalk.cyan(String(stats.longTermCount))} 件`)
        console.log(`  ${chalk.bold('エピソード')}  ${chalk.cyan(String(stats.episodicCount))} 件`)
        console.log(`  ${chalk.bold('総トークン')}  ${chalk.cyan(stats.totalTokens.toLocaleString())}`)
        if (stats.lastConsolidated) {
            const ts = new Date(stats.lastConsolidated).toLocaleString('ja-JP')
            console.log(`  ${chalk.bold('最終統合')}    ${chalk.dim(ts)}`)
        }
        printDivider()
    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}
