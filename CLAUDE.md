# CLAUDE.md — cocoro-cli

cocoro-coreをターミナルから操作するCLIツールです。
cocoro-sdkに依存しています。

## 重要

- **cocoro-sdkが必要**: `npm install @mdl-systems/cocoro-sdk` または `npm link`（ローカル開発時）
- **設定ファイル**: `~/.cocoro/config.json`
- **CLIフレームワーク**: Commander.js（oclif → Commander に変更）
- **インタラクティブUI**: ink (React for CLI)
- **最低Node.js**: 18.0.0

## 開発コマンド

```bash
npm install
npm run build          # TypeScriptコンパイル
npm run dev            # watchモード
node dist/index.js     # ローカル実行
```

## ローカルSDK開発時のリンク方法

```bash
# cocoro-sdkディレクトリで
cd ../cocoro-sdk
npm link

# cocoro-cliディレクトリで
npm link @mdl-systems/cocoro-sdk
```

## グローバルインストール確認

```bash
npm install -g .
cocoro config
cocoro chat
```

## アーキテクチャ

```
src/
├── index.ts          # Commander.js CLIルーター（サブコマンド定義）
├── commands/         # 各コマンドの実装
│   ├── config.ts     # 設定管理（@inquirer/prompts で対話式）
│   ├── ask.ts        # ワンショット質問（SSEストリーミング）
│   ├── chat.ts       # インタラクティブチャット（ink/React）
│   ├── status.ts     # ノード状態表示
│   ├── personality.ts# 人格情報表示
│   ├── memory.ts     # メモリ一覧/検索
│   └── task.ts       # タスク実行/管理
└── lib/
    ├── config.ts     # ~/.cocoro/config.json 読み書き
    ├── client.ts     # CocoroClient生成ヘルパー
    └── format.ts     # ターミナル表示ユーティリティ
```

## 設定ファイル形式

```json
{
  "baseUrl": "http://192.168.50.92:8001",
  "agentUrl": "http://192.168.50.92:8002",
  "apiKey": "your-api-key-here",
  "defaultUserId": "default"
}
```

## 環境変数（設定ファイルを上書き）

```bash
COCORO_URL=http://cocoro.local:8001
COCORO_API_KEY=<key>
COCORO_AGENT_URL=http://cocoro.local:8002
```
