// ============================================================
// lib/format.ts — 出力フォーマット共通処理
// ============================================================

import chalk from 'chalk'
import type { EmotionState } from '@mdl-systems/cocoro-sdk'

/** 感情値に対応する絵文字を返す */
export function emotionEmoji(emotion: string): string {
    const map: Record<string, string> = {
        happiness: '😊',
        joy: '😄',
        trust: '🤝',
        fear: '😰',
        surprise: '😲',
        sadness: '😢',
        disgust: '😤',
        anger: '😠',
        anticipation: '🤩',
        neutral: '😐',
    }
    return map[emotion] ?? '🌸'
}

/** EmotionStateから最大の感情を返す */
export function dominantEmotion(em: EmotionState): { name: string; value: number } {
    const candidates: [string, number][] = [
        ['happiness', em.happiness],
        ['sadness', em.sadness],
        ['anger', em.anger],
        ['fear', em.fear],
        ['trust', em.trust],
        ['surprise', em.surprise],
    ]
    let best: [string, number] = ['neutral', 0]
    for (const candidate of candidates) {
        if (candidate[1] > best[1]) best = candidate
    }
    return { name: best[0], value: best[1] }
}

/** EmotionStateのエントリを配列で返す */
export function emotionEntries(em: EmotionState): [string, number][] {
    return [
        ['happiness', em.happiness],
        ['sadness', em.sadness],
        ['anger', em.anger],
        ['fear', em.fear],
        ['trust', em.trust],
        ['surprise', em.surprise],
    ]
}

/** プログレスバーを生成（filled/total） */
export function progressBar(value: number, max: number = 1, width: number = 10): string {
    const ratio = Math.min(Math.max(value / max, 0), 1)
    const filled = Math.round(ratio * width)
    const empty = width - filled
    return chalk.magenta('█'.repeat(filled)) + chalk.dim('░'.repeat(empty))
}

/** CPUバーをカラーで生成 */
export function cpuBar(percent: number, width: number = 12): string {
    const ratio = Math.min(percent / 100, 1)
    const filled = Math.round(ratio * width)
    const empty = width - filled
    const color = percent > 80 ? chalk.red : percent > 50 ? chalk.yellow : chalk.green
    return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty))
}

/** 秒数を "X日 Y時間 Z分" 形式に変換 */
export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const parts: string[] = []
    if (days > 0) parts.push(`${days}日`)
    if (hours > 0) parts.push(`${hours}時間`)
    parts.push(`${minutes}分`)
    return parts.join(' ')
}

/** ヘッダーボックスを表示 */
export function printHeader(title: string, subtitle?: string): void {
    const width = 45
    const border = chalk.magenta('─'.repeat(width))
    console.log()
    console.log(chalk.bold.magenta(`🌸 ${title}`))
    if (subtitle) {
        console.log(chalk.dim(subtitle))
    }
    console.log(border)
}

/** 区切り線 */
export function printDivider(width = 45): void {
    console.log(chalk.dim('─'.repeat(width)))
}

/** 成功メッセージ */
export function success(msg: string): void {
    console.log(chalk.green(`✅ ${msg}`))
}

/** エラーメッセージ */
export function error(msg: string): void {
    console.error(chalk.red(`✗ ${msg}`))
}

/** 警告メッセージ */
export function warn(msg: string): void {
    console.warn(chalk.yellow(`⚠ ${msg}`))
}

/** info */
export function info(msg: string): void {
    console.log(chalk.cyan(`ℹ ${msg}`))
}
