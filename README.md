# cocoro-cli

> ターミナルからcocoroローカルAIを操作するCLIツール

```
╭─────────────────────────────────────────╮
│  🌸 Cocoro — ローカルAI                  │
│  感情: 😊 happiness  シンクロ率: 78%     │
╰─────────────────────────────────────────╯
```

## インストール

```bash
# グローバルインストール（公開後）
npm install -g @mdl-systems/cocoro-cli

# ローカル開発時
git clone ...
cd cocoro-cli
npm install
npm run build
npm install -g .
```

## セットアップ

```bash
cocoro config
# → 対話式でURL・APIキーを入力、接続確認まで実行
```

## コマンド一覧

### `cocoro config` — 設定

```bash
cocoro config                                     # 対話式セットアップ
cocoro config --url http://localhost:8001 --key x # 直接指定
cocoro config --show                              # 設定を確認
```

### `cocoro ask` — ワンショット質問

```bash
cocoro ask "今日の天気は？"
cocoro ask "AIトレンドは？" --no-stream    # ストリーミングなし
cocoro ask "感情状態は？"   --json         # JSON出力
```

### `cocoro chat` — インタラクティブチャット ⭐

```bash
cocoro chat                    # インタラクティブモード
cocoro chat --session my-sess  # セッションIDを指定
```

### `cocoro status` — ノード状態

```bash
cocoro status         # 一回表示
cocoro status --watch # 3秒ごとに更新
cocoro status --json  # JSON出力
```

### `cocoro personality` — 人格情報

```bash
cocoro personality
```

### `cocoro memory` — メモリ操作

```bash
cocoro memory list                   # 最近の記憶
cocoro memory list --limit 20        # 20件表示
cocoro memory search "旅行"          # キーワード検索
cocoro memory stats                  # 統計情報
```

### `cocoro task` — エージェントタスク ⭐

```bash
cocoro task run "AIトレンドをリサーチして"
cocoro task run "レポートを作成して" --type write --priority high
cocoro task list                     # タスク一覧
cocoro task list --status running    # 実行中のみ
cocoro task status <task-id>         # 特定タスクの状態
```

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
```

## 環境変数

```bash
COCORO_URL=http://cocoro.local:8001
COCORO_API_KEY=<key>
COCORO_AGENT_URL=http://cocoro.local:8002
```

## 開発

```bash
npm install
npm run build
npm run dev    # watchモード
npm test       # テスト実行
```

## ライセンス

MIT © MDL Systems
