# Togello MCP Server

This server implements the Model Context Protocol (MCP) for managing context in applications.

## Using npm

```
{
  "mcpServers": {
    "togello": {
      "command": "npx",
      "args": ["-y", "togello-mcp-server"],
      "env": {
        "TOGELLO_API_TOKEN": "replace_with_your_token",
      }
    }
  }
}


# Features

## Resources

- category-list: タスクのカテゴリー一覧を提供します。URI: `togello://category-list`
- activity-item-list: アクティビティ項目の一覧を提供します。URI: `togello://activity-item-list`

## Tools

- get-tasks-list: TODO機能で未完了のタスクを取得します。タスク名 / 予定開始日時 / 予定終了日時 / 優先度 / カテゴリ を認識できます。
- create-task: TODO機能で新しいタスクを作成します。タスク名を指定する必要があります。
- get-todo-category-list: TODO機能からカテゴリーリストを取得します。カテゴリー名 / カテゴリーUUID を認識できます。
- get-today-calendar: 連携しているGoogleカレンダーの昨日/今日/明日の予定を取得します。予定名 / 開始日時 / 終了日時 を認識できます。

```

## publish

```
npm run build
npm version patch
npm publish --access public
```
