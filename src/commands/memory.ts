// ============================================================
// commands/memory.ts — メモリ操作コマンド
// ============================================================

import { confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider, success } from '../lib/format.js'

// ────────────────────────────────────────────────────────────
// memory list
// ────────────────────────────────────────────────────────────

interface MemoryListOptions {
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
                // IDをdeleteコマンド用に表示
                console.log(chalk.dim(`  [${ts}] ID: ${chalk.cyan(entry.id)}`))
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

// ────────────────────────────────────────────────────────────
// memory search
// ────────────────────────────────────────────────────────────

interface MemorySearchOptions {
    limit?: number
    json?: boolean
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
                // IDをdeleteコマンド用に表示
                console.log(`  ${chalk.cyan(`${i + 1}.`)} ${chalk.dim(`ID: ${r.id}`)}`)
                console.log(`     ${r.content}${score} ${typeLabel}`)
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

// ────────────────────────────────────────────────────────────
// memory stats
// ────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────
// memory delete — エントリ1件削除
// ────────────────────────────────────────────────────────────

interface MemoryDeleteOptions {
    force?: boolean
    json?: boolean
}

export async function memoryDeleteCommand(entryId: string, opts: MemoryDeleteOptions): Promise<void> {
    if (!opts.force) {
        console.log()
        console.log(chalk.yellow(`  ⚠  エントリを削除します`))
        console.log(chalk.dim(`     ID: ${entryId}`))
        console.log()

        const ok = await confirm({
            message: '削除してよいですか？',
            default: false,
        })
        if (!ok) {
            console.log(chalk.dim('  キャンセルしました'))
            return
        }
    }

    const client = await createClient()
    const spinner = ora({ text: '削除中...', color: 'red' }).start()

    try {
        const result = await client.memory.deleteEntry(entryId)
        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(result, null, 2))
            return
        }

        success(`エントリを削除しました (${result.deleted} 件)`)
        if (result.message) {
            console.log(chalk.dim(`  ${result.message}`))
        }
    } catch (err) {
        spinner.fail('削除に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}

// ────────────────────────────────────────────────────────────
// memory clear — 一括削除
// ────────────────────────────────────────────────────────────

interface MemoryClearOptions {
    /** 全メモリ（短期+長期+エピソード）を削除する */
    all?: boolean
    /** 確認プロンプトをスキップ */
    force?: boolean
    json?: boolean
}

export async function memoryClearCommand(opts: MemoryClearOptions): Promise<void> {
    const target = opts.all
        ? '全メモリ（短期 + 長期 + エピソード）'
        : '短期記憶（会話履歴）'

    if (!opts.force) {
        console.log()
        console.log(chalk.red(`  ⚠  ${target}を全て削除します`))
        console.log(chalk.dim('     この操作は元に戻せません'))
        console.log()

        const ok1 = await confirm({
            message: `${target}を削除してよいですか？`,
            default: false,
        })
        if (!ok1) {
            console.log(chalk.dim('  キャンセルしました'))
            return
        }

        // --all の場合はさらに二重確認
        if (opts.all) {
            const ok2 = await confirm({
                message: chalk.red('本当に全てのメモリを削除しますか？（元に戻せません）'),
                default: false,
            })
            if (!ok2) {
                console.log(chalk.dim('  キャンセルしました'))
                return
            }
        }
    }

    const client = await createClient()
    const spinner = ora({
        text: `${target}を削除中...`,
        color: 'red',
    }).start()

    try {
        const result = opts.all
            ? await client.memory.clearAll()
            : await client.memory.clearShortTerm()

        spinner.stop()

        if (opts.json) {
            console.log(JSON.stringify(result, null, 2))
            return
        }

        success(`${target}を削除しました (${result.deleted} 件)`)
        if (result.message) {
            console.log(chalk.dim(`  ${result.message}`))
        }

        // 削除後の統計を表示
        const stats = await client.memory.getStats().catch(() => null)
        if (stats) {
            console.log()
            console.log(chalk.dim(
                `  残: 短期 ${stats.shortTermCount} 件  長期 ${stats.longTermCount} 件  エピソード ${stats.episodicCount} 件`
            ))
        }
    } catch (err) {
        spinner.fail('削除に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}
