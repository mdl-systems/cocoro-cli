// ============================================================
// commands/ask.ts — ワンショット質問コマンド
// ============================================================

import ora from 'ora'
import chalk from 'chalk'
import { createClient } from '../lib/client.js'
import { emotionEmoji, dominantEmotion } from '../lib/format.js'

interface AskOptions {
    noStream?: boolean
    json?: boolean
    userId?: string
}

export async function askCommand(question: string, opts: AskOptions): Promise<void> {
    const client = await createClient()

    if (opts.json) {
        // JSON出力モード（スクリプト組み込み用）
        try {
            const res = await client.chat.send({
                message: question,
                sessionId: `cli-${Date.now()}`,
            })
            console.log(JSON.stringify(res, null, 2))
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.log(JSON.stringify({ error: msg }, null, 2))
            process.exit(1)
        }
        return
    }

    if (opts.noStream) {
        // ノンストリーミングモード（パイプ用）
        const spinner = ora({
            text: '考えています...',
            color: 'magenta',
        }).start()

        try {
            const res = await client.chat.send({
                message: question,
                sessionId: `cli-${Date.now()}`,
            })
            spinner.stop()
            console.log(res.text)
        } catch (err) {
            spinner.fail('エラーが発生しました')
            const msg = err instanceof Error ? err.message : String(err)
            console.error(chalk.red(msg))
            process.exit(1)
        }
        return
    }

    // ストリーミングモード（デフォルト）
    console.log()
    process.stdout.write(chalk.bold.magenta('Cocoro: '))

    try {
        const stream = await client.chat.stream({
            message: question,
            sessionId: `cli-${Date.now()}`,
        })

        for await (const chunk of stream) {
            process.stdout.write(chunk.text)
        }

        const meta = await stream.final()
        console.log('\n')

        // 感情状態をフッターに表示
        if (meta?.emotion) {
            const dom = dominantEmotion(meta.emotion)
            const emoji = emotionEmoji(dom.name)
            console.log(chalk.dim(`  ${emoji} ${dom.name} (${dom.value.toFixed(2)})`))
        }
    } catch (err) {
        console.log()
        const msg = err instanceof Error ? err.message : String(err)
        console.error(chalk.red(`✗ エラー: ${msg}`))
        process.exit(1)
    }
}
