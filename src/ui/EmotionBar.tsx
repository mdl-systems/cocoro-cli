// ============================================================
// ui/EmotionBar.tsx — 感情状態バー表示コンポーネント
// ============================================================

import React from 'react'
import { Box, Text } from 'ink'
import type { EmotionState } from '@mdl-systems/cocoro-sdk'
import { emotionEmoji, progressBar } from '../lib/format.js'

interface EmotionBarProps {
    emotion: EmotionState
    /**  コンパクト表示（1行）かフル表示か */
    compact?: boolean
}

const EMOTION_LABELS: Record<string, string> = {
    happiness: 'happiness',
    trust: 'trust',
    fear: 'fear',
    surprise: 'surprise',
    sadness: 'sadness',
    anger: 'anger',
}

export const EmotionBar: React.FC<EmotionBarProps> = ({ emotion, compact = false }) => {
    if (compact) {
        // コンパクト: "😊 happiness 0.72" を1行で
        const dom = emotion.dominant ?? 'neutral'
        const val = emotion[dom as keyof EmotionState] as number ?? 0
        const emoji = emotionEmoji(dom)
        return (
            <Box>
                <Text color="yellow">{emoji} </Text>
                <Text color="yellow" bold>{dom}</Text>
                <Text dimColor> ({val.toFixed(2)})</Text>
            </Box>
        )
    }

    // フル表示: 各感情のバーを縦並び
    const entries: [string, number][] = Object.entries(EMOTION_LABELS).map(([key]) => {
        const val = emotion[key as keyof EmotionState]
        return [key, typeof val === 'number' ? val : 0]
    })

    return (
        <Box flexDirection="column">
            {entries.map(([name, val]) => {
                const isDominant = name === emotion.dominant
                const emoji = emotionEmoji(name)
                const bar = progressBar(val, 1, 10)
                return (
                    <Box key={name}>
                        <Text>{isDominant ? emoji : '  '} </Text>
                        <Text bold={isDominant} color={isDominant ? 'yellow' : undefined}>
                            {name.padEnd(12)}
                        </Text>
                        <Text>{bar} </Text>
                        <Text dimColor>{val.toFixed(2)}</Text>
                    </Box>
                )
            })}
        </Box>
    )
}
