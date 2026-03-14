# cocoro-cli

> ターミナルからCocoroローカルAIを操作するCLIツール

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

```
╭─────────────────────────────────────────────╮
│  🌸 Cocoro — ローカルAI                      │
│  😊 happiness   シンクロ率: 78%              │
╰─────────────────────────────────────────────╯

Cocoro: こんにちは！今日も調子はいかがですか？

You: █
```

---

## 特徴

- 🌸 **SSEストリーミング** — word-by-word でリアルタイム表示
- 🎨 **ink UI** — React ベースのリッチなターミナル画面
- 🤖 **タスク実行** — エージェントへの指示とリアルタイム進捗
- 😊 **感情・シンクロ率** — AIの内部状態をリアルタイム表示
- 🧠 **メモリ検索** — 過去の記憶をキーワード検索
- 📊 **ノード監視** — CPU/メモリ/サービス状態を一目で確認

---

## インストール

```bash
# グローバルインストール
npm install -g @mdl-systems/cocoro-cli

# バージョン確認
cocoro --version
```

開発版・ローカルビルド：

```bash
git clone https://github.com/mdl-systems/cocoro-cli.git
cd cocoro-cli
npm install
npm run build
npm install -g .
```

---

## セットアップ（30秒）

```bash
# 推奨: cocoro init
cocoro init
# ? cocoro-core の URL: http://192.168.50.92
# ? API キー: ****
# ? デフォルトエージェント名: MDL
# ✅ ~/.cocoro/config.json を作成しました
# ✅ cocoro-core への接続を確認しました
# 🎉 セットアップ完了！
```

または詳細版：

```bash
cocoro setup
```

または直接指定：

```bash
cocoro config --url http://192.168.50.92:8001 --key YOUR_API_KEY
```

---

## コマンド一覧

### `cocoro init` — 初回セットアップ ⭐ 推奨

```bash
cocoro init     # URL・APIキー・エージェント名を対話式で設定
cocoro setup    # より詳細なセットアップ（Boot Wizard）
```

### `cocoro config` — 設定管理

```bash
cocoro config                                      # 対話式セットアップ
cocoro config --url http://localhost:8001 --key x  # 直接指定
cocoro config --show                               # 現在の設定を確認
```

設定ファイル: `~/.cocoro/config.json`

```json
{
  "baseUrl": "http://192.168.50.92:8001",
  "agentUrl": "http://192.168.50.92:8002",
  "apiKey": "your-api-key",
  "defaultUserId": "default"
}
```

---

### `cocoro chat` — インタラクティブチャット ⭐

```bash
cocoro chat                     # インタラクティブモード（会話履歴をセッション内保持）
cocoro chat "今日は何する？"     # ワンショット質問
cocoro chat --session my-sess   # セッションIDを指定
cocoro chat --format json       # JSON出力
```

- ink/React ベースのリッチ UI
- SSE でword-by-wordストリーミング表示
- 感情状態・シンクロ率をヘッダーにリアルタイム表示
- `Ctrl+C` で終了

---

### `cocoro ask` — ワンショット質問

```bash
cocoro ask "今日の予定を教えて"
cocoro ask "AIトレンドは？"  --no-stream   # ストリーミングなし（パイプ用）
cocoro ask "感情状態は？"    --json        # JSON出力（スクリプト組み込み）
```

---

### `cocoro status` — ノード状態 ⭐

```bash
cocoro status              # ノード状態を表示
cocoro status --watch      # 5秒ごとに自動更新
cocoro status --json       # JSON出力
cocoro status --format json  # --json と同等
```

表示内容：
- 📡 ヘルスチェック（バージョン・稼働時間・サービス状態）
- 📊 システムリソース（CPU / メモリ / ディスク）
- 🧠 人格状態（シンクロ率・感情）
- 💾 メモリ統計（短期 / 長期 / エピソード）
- 🤖 エージェント組織（部門別タスク状況）

---

### `cocoro task` — エージェントタスク ⭐ デモインパクト最大

```bash
# タスク実行（SSEリアルタイム進捗）
cocoro task run "競合AIサービスを調査してまとめて"
cocoro task run "週次レポートを作成して" --type write
cocoro task run "競合他社を分析して"    --type analyze --priority high

# タスク管理
cocoro task list                       # 一覧表示
cocoro task list --status running      # 実行中のみ
cocoro task status <task-id>           # 特定タスクの状態
cocoro task stats                      # 統計サマリー
```

**`task run` の表示例:**
```
╭──────────────────────────────────────╮
│ 🤖 タスク実行中  abc123def456...     │
╰──────────────────────────────────────╯

目標: 競合AIサービスを調査してまとめて

⠸ ████████████████░░░░░░░░░░░░  55%  42s

  ├─ ✓ タスク解析完了
  ├─ ✓ Web検索: "AI services 2026"  [web_search]
  ├─ ✓ Web検索: "local AI competitors"  [web_search]
  └─ ⠸ 情報を整理してレポート作成中...
```

タスク種別: `research` / `write` / `analyze` / `schedule` / `auto`
優先度: `low` / `normal` / `high`

---

### `cocoro personality` — 人格情報

```bash
cocoro personality
cocoro personality --json
```

表示内容：
- 基本情報（名前・役割・性格）
- 📈 成長状態（シンクロ率・学習フェーズ）
- 💎 価値観ベクトル（8次元プログレスバー）
- 😊 感情状態（6感情バー）
- 🧠 信念リスト

---

### `cocoro memory` — メモリ操作

```bash
cocoro memory list                     # 最近の記憶（短期）
cocoro memory list --limit 20          # 件数指定
cocoro memory list --format table      # テーブル形式で表示 ✨
cocoro memory list --format json       # JSON出力
cocoro memory search "旅行"            # キーワード検索
cocoro memory stats                    # 統計情報
cocoro memory delete <id>              # エントリ削除
cocoro memory clear                    # 短期記憶クリア
cocoro memory clear --all              # 全記憶クリア
```

### `cocoro agent` — エージェント管理 ⭐

```bash
cocoro agent list                                # エージェント一覧
cocoro agent run researcher "AIトレンドを調査"   # 🔍 ロール指定実行
cocoro agent run writer "ブログ記事を書いて"     # ✍️ ライターロール
cocoro agent run analyst "データを分析して"      # 📊 アナリストロール
cocoro agent run default "なんでもやって"        # デフォルトエージェント
```

**`agent run` の表示例:**
```
🔍 researcher エージェントを起動中...
  タスク: AIトレンドを調査してまとめて

⠋ 情報収集中...   (10%)
⠙ Web検索実行中... (30%)
⠹ 分析中...       (60%)
⠸ レポート作成中.. (80%)
✅ 完了！
```

---

## デモシナリオ

```bash
# 1. セットアップ（30秒）
cocoro config --url http://cocoro.local:8001 --key xxxx

# 2. ステータス確認
cocoro status

# 3. チャット（リアルタイムストリーミング）
cocoro chat

# 4. 自律タスク実行（最大のインパクト）
cocoro task run "競合AIサービスを調査してまとめて"
# → AIが自分でWeb検索・整理・レポート作成

# 5. 人格・感情を確認
cocoro personality
```

---

## 環境変数

設定ファイル（`~/.cocoro/config.json`）があれば不要。環境変数で上書きも可能。

```bash
COCORO_URL=http://cocoro.local:8001
COCORO_API_KEY=your-api-key
COCORO_AGENT_URL=http://cocoro.local:8002
```

---

## 開発

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# ローカル実行
node dist/index.js config
node dist/index.js chat

# ウォッチモード（開発時）
npm run dev

# テスト実行
npm run test:run

# グローバルインストール（動作確認）
npm install -g .
cocoro --help
```

### ローカルSDK開発時のリンク方法

```bash
# cocoro-sdk ディレクトリで
cd ../cocoro-sdk
npm link

# cocoro-cli ディレクトリで
npm link @mdl-systems/cocoro-sdk
```

---

## アーキテクチャ

```
cocoro-cli/
├── src/
│   ├── index.ts              # Commander.js CLIルーター
│   ├── commands/             # コマンド実装
│   │   ├── config.ts         # 設定管理（@inquirer/prompts）
│   │   ├── ask.ts            # ワンショット質問
│   │   ├── chat.tsx          # インタラクティブチャット
│   │   ├── status.ts         # ノード状態表示
│   │   ├── personality.ts    # 人格情報表示
│   │   ├── memory.ts         # メモリ操作
│   │   └── task.ts           # タスク管理（SSEストリーミング）
│   ├── ui/                   # inkコンポーネント
│   │   ├── ChatUI.tsx        # チャット画面
│   │   ├── EmotionBar.tsx    # 感情バー表示
│   │   ├── StatusPanel.tsx   # ノード状態パネル
│   │   └── TaskProgress.tsx  # タスク進捗表示（SSEリアルタイム）
│   └── lib/                  # 共通ライブラリ
│       ├── client.ts         # CocoroClient生成
│       ├── config.ts         # ~/.cocoro/config.json 管理
│       └── format.ts         # ターミナル表示ユーティリティ
└── tests/
    ├── commands/ask.test.ts
    └── lib/
        ├── config.test.ts
        └── format.test.ts
```

---

## 依存するサービス

| サービス | ポート | 役割 |
|---------|--------|------|
| cocoro-core | 8001 | チャット / 感情 / 人格 / メモリ |
| cocoro-agent | 8002 | タスク実行 / エージェント管理 |

---

## ライセンス

MIT © MDL Systems
