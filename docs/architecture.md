# Architecture

## 責務

```text
React UI
  ↓ Repositoryだけを呼ぶ
Dexie / IndexedDB
  ↓ 明示的な同期
Node.js API
  ↓ トランザクション
SQLite
```

Service WorkerはJavaScript、CSS、HTMLなどのアプリシェルをキャッシュします。Noteなどの利用者データはキャッシュへ入れず、IndexedDBへ保存します。

## 端末保存

`NoteRepository`が端末保存の境界です。UIはDexieテーブルを直接操作しません。新規・編集は`pending`、送信失敗は`failed`、競合は`conflict`、同期済みは`synced`として保存します。

同期済みNoteの削除は、直ちに消さず`deletedAt`を持つ削除マーカーにします。未同期の新規Noteはサーバーに存在しないため物理削除します。新しいアプリでは、関連データを含めて同一トランザクションにする必要があります。

## 同期と競合

サーバーはNoteごとに単調増加する`version`を持ちます。端末は最後に受信した値を`serverVersion`として送ります。

```text
baseVersion == 現在のversion  → 保存しversionを増やす
baseVersion != 現在のversion  → HTTP 409と現在のサーバー版
```

409の場合、Repositoryは端末版を上書きせず`conflict`にサーバー版を保持します。サンプルUIでは、利用者がサーバー版を採用するか、現在のversionを基に端末版を再送するか選びます。この選択は汎用解ではないため、実アプリでは業務要件として確定してください。

送信開始後に端末で追加入力された場合、古い応答の`updatedAt`が現在値と一致しないため`synced`へ変更しません。

## サーバー

Node.jsは同一オリジンで、ビルド済みPWA、`/api/notes`、`/api/notes/sync`、`/health`を配信します。SQLite更新は`BEGIN IMMEDIATE`から`COMMIT`までを1トランザクションにします。

サンプルには認証がありません。新しいアプリを公開する前に、[`multitenancy-blueprint.md`](multitenancy-blueprint.md)またはアプリ固有の認証・認可設計を実装します。

## コンテナ

ビルド段階はNode.js Alpineで依存導入、テスト、Viteビルドを行います。実行段階はdistroless Node.jsのnonrootイメージへ、ビルド成果物とサーバーだけをコピーします。SQLiteは`/data`の永続ボリュームへ置きます。
