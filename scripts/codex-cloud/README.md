# Codex Cloud セットアップ（clone 前後）

このディレクトリは、GitHub App のインストールトークン取得、リポジトリアクセス確認、clone/fetch を管理します。

## 使い方

`togello-mcp-server` ルートで以下を実行します。

`make codex-cloud-clone`

トークン取得とアクセス確認だけを実行する場合は、以下を実行します。

`make codex-cloud-preclone`

## 必要な環境変数

`.env.example` を参考に設定してください。

## 任意の環境変数

- `OWNER`（デフォルト: `Toru-Takagi`）
- `REPO`（デフォルト: `togello-mcp-server`）
- `TARGET_DIR`（デフォルト: `worktrees/${REPO}`）
- `CODEX_INSTALL_TOKEN_FILE`（`preclone.sh` で指定時にインストールトークンを書き込みます）
