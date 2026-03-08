// ============================================================
// lib/config.ts — ~/.cocoro/config.json 管理
// ============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface CocoroConfig {
    baseUrl: string
    agentUrl?: string
    apiKey: string
    defaultUserId?: string
}

const CONFIG_DIR = join(homedir(), '.cocoro')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export async function loadConfig(): Promise<CocoroConfig | null> {
    if (!existsSync(CONFIG_FILE)) {
        return null
    }
    try {
        const raw = await readFile(CONFIG_FILE, 'utf-8')
        return JSON.parse(raw) as CocoroConfig
    } catch {
        return null
    }
}

export async function saveConfig(config: CocoroConfig): Promise<void> {
    if (!existsSync(CONFIG_DIR)) {
        await mkdir(CONFIG_DIR, { recursive: true })
    }
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function getConfigFromEnv(): Partial<CocoroConfig> {
    return {
        baseUrl: process.env.COCORO_URL,
        agentUrl: process.env.COCORO_AGENT_URL,
        apiKey: process.env.COCORO_API_KEY,
    }
}

export function mergeConfig(
    fileConfig: CocoroConfig | null,
    envConfig: Partial<CocoroConfig>,
): CocoroConfig | null {
    const merged = {
        ...fileConfig,
        ...Object.fromEntries(
            Object.entries(envConfig).filter(([, v]) => v != null),
        ),
    } as Partial<CocoroConfig>

    if (!merged.baseUrl || !merged.apiKey) return null
    return merged as CocoroConfig
}

export function getConfigPath(): string {
    return CONFIG_FILE
}
