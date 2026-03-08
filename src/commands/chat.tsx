// ============================================================
// commands/chat.tsx — インタラクティブチャットコマンド
// ============================================================
//
// ink (React for CLI) を使ったフルインタラクティブUI。
// SSEストリーミング表示 + 感情状態リアルタイム更新。
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { render, Box, Text, useInput, useApp } from 'ink'
import chalk from 'chalk'
import { createClient } from '../lib/client.js'
import { emotionEmoji, dominantEmotion } from '../lib/format.js'
import type { CocoroClient, EmotionState } from '@mdl-systems/cocoro-sdk'

// ────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────

interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    streaming?: boolean
}

interface EmotionInfo {
    name: string
    value: number
    syncRate: number
}

// ────────────────────────────────────────────────────────────
// ChatUI コンポーネント（ink）
// ────────────────────────────────────────────────────────────

interface ChatUIProps {
    client: CocoroClient
    sessionId: string
}

const ChatUI: React.FC<ChatUIProps> = ({ client, sessionId }) => {
    const { exit } = useApp()
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [emotion, setEmotion] = useState<EmotionInfo>({ name: 'neutral', value: 0, syncRate: 0 })
    const [msgCounter, setMsgCounter] = useState(0)

    // 初期感情状態を取得
    useEffect(() => {
        void (async () => {
            try {
                const [em, growth] = await Promise.allSettled([
                    client.emotion.getState(),
                    client.personality.getGrowth(),
                ])
                if (em.status === 'fulfilled' && em.value) {
                    const dom = dominantEmotion(em.value)
                    const syncRate = growth.status === 'fulfilled' && growth.value
                        ? growth.value.syncRate  // 0-100
                        : 0
                    setEmotion({ name: dom.name, value: dom.value, syncRate })
                }
            } catch {
                // 無視
            }
        })()
    }, [client])

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMsgId = msgCounter
        const assistantMsgId = msgCounter + 1
        setMsgCounter(c => c + 2)

        const userMsg: Message = { id: userMsgId, role: 'user', content: text.trim() }
        setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: '', streaming: true }])
        setInputText('')
        setIsLoading(true)

        try {
            const stream = await client.chat.stream({
                message: text.trim(),
                sessionId,
            })

            let fullText = ''
            for await (const chunk of stream) {
                fullText += chunk.text
                const captured = fullText
                setMessages(prev =>
                    prev.map(m => m.id === assistantMsgId ? { ...m, content: captured } : m)
                )
            }

            // 感情状態更新
            const meta = await stream.final()
            if (meta?.emotion) {
                const emState = meta.emotion as EmotionState
                const dom = dominantEmotion(emState)
                setEmotion(prev => ({ ...prev, name: dom.name, value: dom.value }))
            }

            // streaming フラグを解除
            setMessages(prev =>
                prev.map(m => m.id === assistantMsgId ? { ...m, streaming: false } : m)
            )
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            setMessages(prev =>
                prev.map(m => m.id === assistantMsgId
                    ? { ...m, content: `[エラー: ${errMsg}]`, streaming: false }
                    : m
                )
            )
        } finally {
            setIsLoading(false)
        }
    }, [client, sessionId, msgCounter, isLoading])

    useInput((char, key) => {
        if (key.ctrl && char === 'c') {
            exit()
            return
        }
        if (key.return) {
            void sendMessage(inputText)
            return
        }
        if (key.backspace || key.delete) {
            setInputText(prev => prev.slice(0, -1))
            return
        }
        if (!key.ctrl && !key.meta && char) {
            setInputText(prev => prev + char)
        }
    })

    const emoji = emotionEmoji(emotion.name)
    // 最後の10件のみ表示
    const visibleMessages = messages.slice(-10)

    return (
        <Box flexDirection="column" paddingX={1}>
            {/* ヘッダー */}
            <Box borderStyle="round" borderColor="magentaBright" paddingX={2} marginBottom={1}>
                <Text bold color="magentaBright">🌸 Cocoro — ローカルAI   </Text>
                <Text color="yellow">{emoji} {emotion.name}</Text>
                {emotion.syncRate > 0 && (
                    <Text color="cyan">  シンクロ率: {emotion.syncRate}%</Text>
                )}
            </Box>

            {/* メッセージ履歴 */}
            <Box flexDirection="column" minHeight={10}>
                {visibleMessages.length === 0 && (
                    <Text color="gray" dimColor>  こんにちは！何でも聞いてください。</Text>
                )}
                {visibleMessages.map((msg) => (
                    <Box key={msg.id} flexDirection="row" marginBottom={1}>
                        <Text color={msg.role === 'user' ? 'cyan' : 'magentaBright'} bold>
                            {msg.role === 'user' ? 'You: ' : 'Cocoro: '}
                        </Text>
                        <Box flexDirection="column" flexShrink={1}>
                            <Text wrap="wrap">
                                {msg.content}
                                {msg.streaming ? <Text color="magentaBright">▊</Text> : null}
                            </Text>
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* 入力欄 */}
            <Box borderStyle="single" borderColor="gray" paddingX={1}>
                <Text color="cyan" bold>You: </Text>
                <Text>{inputText}</Text>
                <Text color="magentaBright">█</Text>
            </Box>
            <Text color="gray" dimColor>  Ctrl+C で終了</Text>
        </Box>
    )
}

// ────────────────────────────────────────────────────────────
// chatCommand エントリ
// ────────────────────────────────────────────────────────────

interface ChatOptions {
    sessionId?: string
}

export async function chatCommand(opts: ChatOptions): Promise<void> {
    const client = await createClient()
    const sessionId = opts.sessionId ?? `cli-${Date.now()}`

    // ink でレンダリング
    const { waitUntilExit } = render(
        React.createElement(ChatUI, { client, sessionId }),
    )

    await waitUntilExit()
    console.log(chalk.dim('\n  チャットを終了しました'))
}
