# CLAUDE.md — cocoro-cli

cocoro-coreをターミナルから操作するCLIツールです。
`@mdl-systems/cocoro-sdk` に依存し、cocoro-core(8001) と cocoro-agent(8002) を操作します。

---

## 重要事項

| 項目 | 内容 |
|------|------|
| **SDKパッケージ** | `@mdl-systems/cocoro-sdk` |
| **設定ファイル** | `~/.cocoro/config.json` |
| **CLIフレームワーク** | Commander.js |
| **インタラクティブUI** | ink (React for CLI) + `@inquirer/prompts` |
| **最低Node.js** | 18.0.0 |
| **ビルド** | TypeScript → `dist/` |

---

## アーキテクチャ

```
src/
├── index.ts               # Commander.js CLIルーター（サブコマンド定義）
├── commands/              # 各コマンドの実装（薄いラッパー）
│   ├── config.ts          # 設定管理。@inquirer/prompts で対話式
│   ├── ask.ts             # ワンショット質問（streaming/no-stream/json）
│   ├── chat.tsx           # ChatUI コンポーネントを render() するだけ
│   ├── status.ts          # StatusPanel コンポーネントを render() するだけ
│   ├── personality.ts     # 人格/成長/感情をプログレスバー表示
│   ├── memory.ts          # short-term list / search / stats
│   └── task.ts            # TaskHandle.stream() SSE + TaskProgress コンポーネント
├── ui/                    # ink/React コンポーネント（再利用可能）
│   ├── ChatUI.tsx         # チャット画面：感情ヘッダー + メッセージ履歴 + 入力欄
│   ├── EmotionBar.tsx     # compact(1行) / full(バーリスト) の感情表示
│   ├── StatusPanel.tsx    # ヘルス/CPU/感情/メモリ/エージェント組織 統合パネル
│   └── TaskProgress.tsx   # SSEイベントを消費してリアルタイム進捗アニメーション
└── lib/
    ├── client.ts          # createClient() — 設定読んでCocoroClient生成
    ├── config.ts          # ~/.cocoro/config.json の read/write + 環境変数マージ
    └── format.ts          # progressBar/cpuBar/emotionEmoji/formatUptime 等
```

---

## SDK との対応関係

| CLI コマンド | SDK メソッド |
|-----------|------------|
| `cocoro setup` | 設定ウィザード（SDK不使用、直接fetch） |
| `cocoro ask` | `client.chat.send()` / `client.chat.stream()` |
| `cocoro chat` | `client.chat.stream()` + SSE |
| `cocoro chat "質問"` | 引数ありの場合 `client.chat.stream()` でワンショット |
| `cocoro status` | `client.health.check()` / `client.monitor.getDashboard()` / `client.emotion.getState()` / `client.personality.getGrowth()` / `client.memory.getStats()` / `client.agent.getOrgStatus()` |
| `cocoro emotion` | `client.emotion.getState()` |
| `cocoro sync` | `client.personality.getGrowth()` / `client.personality.get()` |
| `cocoro personality` | `client.personality.get()` / `client.personality.getGrowth()` |
| `cocoro memory list` | `client.memory.getShortTerm()` |
| `cocoro memory search` | `client.memory.search()` |
| `cocoro memory stats` | `client.memory.getStats()` |
| `cocoro memory delete` | `client.memory.deleteEntry()` |
| `cocoro memory clear` | `client.memory.clearShortTerm()` / `client.memory.clearAll()` |
| `cocoro agent list` | `client.agent.list()` |
| `cocoro agent run` | `client.agent.run()` → `TaskHandle.stream()` SSE |
| `cocoro task run` | `client.agent.run()` → `TaskHandle.stream()` SSE |
| `cocoro task list` | `client.agent.listTasks()` |
| `cocoro task status` | `client.agent.getTask(taskId)` |
| `cocoro task stats` | `client.agent.getStats()` |
| `cocoro config set` | 設定ファイル直接更新 |

---

## 開発コマンド

```bash
# 依存インストール
npm install

# ビルド（TypeScript → dist/）
npm run build

# ウォッチモード
npm run dev

# テスト実行
npm run test:run

# ローカル動作確認
node dist/index.js --help
node dist/index.js config
node dist/index.js chat
```

---

## ローカルSDK開発時のリンク

```bash
# cocoro-sdk ディレクトリで
npm link

# cocoro-cli ディレクトリで
npm link @mdl-systems/cocoro-sdk

# または ローカルパスで直接インストール
npm install ../cocoro-sdk --ignore-scripts
```

---

## グローバルインストール確認

```bash
npm install -g .
cocoro --help
cocoro config
cocoro chat
```

---

## 型の注意点

- `EmotionState` — `{ happiness, sadness, anger, fear, trust, surprise, dominant }` （インデックスシグネチャなし）
- `Personality` — `{ identity: { name, role, traits }, values: ValueVector, beliefs, emotion, goals }`
- `GrowthState` — `syncRate` は `0-100` の整数。`phase` は `'accelerating' | 'normal' | 'slowing' | 'ceiling'`
- `MemoryStats` — フィールドは `shortTermCount`, `longTermCount`, `episodicCount`, `totalTokens`, `lastConsolidated`
- `Task` (agent系) — `task_id` がIDフィールド（`id` ではない）。`status` は `'queued' | 'running' | 'completed' | 'failed'`
- `TaskHandle` — `agent.run()` が返す。`.stream()` でSSEジェネレーター、`.result()` でポーリング待機

---

## 設定ファイル形式

```json
{
  "baseUrl": "http://192.168.50.92:8001",
  "agentUrl": "http://192.168.50.92:8002",
  "apiKey": "your-api-key-here",
  "defaultUserId": "default"
}
```

---

## 環境変数（設定ファイルを上書き）

```bash
COCORO_URL=http://cocoro.local:8001
COCORO_API_KEY=<key>
COCORO_AGENT_URL=http://cocoro.local:8002
```

---

## テスト

```bash
# ユニットテスト（Vitest）
npm run test:run

# テストファイル構成
tests/
├── commands/ask.test.ts     # askコマンド (streaming/no-stream/json)
└── lib/
    ├── config.test.ts       # loadConfig / mergeConfig / getConfigFromEnv
    └── format.test.ts       # emotionEmoji / dominantEmotion / progressBar / formatUptime
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-14 | 最終仕上げ: `cocoro init`追加 / `agent run` に`runWithRole`対応・ロール別絵文字 / `--format` オプション（json/table/text）/ `memory list --format table` / README npm install 更新 |
| 2026-03-14 | UX改善: `ChatUI` ブリンクカーソル・人格名取得・ラベル整形 / `StatusPanel` コンパクトボックス表示追加 / `package.json` npm publish 準備 (bin修正・publishConfig追加) |
| 2026-03-13 | フル実装: `cocoro emotion` / `cocoro sync` / `cocoro agent list` / `cocoro agent run` / `cocoro setup` / `cocoro config set` / `cocoro chat "質問"` (ワンショット引数対応) / `cocoro config show` |
| 2026-03-09 | ink UIコンポーネント分離（`src/ui/`）、SSEタスクリアルタイム進捗、Vitestテスト追加 |
| 2026-03-08 | 初版実装（Phase 1+2: config/ask/chat/status/personality/memory/task） |
