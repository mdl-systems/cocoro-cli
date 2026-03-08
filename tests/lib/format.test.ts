// ============================================================
// tests/lib/format.test.ts — フォーマットユーティリティのテスト
// ============================================================

import { describe, it, expect } from 'vitest'
import {
    emotionEmoji,
    dominantEmotion,
    progressBar,
    formatUptime,
} from '../../src/lib/format.js'
import type { EmotionState } from '@mdl-systems/cocoro-sdk'

describe('lib/format', () => {
    describe('emotionEmoji', () => {
        it('happinessに😊を返す', () => {
            expect(emotionEmoji('happiness')).toBe('😊')
        })
        it('sadnessに😢を返す', () => {
            expect(emotionEmoji('sadness')).toBe('😢')
        })
        it('未知の感情には🌸を返す', () => {
            expect(emotionEmoji('unknown_emotion')).toBe('🌸')
        })
    })

    describe('dominantEmotion', () => {
        it('最大値の感情を返す', () => {
            const emotion: EmotionState = {
                happiness: 0.8,
                sadness: 0.1,
                anger: 0.0,
                fear: 0.0,
                trust: 0.5,
                surprise: 0.2,
                dominant: 'happiness',
            }
            const result = dominantEmotion(emotion)
            expect(result.name).toBe('happiness')
            expect(result.value).toBe(0.8)
        })

        it('全て0の場合はneutralを返す', () => {
            const emotion: EmotionState = {
                happiness: 0,
                sadness: 0,
                anger: 0,
                fear: 0,
                trust: 0,
                surprise: 0,
                dominant: 'neutral',
            }
            const result = dominantEmotion(emotion)
            expect(result.name).toBe('neutral')
        })
    })

    describe('progressBar', () => {
        it('50%の場合に半分が埋まる', () => {
            const bar = progressBar(0.5, 1, 10)
            // 塗りつぶし5文字 + 空5文字
            expect(bar).toContain('█'.repeat(5))
            expect(bar).toContain('░'.repeat(5))
        })

        it('100%の場合に全て埋まる', () => {
            const bar = progressBar(1, 1, 10)
            expect(bar).toContain('█'.repeat(10))
        })

        it('0%の場合に全て空', () => {
            const bar = progressBar(0, 1, 10)
            expect(bar).toContain('░'.repeat(10))
        })

        it('1以上の値はクランプされる', () => {
            const bar = progressBar(2, 1, 10)
            expect(bar).toContain('█'.repeat(10))
        })
    })

    describe('formatUptime', () => {
        it('1日2時間30分を正しくフォーマット', () => {
            const seconds = 86400 + 7200 + 1800 // 1日 + 2時間 + 30分
            const result = formatUptime(seconds)
            expect(result).toBe('1日 2時間 30分')
        })

        it('1時間未満は時間を省略', () => {
            const result = formatUptime(2700) // 45分
            expect(result).toBe('45分')
        })

        it('日数なしは日を省略', () => {
            const result = formatUptime(3 * 3600 + 30 * 60) // 3時間30分
            expect(result).toBe('3時間 30分')
        })
    })
})
