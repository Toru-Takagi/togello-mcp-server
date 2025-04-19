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

- get-tasks-list: TODO機能で未完了のタスクを取得します。タスクUUID / タスク名 / 予定開始日時 / 予定終了日時 / 優先度 / カテゴリ を認識できます。
- create-task: TODO機能で新しいタスクを作成します。タスク名（taskName）を指定する必要があります。カテゴリーUUID（categoryUUID）、予定開始日時（scheduledStartDate）、URL（url）もオプションで指定できます。
- update-task: TODO機能でタスクを更新します。タスクの完了状態を更新できます。get-tasks-listで取得したタスクUUIDを指定する必要があります。
- get-todo-category-list: TODO機能からカテゴリーリストを取得します。カテゴリー名 / カテゴリーUUID を認識できます。
- get-today-calendar: 連携しているGoogleカレンダーの昨日/今日/明日の予定を取得します。予定名 / 開始日時 / 終了日時 を認識できます。
- get-activity-item-list: 統合機能からアクティビティ項目のリストを取得します。アクティビティ項目UUID / 項目名 を認識できます。
- get-activity-log-list: 統合機能からアクティビティログのリストを取得します。すべてのログの終了日時が入力されている場合、現在何も実行していないことを意味します。終了日時がnullのものがある場合（最大で1つ）、現在その活動を実行中であることを意味します。アクティビティログUUID / 開始日時 / 終了日時 / 項目名 を認識できます。
- start-activity-log: アクティビティログを開始します。get-activity-log-listのすべてのendDateTimeに値がある場合、何も実行されていないため、start-activity-logを呼び出すことができます。
- complete-activity-log: アクティビティログを完了します。get-activity-log-listのendDateTimeにnullがある場合（つまり開始されているアクティビティがある場合）に使用できます。

```

## publish

```
npm run build
npm version patch
npm publish --access public
```
