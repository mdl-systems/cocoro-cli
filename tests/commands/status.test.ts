// ============================================================
// tests/commands/status.test.ts — statusコマンド ユニットテスト
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── モック ──────────────────────────────────────────────────

const mockHealth = {
    status: 'ok',
    service: 'cocoro-core',
    version: '0.1.0',
    uptime: 3600,
}

const mockDashboard = {
    nodeId: 'node-001',
    status: 'running',
    cpuUsage: 12.5,
    memoryUsage: 45.2,
    uptime: 3600,
    checkpoints: [],
}

const mockEmotion = {
    happiness: 0.7,
    sadness: 0.1,
    anger: 0.05,
    fear: 0.05,
    trust: 0.6,
    surprise: 0.2,
    dominant: 'happiness',
}

const mockGrowth = {
    syncRate: 72,
    phase: 'normal' as const,
    learningRate: 0.8,
    totalInteractions: 340,
    lastEvolution: new Date().toISOString(),
}

const mockMemory = {
    shortTermCount: 8,
    longTermCount: 124,
    episodicCount: 56,
    totalTokens: 18500,
    lastConsolidated: new Date().toISOString(),
}

const mockOrgStatus = {
    departments: { research: { agents: 1, activeTasks: 0 } },
    totalTasks: { queued: 0, running: 0, completed: 10, failed: 0 },
}

const mockClient = {
    chat: { send: vi.fn(), stream: vi.fn() },
    emotion: { getState: vi.fn().mockResolvedValue(mockEmotion) },
    personality: {
        get: vi.fn(),
        getGrowth: vi.fn().mockResolvedValue(mockGrowth),
    },
    memory: {
        getStats: vi.fn().mockResolvedValue(mockMemory),
        getShortTerm: vi.fn(),
        search: vi.fn(),
    },
    agent: {
        run: vi.fn(),
        listTasks: vi.fn(),
        getTask: vi.fn(),
        getStats: vi.fn(),
        getOrgStatus: vi.fn().mockResolvedValue(mockOrgStatus),
        createTask: vi.fn(),
    },
    monitor: { getDashboard: vi.fn().mockResolvedValue(mockDashboard) },
    health: { check: vi.fn().mockResolvedValue(mockHealth) },
}

vi.mock('../../src/lib/client.js', () => ({
    createClient: () => Promise.resolve(mockClient),
}))

// ink の render をモック
vi.mock('ink', () => ({
    render: vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() }),
    useApp: vi.fn().mockReturnValue({ exit: vi.fn() }),
    Text: vi.fn(),
}))
vi.mock('react', async () => {
    const actual = await vi.importActual<typeof import('react')>('react')
    return { ...actual, createElement: vi.fn().mockReturnValue(null) }
})

// ── Helpers ─────────────────────────────────────────────────

function captureOutput() {
    let out = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((d) => { out += String(d); return true })
    vi.spyOn(console, 'log').mockImplementation((...a) => { out += a.join(' ') + '\n' })
    return () => out
}

// ── Tests ────────────────────────────────────────────────────

describe('commands/status', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('通常モードで全APIを並列呼び出しして表示する', async () => {
        const { statusCommand } = await import('../../src/commands/status.js')
        await statusCommand({})

        // Promise.allSettled で全員が呼ばれること
        expect(mockClient.health.check).toHaveBeenCalled()
        expect(mockClient.monitor.getDashboard).toHaveBeenCalled()
        expect(mockClient.emotion.getState).toHaveBeenCalled()
        expect(mockClient.personality.getGrowth).toHaveBeenCalled()
        expect(mockClient.memory.getStats).toHaveBeenCalled()
        expect(mockClient.agent.getOrgStatus).toHaveBeenCalled()
    })

    it('--json モードで全データをJSONとして出力する', async () => {
        const getOut = captureOutput()
        const { statusCommand } = await import('../../src/commands/status.js')
        await statusCommand({ json: true })

        const out = getOut()
        const parsed = JSON.parse(out.trim())

        expect(parsed).toHaveProperty('health')
        expect(parsed).toHaveProperty('emotion')
        expect(parsed).toHaveProperty('memory')
        expect(parsed).toHaveProperty('orgStatus')
        expect(parsed.health.status).toBe('ok')
    })

    it('一部APIが失敗しても他のデータは表示する（nullフォールバック）', async () => {
        // health だけ失敗
        mockClient.health.check.mockRejectedValueOnce(new Error('Connection refused'))

        const getOut = captureOutput()
        const { statusCommand } = await import('../../src/commands/status.js')
        await statusCommand({ json: true })

        const out = getOut()
        const parsed = JSON.parse(out.trim())

        // health が null になり、emotion は取得できていること
        expect(parsed.health).toBeNull()
        expect(parsed.emotion).not.toBeNull()
        expect(parsed.emotion.dominant).toBe('happiness')
    })

    it('全APIが失敗しても例外で落ちずに全nullで返す', async () => {
        mockClient.health.check.mockRejectedValueOnce(new Error('offline'))
        mockClient.monitor.getDashboard.mockRejectedValueOnce(new Error('offline'))
        mockClient.emotion.getState.mockRejectedValueOnce(new Error('offline'))
        mockClient.personality.getGrowth.mockRejectedValueOnce(new Error('offline'))
        mockClient.memory.getStats.mockRejectedValueOnce(new Error('offline'))
        mockClient.agent.getOrgStatus.mockRejectedValueOnce(new Error('offline'))

        const getOut = captureOutput()
        const { statusCommand } = await import('../../src/commands/status.js')

        // process.exit が呼ばれないこと（Promise.allSettledなので落ちない）
        await expect(statusCommand({ json: true })).resolves.toBeUndefined()

        const out = getOut()
        const parsed = JSON.parse(out.trim())
        expect(parsed.health).toBeNull()
        expect(parsed.emotion).toBeNull()
    })
})
