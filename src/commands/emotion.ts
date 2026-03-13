// ============================================================
// commands/emotion.ts — 感情状態表示コマンド
// ============================================================

import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { printHeader, printDivider, emotionEmoji, progressBar } from '../lib/format.js'

interface EmotionOptions {
    json?: boolean
    watch?: boolean
}

const EMOTION_LABELS: Record<string, string> = {
    happiness: '😊 喜び',
    sadness: '😢 悲しみ',
    anger: '😠 怒り',
    fear: '😨 恐れ',
    trust: '🤝 信頼',
    surprise: '😮 驚き',
}

export async function emotionCommand(opts: EmotionOptions): Promise<void> {
    const client = await createClient()

    const doFetch = async () => {
        const spinner = ora({ text: '感情状態を取得中...', color: 'magenta' }).start()
        try {
            const emotion = await client.emotion.getState()
            spinner.stop()

            if (opts.json) {
                console.log(JSON.stringify(emotion, null, 2))
                return
            }

            printHeader('😊 感情状態')

            // dominant 感情
            const dom = emotion.dominant
            const emoji = emotionEmoji(dom)
            console.log(`  ${chalk.bold('優勢感情')}  ${emoji} ${chalk.magenta(dom)}`)
            console.log()

            // 全感情バー
            const fields = ['happiness', 'sadness', 'anger', 'fear', 'trust', 'surprise'] as const
            for (const key of fields) {
                const val = emotion[key]
                const label = (EMOTION_LABELS[key] ?? key).padEnd(12)
                const bar = progressBar(val, 1, 20)
                const pct = `${Math.round(val * 100)}%`.padStart(4)
                console.log(`  ${chalk.dim(label)}  ${bar} ${chalk.cyan(pct)}`)
            }

            printDivider()
        } catch (err) {
            spinner.fail('感情状態の取得に失敗しました')
            const msg = err instanceof Error ? err.message : String(err)
            console.error(chalk.red(msg))
            if (!opts.watch) process.exit(1)
        }
    }

    if (opts.watch) {
        console.log(chalk.dim('  感情状態を監視中... (Ctrl+C で終了)'))
        await doFetch()
        const timer = setInterval(async () => {
            process.stdout.write('\x1b[2J\x1b[H') // 画面クリア
            await doFetch()
        }, 3000)
        process.on('SIGINT', () => {
            clearInterval(timer)
            console.log(chalk.dim('\n  監視を終了しました'))
            process.exit(0)
        })
        await new Promise(() => { }) // 終了まで待機
    } else {
        await doFetch()
    }
}
