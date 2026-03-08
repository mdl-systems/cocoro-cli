// ============================================================
// tests/lib/config.test.ts — 設定管理ユニットテスト
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// モック設定
vi.mock('node:fs/promises')
vi.mock('node:fs')
vi.mock('node:os')

describe('lib/config', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(os.homedir).mockReturnValue('/home/testuser')
    })

    describe('loadConfig', () => {
        it('設定ファイルが存在しない場合はnullを返す', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const { loadConfig } = await import('../../src/lib/config.js')
            const result = await loadConfig()
            expect(result).toBeNull()
        })

        it('有効な設定ファイルを読み込んで返す', async () => {
            const config = { baseUrl: 'http://localhost:8001', apiKey: 'test-key' }
            vi.mocked(existsSync).mockReturnValue(true)
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config) as unknown as Uint8Array)

            const { loadConfig } = await import('../../src/lib/config.js')
            const result = await loadConfig()
            expect(result).toEqual(config)
        })

        it('JSON解析エラーの場合はnullを返す', async () => {
            vi.mocked(existsSync).mockReturnValue(true)
            vi.mocked(fs.readFile).mockResolvedValue('invalid json' as unknown as Uint8Array)

            const { loadConfig } = await import('../../src/lib/config.js')
            const result = await loadConfig()
            expect(result).toBeNull()
        })
    })

    describe('mergeConfig', () => {
        it('ファイル設定と環境変数をマージする', async () => {
            const { mergeConfig } = await import('../../src/lib/config.js')
            const file = { baseUrl: 'http://localhost:8001', apiKey: 'file-key' }
            const env = { apiKey: 'env-key' }
            const result = mergeConfig(file, env)
            expect(result?.apiKey).toBe('env-key')  // 環境変数が優先
            expect(result?.baseUrl).toBe('http://localhost:8001')
        })

        it('baseUrlもapiKeyもない場合はnullを返す', async () => {
            const { mergeConfig } = await import('../../src/lib/config.js')
            const result = mergeConfig(null, {})
            expect(result).toBeNull()
        })

        it('ファイルのみでもapiKeyとbaseUrlがあればOK', async () => {
            const { mergeConfig } = await import('../../src/lib/config.js')
            const file = { baseUrl: 'http://localhost:8001', apiKey: 'key' }
            const result = mergeConfig(file, {})
            expect(result).not.toBeNull()
            expect(result?.baseUrl).toBe('http://localhost:8001')
        })
    })

    describe('getConfigFromEnv', () => {
        it('環境変数から設定を読み込む', async () => {
            process.env.COCORO_URL = 'http://env.local:8001'
            process.env.COCORO_API_KEY = 'env-api-key'
            process.env.COCORO_AGENT_URL = 'http://env.local:8002'

            const { getConfigFromEnv } = await import('../../src/lib/config.js')
            const result = getConfigFromEnv()
            expect(result.baseUrl).toBe('http://env.local:8001')
            expect(result.apiKey).toBe('env-api-key')
            expect(result.agentUrl).toBe('http://env.local:8002')

            delete process.env.COCORO_URL
            delete process.env.COCORO_API_KEY
            delete process.env.COCORO_AGENT_URL
        })
    })
})
