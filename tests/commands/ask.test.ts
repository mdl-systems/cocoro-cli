// ============================================================
// tests/commands/ask.test.ts — askコマンドのテスト
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// CocoroClientのモック
const mockStream = {
    [Symbol.asyncIterator]: async function* () {
        yield { text: 'こんにちは！' }
        yield { text: '今日はいい天気ですね。' }
    },
    final: async () => ({
        emotion: {
            happiness: 0.8,
            sadness: 0.1,
            anger: 0,
            fear: 0,
            trust: 0.5,
            surprise: 0.2,
            dominant: 'happiness',
        },
    }),
}

const mockClient = {
    chat: {
        send: vi.fn().mockResolvedValue({ text: 'こんにちは！元気ですか？', id: 'test-id' }),
        stream: vi.fn().mockResolvedValue(mockStream),
    },
    emotion: { getState: vi.fn() },
    personality: { get: vi.fn(), getGrowth: vi.fn() },
    memory: { getStats: vi.fn(), getShortTerm: vi.fn(), search: vi.fn() },
    agent: { run: vi.fn(), listTasks: vi.fn(), getTask: vi.fn(), getOrgStatus: vi.fn(), getStats: vi.fn(), createTask: vi.fn() },
    monitor: { getDashboard: vi.fn() },
    health: { check: vi.fn() },
}

vi.mock('../../src/lib/client.js', () => ({
    createClient: () => Promise.resolve(mockClient),
}))

describe('commands/ask', () => {
    let stdoutOutput = ''
    let capturedExit: number | undefined

    beforeEach(() => {
        stdoutOutput = ''
        capturedExit = undefined
        vi.clearAllMocks()

        // stdout をキャプチャ
        vi.spyOn(process.stdout, 'write').mockImplementation((data) => {
            stdoutOutput += String(data)
            return true
        })
        vi.spyOn(console, 'log').mockImplementation((...args) => {
            stdoutOutput += args.join(' ') + '\n'
        })
        vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
            capturedExit = code
            throw new Error(`process.exit(${code})`)
        })
    })

    it('--no-streamモードで通常チャットを実行', async () => {
        const { askCommand } = await import('../../src/commands/ask.js')
        await askCommand('こんにちは', { noStream: true })
        expect(mockClient.chat.send).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'こんにちは' })
        )
        expect(stdoutOutput).toContain('こんにちは！元気ですか？')
    })

    it('--jsonモードでJSON形式で出力', async () => {
        const { askCommand } = await import('../../src/commands/ask.js')
        await askCommand('感情状態は？', { json: true })
        expect(mockClient.chat.send).toHaveBeenCalled()
        const parsed = JSON.parse(stdoutOutput.trim())
        expect(parsed).toHaveProperty('text')
    })

    it('ストリーミングモードでテキストをチャンクで受信', async () => {
        const { askCommand } = await import('../../src/commands/ask.js')
        await askCommand('こんにちは', {})
        expect(mockClient.chat.stream).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'こんにちは' })
        )
        expect(stdoutOutput).toContain('こんにちは！')
        expect(stdoutOutput).toContain('今日はいい天気ですね。')
    })
})
