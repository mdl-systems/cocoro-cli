// ============================================================
// commands/status.ts — ノード状態表示コマンド
// StatusPanel (ink) を使用
// ============================================================

import React from 'react'
import { render, Text } from 'ink'
import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/client.js'
import { StatusPanel } from '../ui/StatusPanel.js'
import type { HealthStatus, NodeDashboard, EmotionState, GrowthState, MemoryStats, OrgStatus } from '@mdl-systems/cocoro-sdk'

interface StatusOptions {
    json?: boolean
    watch?: boolean
}

interface StatusData {
    health: HealthStatus | null
    dashboard: NodeDashboard | null
    emotion: EmotionState | null
    growth: GrowthState | null
    memory: MemoryStats | null
    orgStatus: OrgStatus | null
}

async function fetchAll(client: Awaited<ReturnType<typeof createClient>>): Promise<StatusData> {
    const [health, dashboard, emotion, growth, memory, orgStatus] = await Promise.allSettled([
        client.health.check(),
        client.monitor.getDashboard(),
        client.emotion.getState(),
        client.personality.getGrowth(),
        client.memory.getStats(),
        client.agent.getOrgStatus(),
    ])

    return {
        health: health.status === 'fulfilled' ? health.value : null,
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
        emotion: emotion.status === 'fulfilled' ? emotion.value : null,
        growth: growth.status === 'fulfilled' ? growth.value : null,
        memory: memory.status === 'fulfilled' ? memory.value : null,
        orgStatus: orgStatus.status === 'fulfilled' ? orgStatus.value : null,
    }
}

export async function statusCommand(opts: StatusOptions): Promise<void> {
    const client = await createClient()

    if (opts.json) {
        const spinner = ora({ text: '情報取得中...', color: 'magenta' }).start()
        const data = await fetchAll(client)
        spinner.stop()
        console.log(JSON.stringify(data, null, 2))
        return
    }

    if (opts.watch) {
        // ウォッチモード: 5秒ごとにデータ更新してinkで再レンダリング
        // Reactのstateを使った動的コンポーネント
        const WatchPanel: React.FC = () => {
            const [data, setData] = React.useState<StatusData>({
                health: null, dashboard: null, emotion: null,
                growth: null, memory: null, orgStatus: null,
            })
            const [lastUpdated, setLastUpdated] = React.useState('')

            React.useEffect(() => {
                const fetch_ = async () => {
                    const d = await fetchAll(client)
                    setData(d)
                    setLastUpdated(new Date().toLocaleTimeString('ja-JP'))
                }
                void fetch_()
                const id = setInterval(() => void fetch_(), 5000)
                return () => clearInterval(id)
            }, [])

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(StatusPanel, { ...data }),
                lastUpdated
                    ? React.createElement(
                        Text,
                        { dimColor: true },
                        `  最終更新: ${lastUpdated}  (5秒ごとに自動更新)`,
                    )
                    : null,
            )
        }

        const { waitUntilExit } = render(React.createElement(WatchPanel))
        await waitUntilExit()
        return
    }

    // 通常モード: 一度だけ取得してinkで表示
    const spinner = ora({ text: '情報取得中...', color: 'magenta' }).start()
    const data = await fetchAll(client)
    spinner.stop()

    const { waitUntilExit } = render(
        React.createElement(StatusPanel, { ...data }),
    )
    await waitUntilExit()
}
