// ============================================================
// tests/commands/memory.test.ts — memoryコマンドのユニットテスト
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ────────────────────────────────────────────────────────────
// SDKクライアントのモック
// ────────────────────────────────────────────────────────────

const mockClient = {
    memory: {
        getShortTerm: vi.fn().mockResolvedValue([
            { id: 'entry-001', role: 'user', content: 'こんにちは', timestamp: '2026-03-09T00:00:00Z' },
            { id: 'entry-002', role: 'assistant', content: '元気です！', timestamp: '2026-03-09T00:00:01Z' },
        ]),
        search: vi.fn().mockResolvedValue([
            { id: 'entry-001', content: 'こんにちは', score: 0.95, timestamp: '2026-03-09T00:00:00Z', type: 'short_term' },
        ]),
        getStats: vi.fn().mockResolvedValue({
            shortTermCount: 5,
            longTermCount: 20,
            episodicCount: 3,
            totalTokens: 12000,
            lastConsolidated: null,
        }),
        deleteEntry: vi.fn().mockResolvedValue({ deleted: 1, message: '削除しました' }),
        clearShortTerm: vi.fn().mockResolvedValue({ deleted: 5 }),
        clearAll: vi.fn().mockResolvedValue({ deleted: 28 }),
    },
}

vi.mock('../../src/lib/client.js', () => ({
    createClient: () => Promise.resolve(mockClient),
}))

// @inquirer/prompts をモック
vi.mock('@inquirer/prompts', () => ({
    confirm: vi.fn(),
}))

// ────────────────────────────────────────────────────────────
// テスト
// ────────────────────────────────────────────────────────────

describe('commands/memory - delete', () => {
    let outputLines: string[] = []

    beforeEach(() => {
        outputLines = []
        vi.clearAllMocks()
        vi.spyOn(console, 'log').mockImplementation((...args) => {
            outputLines.push(args.join(' '))
        })
        vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
    })

    it('--force 付きで確認なしに deleteEntry を呼ぶ', async () => {
        const { memoryDeleteCommand } = await import('../../src/commands/memory.js')
        await memoryDeleteCommand('entry-001', { force: true })
        expect(mockClient.memory.deleteEntry).toHaveBeenCalledWith('entry-001')
    })

    it('--force なしで confirm を呼ぶ（y を選択）', async () => {
        const { confirm } = await import('@inquirer/prompts')
        vi.mocked(confirm).mockResolvedValue(true)

        const { memoryDeleteCommand } = await import('../../src/commands/memory.js')
        await memoryDeleteCommand('entry-002', {})
        expect(confirm).toHaveBeenCalled()
        expect(mockClient.memory.deleteEntry).toHaveBeenCalledWith('entry-002')
    })

    it('--force なしで confirm でキャンセルした場合は削除しない', async () => {
        const { confirm } = await import('@inquirer/prompts')
        vi.mocked(confirm).mockResolvedValue(false)

        const { memoryDeleteCommand } = await import('../../src/commands/memory.js')
        await memoryDeleteCommand('entry-003', {})
        expect(mockClient.memory.deleteEntry).not.toHaveBeenCalled()
    })

    it('--json モードで JSON を出力する', async () => {
        const { memoryDeleteCommand } = await import('../../src/commands/memory.js')
        await memoryDeleteCommand('entry-001', { force: true, json: true })
        const parsed = JSON.parse(outputLines.join('\n'))
        expect(parsed).toHaveProperty('deleted', 1)
    })
})

describe('commands/memory - clear', () => {
    let outputLines: string[] = []

    beforeEach(() => {
        outputLines = []
        vi.clearAllMocks()
        vi.spyOn(console, 'log').mockImplementation((...args) => {
            outputLines.push(args.join(' '))
        })
        vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
    })

    it('--force で短期記憶を確認なしに削除する', async () => {
        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ force: true })
        expect(mockClient.memory.clearShortTerm).toHaveBeenCalled()
        expect(mockClient.memory.clearAll).not.toHaveBeenCalled()
    })

    it('--all --force で全メモリを確認なしに削除する', async () => {
        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ all: true, force: true })
        expect(mockClient.memory.clearAll).toHaveBeenCalled()
        expect(mockClient.memory.clearShortTerm).not.toHaveBeenCalled()
    })

    it('--all なしでは clearShortTerm が呼ばれる（--force あり）', async () => {
        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ all: false, force: true })
        expect(mockClient.memory.clearShortTerm).toHaveBeenCalled()
    })

    it('--force なしで一重確認を行う（短期記憶）', async () => {
        const { confirm } = await import('@inquirer/prompts')
        vi.mocked(confirm).mockResolvedValue(true) // 一回 y

        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({})
        expect(confirm).toHaveBeenCalledTimes(1)
        expect(mockClient.memory.clearShortTerm).toHaveBeenCalled()
    })

    it('--all で二重確認を行う', async () => {
        const { confirm } = await import('@inquirer/prompts')
        vi.mocked(confirm)
            .mockResolvedValueOnce(true)  // 1回目: y
            .mockResolvedValueOnce(true)  // 2回目（本当に？）: y

        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ all: true })
        expect(confirm).toHaveBeenCalledTimes(2)
        expect(mockClient.memory.clearAll).toHaveBeenCalled()
    })

    it('--all で2回目の確認でキャンセルした場合は削除しない', async () => {
        const { confirm } = await import('@inquirer/prompts')
        vi.mocked(confirm)
            .mockResolvedValueOnce(true)   // 1回目: y
            .mockResolvedValueOnce(false)  // 2回目: n（キャンセル）

        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ all: true })
        expect(mockClient.memory.clearAll).not.toHaveBeenCalled()
    })

    it('--json モードで削除結果をJSON出力する', async () => {
        const { memoryClearCommand } = await import('../../src/commands/memory.js')
        await memoryClearCommand({ force: true, json: true })
        const parsed = JSON.parse(outputLines.join('\n'))
        expect(parsed).toHaveProperty('deleted', 5)
    })
})
