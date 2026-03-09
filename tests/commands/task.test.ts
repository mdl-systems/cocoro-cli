// ============================================================
// tests/commands/task.test.ts — タスクコマンド ユニットテスト
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── モック ──────────────────────────────────────────────────

const TASK_ID = 'abc123def456'

const mockTaskHandle = {
    id: TASK_ID,
    status: 'queued' as const,
    refresh: vi.fn().mockResolvedValue({
        task_id: TASK_ID,
        title: 'AIトレンドリサーチ',
        status: 'queued',
        progress: 0,
        assignedTo: 'researcher',
        currentStep: null,
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
    }),
    stream: vi.fn().mockReturnValue(
        (async function* () {
            yield { event: 'progress', data: { step: '情報収集中', progress: 50 } }
            yield { event: 'completed', data: { progress: 100 } }
        })()
    ),
    result: vi.fn().mockResolvedValue({
        task_id: TASK_ID,
        status: 'completed',
        result: { summary: 'AI trend summary', details: '...' },
        duration_seconds: 12.5,
    }),
}

const mockTaskList = {
    tasks: [
        {
            task_id: TASK_ID,
            title: 'AIトレンドリサーチ',
            status: 'completed' as const,
            progress: 100,
            assignedTo: 'researcher',
            currentStep: null,
            result: null,
            error: null,
            createdAt: new Date().toISOString(),
        },
    ],
    total: 1,
    limit: 20,
    offset: 0,
}

const mockStats = {
    total: 10,
    byStatus: { queued: 1, running: 2, completed: 7, failed: 0 },
    byAgent: [
        { agent: 'researcher', count: 6, avgDuration: 15000 },
        { agent: 'dev', count: 4, avgDuration: 8000 },
    ],
    recentTasks: [],
}

const mockClient = {
    chat: { send: vi.fn(), stream: vi.fn() },
    emotion: { getState: vi.fn() },
    personality: { get: vi.fn(), getGrowth: vi.fn() },
    memory: { getStats: vi.fn(), getShortTerm: vi.fn(), search: vi.fn() },
    agent: {
        run: vi.fn().mockResolvedValue(mockTaskHandle),
        listTasks: vi.fn().mockResolvedValue(mockTaskList),
        getTask: vi.fn().mockResolvedValue(mockTaskList.tasks[0]),
        getStats: vi.fn().mockResolvedValue(mockStats),
        getOrgStatus: vi.fn(),
        createTask: vi.fn(),
    },
    monitor: { getDashboard: vi.fn() },
    health: { check: vi.fn() },
}

vi.mock('../../src/lib/client.js', () => ({
    createClient: () => Promise.resolve(mockClient),
}))

// ink の render をモック（ターミナルUI不要）
vi.mock('ink', () => ({
    render: vi.fn().mockReturnValue({ waitUntilExit: () => Promise.resolve() }),
    useApp: vi.fn().mockReturnValue({ exit: vi.fn() }),
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
    vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`)
    })
    return () => out
}

// ── Tests ────────────────────────────────────────────────────

describe('commands/task', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── task run ──────────────────────────────────────────

    describe('taskRunCommand', () => {
        it('agent.run() が呼ばれてインクUIを描画する（通常モード）', async () => {
            const { taskRunCommand } = await import('../../src/commands/task.js')
            await taskRunCommand('AIトレンドをリサーチして', {})

            expect(mockClient.agent.run).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'AIトレンドをリサーチして' })
            )
            expect(mockTaskHandle.refresh).toHaveBeenCalled()
            expect(mockTaskHandle.stream).toHaveBeenCalled()
        })

        it('--json モードでtask_idとresultをJSON出力する', async () => {
            const getOut = captureOutput()
            const { taskRunCommand } = await import('../../src/commands/task.js')
            await taskRunCommand('AIトレンド調査', { json: true })

            expect(mockClient.agent.run).toHaveBeenCalled()
            expect(mockTaskHandle.result).toHaveBeenCalled()
            const out = getOut()
            const parsed = JSON.parse(out.match(/\{[\s\S]+\}/)?.[0] ?? '{}')
            expect(parsed).toHaveProperty('task_id')
        })

        it('typeオプションがresearchの場合に正しく渡される', async () => {
            const { taskRunCommand } = await import('../../src/commands/task.js')
            await taskRunCommand('競合分析', { type: 'research', priority: 'high' })

            expect(mockClient.agent.run).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'research', priority: 'high' })
            )
        })

        it('不正なtypeはautoにフォールバックする', async () => {
            const { taskRunCommand } = await import('../../src/commands/task.js')
            await taskRunCommand('テスト', { type: 'invalid_type' })

            expect(mockClient.agent.run).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'auto' })
            )
        })
    })

    // ── task list ─────────────────────────────────────────

    describe('taskListCommand', () => {
        it('agent.listTasks() が呼ばれてタスク一覧を表示する', async () => {
            const getOut = captureOutput()
            const { taskListCommand } = await import('../../src/commands/task.js')
            await taskListCommand({})

            expect(mockClient.agent.listTasks).toHaveBeenCalled()
            expect(getOut()).toContain('AIトレンドリサーチ')
        })

        it('--json モードでJSONを出力する', async () => {
            const getOut = captureOutput()
            const { taskListCommand } = await import('../../src/commands/task.js')
            await taskListCommand({ json: true })

            const out = getOut()
            const parsed = JSON.parse(out.trim())
            expect(parsed).toHaveProperty('tasks')
            expect(parsed.total).toBe(1)
        })

        it('statusフィルターが正しく渡される', async () => {
            const { taskListCommand } = await import('../../src/commands/task.js')
            await taskListCommand({ status: 'running' })

            expect(mockClient.agent.listTasks).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'running' })
            )
        })

        it('不正なstatusはundefinedにフォールバックする', async () => {
            const { taskListCommand } = await import('../../src/commands/task.js')
            await taskListCommand({ status: 'invalid' })

            expect(mockClient.agent.listTasks).toHaveBeenCalledWith(
                expect.objectContaining({ status: undefined })
            )
        })
    })

    // ── task status ───────────────────────────────────────

    describe('taskStatusCommand', () => {
        it('agent.getTask() が呼ばれてタスク詳細を表示する', async () => {
            const getOut = captureOutput()
            const { taskStatusCommand } = await import('../../src/commands/task.js')
            await taskStatusCommand(TASK_ID, {})

            expect(mockClient.agent.getTask).toHaveBeenCalledWith(TASK_ID)
            expect(getOut()).toContain(TASK_ID.slice(0, 12))
        })

        it('--json モードでJSONを出力する', async () => {
            const getOut = captureOutput()
            const { taskStatusCommand } = await import('../../src/commands/task.js')
            await taskStatusCommand(TASK_ID, { json: true })

            const out = getOut()
            const parsed = JSON.parse(out.trim())
            expect(parsed).toHaveProperty('task_id')
        })
    })

    // ── task stats ────────────────────────────────────────

    describe('taskStatsCommand', () => {
        it('agent.getStats() が呼ばれて統計を表示する', async () => {
            const getOut = captureOutput()
            const { taskStatsCommand } = await import('../../src/commands/task.js')
            await taskStatsCommand({})

            expect(mockClient.agent.getStats).toHaveBeenCalled()
            expect(getOut()).toContain('10')
        })

        it('--json モードでJSONを出力する', async () => {
            const getOut = captureOutput()
            const { taskStatsCommand } = await import('../../src/commands/task.js')
            await taskStatsCommand({ json: true })

            const out = getOut()
            const parsed = JSON.parse(out.trim())
            expect(parsed.total).toBe(10)
            expect(parsed.byStatus).toHaveProperty('completed')
        })
    })
})
