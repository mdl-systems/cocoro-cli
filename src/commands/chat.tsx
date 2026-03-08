// ============================================================
// commands/chat.tsx — インタラクティブチャットコマンド
// ChatUI コンポーネントを使用
// ============================================================

import React from 'react'
import { render } from 'ink'
import chalk from 'chalk'
import { createClient } from '../lib/client.js'
import { ChatUI } from '../ui/ChatUI.js'

interface ChatOptions {
    sessionId?: string
}

export async function chatCommand(opts: ChatOptions): Promise<void> {
    const client = await createClient()
    const sessionId = opts.sessionId ?? `cli-${Date.now()}`

    const { waitUntilExit } = render(
        React.createElement(ChatUI, { client, sessionId }),
    )

    await waitUntilExit()
    console.log(chalk.dim('\n  チャットを終了しました'))
}
