// ============================================================
// ui/StatusPanel.tsx — ノード状態パネル（ink)
// ============================================================

import React from 'react'
import { Box, Text } from 'ink'
import type { HealthStatus, NodeDashboard } from '@mdl-systems/cocoro-sdk'
import type { EmotionState, GrowthState, MemoryStats, OrgStatus } from '@mdl-systems/cocoro-sdk'
import { EmotionBar } from './EmotionBar.js'
import { formatUptime, cpuBar, emotionEmoji } from '../lib/format.js'

interface StatusPanelProps {
    health: HealthStatus | null
    dashboard: NodeDashboard | null
    emotion: EmotionState | null
    growth: GrowthState | null
    memory: MemoryStats | null
    orgStatus: OrgStatus | null
}

// ────────────────────────────────────────────────────────────
// 感情の日本語ラベル
// ────────────────────────────────────────────────────────────

function emotionLabel(dominant: string): string {
    const map: Record<string, string> = {
        happiness: '喜び・楽しさ',
        joy:       '喜び',
        trust:     '信頼・安心',
        fear:      '恐れ・不安',
        surprise:  '驚き・好奇心',
        sadness:   '悲しみ',
        disgust:   '嫌悪',
        anger:     '怒り',
        anticipation: '期待・興奮',
        neutral:   '穏やか',
    }
    return map[dominant] ?? dominant
}

// ────────────────────────────────────────────────────────────
// コンパクトサマリーボックス（要求仕様に合わせた表示）
// ────────────────────────────────────────────────────────────

function SummaryBox({
    health, orgStatus, growth, emotion, memory,
}: Pick<StatusPanelProps, 'health' | 'orgStatus' | 'growth' | 'emotion' | 'memory'>) {
    const coreUp   = health?.status === 'ok'
    const agentUp  = orgStatus !== null  // agentが取れていれば稼働中と判断
    const syncRate = growth?.syncRate ?? null
    const dominant = emotion?.dominant ?? null
    const totalMem = memory
        ? (memory.shortTermCount ?? 0) + (memory.longTermCount ?? 0) + (memory.episodicCount ?? 0)
        : null

    const ROW_WIDTH = 33

    const Row = ({ icon, label, value, color }: {
        icon: string
        label: string
        value: string
        color?: string
    }) => {
        const left  = `${icon} ${label}`
        const right = value
        const pad   = ROW_WIDTH - left.length - right.length
        const spacer = ' '.repeat(Math.max(1, pad))
        return (
            <Box>
                <Text dimColor>│ </Text>
                <Text>{left}</Text>
                <Text>{spacer}</Text>
                <Text color={color as 'green' | 'yellow' | 'red' | 'cyan' | 'magentaBright' | undefined} bold={!!color}>
                    {right}
                </Text>
                <Text dimColor> │</Text>
            </Box>
        )
    }

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>{'┌' + '─'.repeat(ROW_WIDTH + 2) + '┐'}</Text>
            <Box>
                <Text dimColor>│ </Text>
                <Text bold color="magentaBright">{'🌸 cocoro-OS ステータス'}</Text>
                <Text dimColor>{' '.repeat(Math.max(0, ROW_WIDTH - 12))}</Text>
                <Text dimColor> │</Text>
            </Box>
            <Text dimColor>{'├' + '─'.repeat(ROW_WIDTH + 2) + '┤'}</Text>

            <Row
                icon={coreUp ? '✅' : '✗'}
                label="cocoro-core"
                value={coreUp ? '稼働中' : 'オフライン'}
                color={coreUp ? 'green' : 'red'}
            />
            <Row
                icon={agentUp ? '✅' : '⚠'}
                label="cocoro-agent"
                value={agentUp ? '稼働中' : '不明'}
                color={agentUp ? 'green' : 'yellow'}
            />
            {syncRate !== null && (
                <Row
                    icon="⚡"
                    label="シンクロ率"
                    value={`${syncRate}%`}
                    color={syncRate >= 70 ? 'cyan' : syncRate >= 40 ? 'yellow' : 'red'}
                />
            )}
            {dominant && (
                <Row
                    icon={emotionEmoji(dominant)}
                    label="感情状態"
                    value={emotionLabel(dominant)}
                    color="magentaBright"
                />
            )}
            {totalMem !== null && (
                <Row
                    icon="🧠"
                    label="記憶数"
                    value={`${totalMem}件`}
                    color="cyan"
                />
            )}

            <Text dimColor>{'└' + '─'.repeat(ROW_WIDTH + 2) + '┘'}</Text>
        </Box>
    )
}

// ────────────────────────────────────────────────────────────
// CPU バー行
// ────────────────────────────────────────────────────────────

function CpuRow({ label, percent }: { label: string; percent: number }) {
    const bar = cpuBar(percent, 12)
    const color = percent > 80 ? 'red' : percent > 50 ? 'yellow' : 'green'
    return (
        <Box>
            <Text dimColor>{label.padEnd(10)}</Text>
            <Text color={color as 'red' | 'yellow' | 'green'}>{percent.toString().padStart(3)}%  </Text>
            <Text>│{bar}│</Text>
        </Box>
    )
}

// ────────────────────────────────────────────────────────────
// メインパネル
// ────────────────────────────────────────────────────────────

export const StatusPanel: React.FC<StatusPanelProps> = ({
    health, dashboard, emotion, growth, memory, orgStatus,
}) => {
    return (
        <Box flexDirection="column" paddingX={1}>
            {/* ── コンパクトサマリー ── */}
            <SummaryBox
                health={health}
                orgStatus={orgStatus}
                growth={growth}
                emotion={emotion}
                memory={memory}
            />

            {/* ── ヘルス詳細 ── */}
            {health && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">📡 ヘルス詳細</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        <Box>
                            <Text dimColor>{'稼働時間'.padEnd(8)}</Text>
                            <Text>{formatUptime(health.uptime)}</Text>
                        </Box>
                        <Box>
                            <Text dimColor>{'LLM'.padEnd(8)}</Text>
                            <Text color={health.services.llm === 'ok' ? 'green' : 'red'}>
                                {health.services.llm === 'ok' ? '✅ ok' : '✗ error'}
                            </Text>
                            <Text dimColor>{'  DB'.padEnd(8)}</Text>
                            <Text color={health.services.database === 'ok' ? 'green' : 'red'}>
                                {health.services.database === 'ok' ? '✅ ok' : '✗ error'}
                            </Text>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* ── リソース ── */}
            {dashboard && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">📊 システムリソース</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        <CpuRow label="CPU" percent={Math.round(dashboard.cpu)} />
                        <CpuRow label="メモリ" percent={Math.round(dashboard.memory)} />
                        {dashboard.disk != null && (
                            <CpuRow label="ディスク" percent={Math.round(dashboard.disk)} />
                        )}
                        <Box>
                            <Text dimColor>{'接続数'.padEnd(10)}</Text>
                            <Text>{dashboard.activeConnections ?? '-'}</Text>
                            {dashboard.requestsPerMin != null && (
                                <Text dimColor>  {dashboard.requestsPerMin} req/min</Text>
                            )}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* ── 人格・感情 ── */}
            {(growth || emotion) && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">🧠 人格状態</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        {growth && (
                            <Box>
                                <Text dimColor>{'シンクロ率'.padEnd(10)}</Text>
                                <Text color="magentaBright" bold>{growth.syncRate}%</Text>
                                <Text dimColor>  ({growth.phase})</Text>
                            </Box>
                        )}
                        {emotion && (
                            <Box>
                                <Text dimColor>{'感情'.padEnd(10)}</Text>
                                <EmotionBar emotion={emotion} compact={true} />
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {/* ── メモリ ── */}
            {memory && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">💾 メモリ</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        <Box>
                            <Text dimColor>{'短期'.padEnd(8)}</Text>
                            <Text color="magentaBright">{memory.shortTermCount}</Text>
                            <Text dimColor> 件  長期 </Text>
                            <Text color="magentaBright">{memory.longTermCount}</Text>
                            <Text dimColor> 件  エピソード </Text>
                            <Text color="magentaBright">{memory.episodicCount}</Text>
                            <Text dimColor> 件</Text>
                        </Box>
                        <Box>
                            <Text dimColor>{'総トークン'.padEnd(8)}</Text>
                            <Text>{memory.totalTokens.toLocaleString()}</Text>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* ── エージェント組織 ── */}
            {orgStatus && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">🤖 エージェント組織</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        <Box>
                            <Text dimColor>{'キュー'.padEnd(8)}</Text>
                            <Text color="blue">{orgStatus.totalTasks.queued}</Text>
                            <Text dimColor> 件  実行中 </Text>
                            <Text color="yellow">{orgStatus.totalTasks.running}</Text>
                            <Text dimColor> 件  完了 </Text>
                            <Text color="green">{orgStatus.totalTasks.completed}</Text>
                            <Text dimColor> 件</Text>
                        </Box>
                        {Object.entries(orgStatus.departments).map(([dept, stats]) => (
                            <Box key={dept}>
                                <Text dimColor>{'  ' + dept.padEnd(12)}</Text>
                                <Text>A:{stats.agents} T:{stats.activeTasks}</Text>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            <Text dimColor>{'─'.repeat(50)}</Text>
        </Box>
    )
}
