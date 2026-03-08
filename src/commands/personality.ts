// ============================================================
// commands/personality.ts — 人格情報表示コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import {
    printHeader,
    printDivider,
    progressBar,
    emotionEmoji,
    dominantEmotion,
    emotionEntries,
} from '../lib/format.js'

interface PersonalityOptions {
    json?: boolean
}

export async function personalityCommand(opts: PersonalityOptions): Promise<void> {
    const client = await createClient()
    const spinner = ora({ text: '人格情報を取得中...', color: 'magenta' }).start()

    try {
        const [personality, growth] = await Promise.allSettled([
            client.personality.get(),
            client.personality.getGrowth(),
        ])

        spinner.stop()

        const p = personality.status === 'fulfilled' ? personality.value : null
        const g = growth.status === 'fulfilled' ? growth.value : null

        if (opts.json) {
            console.log(JSON.stringify({ personality: p, growth: g }, null, 2))
            return
        }

        printHeader('Cocoro の人格')

        // 基本情報（Personality.identity 配下）
        if (p) {
            console.log(`  ${chalk.bold('名前')}    ${chalk.cyan(p.identity.name ?? 'Cocoro')}`)
            console.log(`  ${chalk.bold('役割')}    ${p.identity.role ?? 'パーソナルAI'}`)
            if (p.identity.traits && p.identity.traits.length > 0) {
                console.log(`  ${chalk.bold('性格')}    [${p.identity.traits.join(', ')}]`)
            }
            console.log()
        }

        // 成長・シンクロ率
        if (g) {
            console.log(chalk.bold('📈 成長状態'))
            // syncRate は 0-100
            const syncPct = g.syncRate
            const syncRatio = g.syncRate / 100
            const syncBar = progressBar(syncRatio, 1, 10)
            console.log(`  シンクロ率  ${syncBar} ${syncPct}% (${g.phase ?? '通常'})`)
            console.log(`  学習レート  ${(g.learningRate * 100).toFixed(1)}%`)
            console.log()
        }

        // 価値観ベクトル（ValueVector）
        if (p?.values) {
            console.log(chalk.bold('💎 価値観'))
            const valueLabels: Record<string, string> = {
                creativity: '創造性',
                empathy: '共感力',
                logic: '論理性',
                curiosity: '好奇心',
                stability: '安定性',
                openness: '開放性',
                conscientiousness: '誠実性',
                extraversion: '外向性',
            }
            for (const [key, val] of Object.entries(p.values)) {
                if (typeof val !== 'number') continue
                const label = (valueLabels[key] ?? key).padEnd(6)
                const bar = progressBar(val, 1, 10)
                console.log(`  ${label}  ${bar} ${val.toFixed(2)}`)
            }
            console.log()
        }

        // 感情状態（Personality.emotion）
        if (p?.emotion) {
            console.log(chalk.bold('😊 感情状態'))
            const dominated = dominantEmotion(p.emotion)
            for (const [key, val] of emotionEntries(p.emotion)) {
                const emoji = key === dominated.name ? emotionEmoji(key) : '  '
                const bar = progressBar(val, 1, 10)
                const label = key.padEnd(10)
                const bold = key === dominated.name ? chalk.bold : (s: string) => s
                console.log(`  ${emoji} ${bold(label)}  ${bar} ${val.toFixed(2)}`)
            }
            console.log()
        }

        // 信念・目標
        if (p?.beliefs && p.beliefs.length > 0) {
            console.log(chalk.bold(`🧠 信念 (${p.beliefs.length}件)`))
            for (const belief of p.beliefs.slice(0, 3)) {
                console.log(`  • ${belief.content} ${chalk.dim(`[${belief.category}]`)}`)
            }
            if (p.beliefs.length > 3) {
                console.log(chalk.dim(`  ... 他 ${p.beliefs.length - 3}件`))
            }
            console.log()
        }

        printDivider()

    } catch (err) {
        spinner.fail('取得に失敗しました')
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(msg))
        process.exit(1)
    }
}
