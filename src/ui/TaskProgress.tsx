// ============================================================
// ui/TaskProgress.tsx — タスク進捗表示コンポーネント（ink）
// SSEストリーミングで TaskProgressEvent を受信してリアルタイム表示
// ============================================================

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import type { Task, TaskProgressEvent, TaskResult, EmotionSnapshot } from '@mdl-systems/cocoro-sdk'
import { EmotionBar } from './EmotionBar.js'
import type { EmotionState } from '@mdl-systems/cocoro-sdk'

interface StepEntry {
    id: number
    text: string
    tool?: string
    status: 'running' | 'done' | 'error'
    progress: number
}

interface TaskProgressProps {
    task: Task
    stream: AsyncGenerator<TaskProgressEvent>
    onComplete: (result: TaskResult | null, error: string | null) => void
}

function ProgressBar({ ratio, width = 30 }: { ratio: number; width?: number }) {
    const filled = Math.round(Math.min(ratio, 1) * width)
    const empty = width - filled
    return (
        <Box>
            <Text color="magentaBright">{'█'.repeat(filled)}</Text>
            <Text dimColor>{'░'.repeat(empty)}</Text>
        </Box>
    )
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export const TaskProgress: React.FC<TaskProgressProps> = ({ task, stream, onComplete }) => {
    const { exit } = useApp()
    const [steps, setSteps] = useState<StepEntry[]>([])
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running')
    const [spinIdx, setSpinIdx] = useState(0)
    const [elapsedSec, setElapsedSec] = useState(0)
    const [emotion, setEmotion] = useState<EmotionSnapshot | null>(task.emotion)
    const [result, setResult] = useState<string | null>(null)
    const [stepCount, setStepCount] = useState(0)

    // スピナー & タイマー
    useEffect(() => {
        const id = setInterval(() => {
            setSpinIdx(i => (i + 1) % SPINNER_FRAMES.length)
            setElapsedSec(s => s + 1)
        }, 100)
        return () => clearInterval(id)
    }, [])

    // SSEストリームを消費
    useEffect(() => {
        void (async () => {
            try {
                for await (const event of stream) {
                    switch (event.event) {
                        case 'progress': {
                            const pct = event.data.progress ?? 0
                            setProgress(pct)
                            if (event.data.step) {
                                setStepCount(c => c + 1)
                                setSteps(prev => {
                                    const updated = prev.map(s =>
                                        s.status === 'running' ? { ...s, status: 'done' as const } : s
                                    )
                                    return [...updated, {
                                        id: Date.now(),
                                        text: event.data.step!,
                                        status: 'running',
                                        progress: pct,
                                    }]
                                })
                            }
                            break
                        }
                        case 'tool_use': {
                            if (event.data.tool) {
                                setSteps(prev => [...prev, {
                                    id: Date.now(),
                                    text: event.data.query
                                        ? `${event.data.tool}: ${event.data.query}`
                                        : event.data.tool!,
                                    tool: event.data.tool,
                                    status: 'running',
                                    progress,
                                }])
                            }
                            break
                        }
                        case 'completed': {
                            setStatus('completed')
                            setProgress(1)
                            if (event.data.result) {
                                const r = event.data.result
                                setResult(typeof r === 'string' ? r : JSON.stringify(r, null, 2))
                            }
                            setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))
                            onComplete(event.data.result as TaskResult | null, null)
                            break
                        }
                        case 'failed': {
                            setStatus('failed')
                            setSteps(prev => prev.map(s =>
                                s.status === 'running' ? { ...s, status: 'error' as const } : s
                            ))
                            onComplete(null, event.data.error ?? '不明なエラー')
                            break
                        }
                    }
                }
            } catch (err) {
                setStatus('failed')
                onComplete(null, err instanceof Error ? err.message : String(err))
            }
        })()
    }, [stream, onComplete])

    const spin = SPINNER_FRAMES[spinIdx]
    const pctStr = `${Math.round(progress * 100)}%`.padStart(4)
    const timeStr = `${elapsedSec}s`

    // 最新8ステップのみ表示
    const visibleSteps = steps.slice(-8)

    return (
        <Box flexDirection="column" paddingX={1}>
            {/* ヘッダー */}
            <Box borderStyle="round" borderColor="magentaBright" paddingX={2} marginBottom={1}>
                <Text bold color="magentaBright">🤖 タスク実行中  </Text>
                <Text dimColor>{task.task_id.slice(0, 12)}...</Text>
            </Box>

            {/* タスク説明 */}
            <Box marginBottom={1} paddingLeft={1}>
                <Text color="cyan" bold>目標: </Text>
                <Text wrap="wrap">{task.title}</Text>
            </Box>

            {/* 進捗バー */}
            <Box marginBottom={1} paddingLeft={1}>
                <Box marginRight={1}>
                    {status === 'running' ? (
                        <Text color="magentaBright">{spin} </Text>
                    ) : status === 'completed' ? (
                        <Text color="green">✅</Text>
                    ) : (
                        <Text color="red">✗ </Text>
                    )}
                </Box>
                <ProgressBar ratio={progress} width={28} />
                <Text color="magentaBright" bold> {pctStr}</Text>
                <Text dimColor>  {timeStr}</Text>
            </Box>

            {/* ステップログ */}
            <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
                {visibleSteps.map((step) => {
                    const icon = step.status === 'done'
                        ? <Text color="green">├─ ✓ </Text>
                        : step.status === 'error'
                            ? <Text color="red">├─ ✗ </Text>
                            : <Text color="yellow">└─ {spin} </Text>
                    const toolBadge = step.tool ? (
                        <Text dimColor> [{step.tool}]</Text>
                    ) : null

                    return (
                        <Box key={step.id}>
                            {icon}
                            <Text
                                dimColor={step.status === 'done'}
                                color={step.status === 'running' ? 'white' : undefined}
                                wrap="truncate-end"
                            >
                                {step.text}
                            </Text>
                            {toolBadge}
                        </Box>
                    )
                })}
            </Box>

            {/* 感情状態 */}
            {emotion && (
                <Box paddingLeft={1} marginBottom={1}>
                    <Text dimColor>感情: </Text>
                    <EmotionBar
                        emotion={{
                            happiness: emotion.happiness,
                            sadness: 0,
                            anger: 0,
                            fear: 0,
                            trust: emotion.trust ?? 0,
                            surprise: 0,
                            dominant: emotion.dominant,
                        }}
                        compact={true}
                    />
                    <Text dimColor>  (anticipation: {((emotion.anticipation ?? 0) * 100).toFixed(0)}%)</Text>
                </Box>
            )}

            {/* 完了メッセージ */}
            {status === 'completed' && result && (
                <Box flexDirection="column" paddingLeft={1} marginTop={1}>
                    <Text bold color="green">📋 結果:</Text>
                    <Box paddingLeft={2} borderStyle="single" borderColor="green" marginTop={1}>
                        <Text wrap="wrap">{result}</Text>
                    </Box>
                </Box>
            )}

            {status === 'failed' && (
                <Box paddingLeft={1} marginTop={1}>
                    <Text color="red">✗ タスクが失敗しました</Text>
                </Box>
            )}

            <Box marginTop={1}>
                <Text dimColor>  Ctrl+C でバックグラウンド実行に切り替え</Text>
            </Box>
        </Box>
    )
}
