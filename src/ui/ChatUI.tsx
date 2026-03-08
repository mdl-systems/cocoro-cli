// ============================================================
// ui/ChatUI.tsx — インタラクティブチャット画面（ink）
// commands/chat.tsx からコンポーネントを分離
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { emotionEmoji, dominantEmotion } from '../lib/format.js'
import { EmotionBar } from './EmotionBar.js'
import type { CocoroClient, EmotionState } from '@mdl-systems/cocoro-sdk'

// ────────────────────────────────────────────────────────────

interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    streaming?: boolean
}

interface EmotionInfo {
    state: EmotionState | null
    syncRate: number
}

// ────────────────────────────────────────────────────────────

interface ChatUIProps {
    client: CocoroClient
    sessionId: string
}

export const ChatUI: React.FC<ChatUIProps> = ({ client, sessionId }) => {
    const { exit } = useApp()
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [emotionInfo, setEmotionInfo] = useState<EmotionInfo>({ state: null, syncRate: 0 })
    const [msgCounter, setMsgCounter] = useState(0)

    // 初期感情状態を取得
    useEffect(() => {
        void (async () => {
            try {
                const [em, growth] = await Promise.allSettled([
                    client.emotion.getState(),
                    client.personality.getGrowth(),
                ])
                setEmotionInfo({
                    state: em.status === 'fulfilled' ? em.value : null,
                    syncRate: growth.status === 'fulfilled' ? growth.value.syncRate : 0,
                })
            } catch { /* 無視 */ }
        })()
    }, [client])

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMsgId = msgCounter
        const assistantMsgId = msgCounter + 1
        setMsgCounter(c => c + 2)

        setMessages(prev => [
            ...prev,
            { id: userMsgId, role: 'user', content: text.trim() },
            { id: assistantMsgId, role: 'assistant', content: '', streaming: true },
        ])
        setInputText('')
        setIsLoading(true)

        try {
            const stream = await client.chat.stream({ message: text.trim(), sessionId })

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
                setEmotionInfo(prev => ({
                    ...prev,
                    state: meta.emotion as EmotionState,
                }))
            }

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
        if (key.ctrl && char === 'c') { exit(); return }
        if (key.return) { void sendMessage(inputText); return }
        if (key.backspace || key.delete) { setInputText(prev => prev.slice(0, -1)); return }
        if (!key.ctrl && !key.meta && char) { setInputText(prev => prev + char) }
    })

    const { state: emState, syncRate } = emotionInfo
    const dominantName = emState ? dominantEmotion(emState).name : 'neutral'
    const emoji = emotionEmoji(dominantName)
    const visibleMessages = messages.slice(-12)

    return (
        <Box flexDirection="column" paddingX={1}>
            {/* ── ヘッダー ── */}
            <Box borderStyle="round" borderColor="magentaBright" paddingX={2} marginBottom={1}>
                <Text bold color="magentaBright">🌸 Cocoro — ローカルAI   </Text>
                {emState ? (
                    <EmotionBar emotion={emState} compact={true} />
                ) : (
                    <Text color="yellow">{emoji} {dominantName}</Text>
                )}
                {syncRate > 0 && (
                    <Text color="cyan">  シンクロ率: {syncRate}%</Text>
                )}
            </Box>

            {/* ── メッセージ履歴 ── */}
            <Box flexDirection="column" minHeight={12}>
                {visibleMessages.length === 0 && (
                    <Text color="gray" dimColor>  こんにちは！何でも聞いてください。(Ctrl+C で終了)</Text>
                )}
                {visibleMessages.map((msg) => (
                    <Box key={msg.id} flexDirection="column" marginBottom={1}>
                        <Box>
                            <Text color={msg.role === 'user' ? 'cyan' : 'magentaBright'} bold>
                                {msg.role === 'user' ? 'You     : ' : 'Cocoro  : '}
                            </Text>
                            <Box flexShrink={1}>
                                <Text wrap="wrap">
                                    {msg.content}
                                    {msg.streaming ? <Text color="magentaBright">▊</Text> : null}
                                </Text>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* ── 入力欄 ── */}
            <Box borderStyle="single" borderColor={isLoading ? 'gray' : 'cyan'} paddingX={1}>
                <Text color="cyan" bold>{'You: '}</Text>
                <Text>{inputText}</Text>
                {!isLoading && <Text color="magentaBright">█</Text>}
                {isLoading && <Text color="gray" dimColor> 応答中...</Text>}
            </Box>

            <Text color="gray" dimColor>  Enter: 送信  Ctrl+C: 終了</Text>
        </Box>
    )
}
