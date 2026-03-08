// ============================================================
// ui/StatusPanel.tsx — ノード状態パネル（ink)
// ============================================================

import React from 'react'
import { Box, Text } from 'ink'
import type { HealthStatus, NodeDashboard } from '@mdl-systems/cocoro-sdk'
import type { EmotionState, GrowthState, MemoryStats, OrgStatus } from '@mdl-systems/cocoro-sdk'
import { EmotionBar } from './EmotionBar.js'
import { formatUptime, cpuBar } from '../lib/format.js'

interface StatusPanelProps {
    health: HealthStatus | null
    dashboard: NodeDashboard | null
    emotion: EmotionState | null
    growth: GrowthState | null
    memory: MemoryStats | null
    orgStatus: OrgStatus | null
}

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

export const StatusPanel: React.FC<StatusPanelProps> = ({
    health, dashboard, emotion, growth, memory, orgStatus,
}) => {
    return (
        <Box flexDirection="column" paddingX={1}>
            {/* ── ヘッダー ── */}
            <Box borderStyle="round" borderColor="magentaBright" paddingX={2} marginBottom={1}>
                <Text bold color="magentaBright">🌸 Cocoro Node Status</Text>
                {health && (
                    <Text color={health.status === 'ok' ? 'green' : 'yellow'}>
                        {'  '}
                        {health.status === 'ok' ? '✅' : '⚠'}
                        {'  '}
                        {health.version}
                    </Text>
                )}
            </Box>

            {/* ── ヘルス ── */}
            {health && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color="cyan">📡 ヘルスチェック</Text>
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
                            <Text dimColor>{'  メモリ'.padEnd(8)}</Text>
                            <Text color={health.services.memory === 'ok' ? 'green' : 'red'}>
                                {health.services.memory === 'ok' ? '✅ ok' : '✗ error'}
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
