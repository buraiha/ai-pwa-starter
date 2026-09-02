# 開発環境に残ったService Workerを解除する

Status: completed

## 目的

8080番で以前登録されたService Workerが修正前のアプリシェルを返し続け、同期時の`Window.fetch`エラーが残る状態を解消する。

## 期待結果

- 開発サーバーの`/sw.js`が古いService Workerを更新・解除できるJavaScriptを返す。
- 開発版コードが読み込まれた場合も、残存するService Workerを解除する。
- 本番ビルドでは通常のWorkbox Service Worker登録とオフライン起動を維持する。

## 制約

- IndexedDBとSQLiteデータを削除・変更しない。
- 開発時に削除するのは同一オリジンのアプリシェル用Cache Storageだけとする。
- 同期API、同期順序、競合規則を変更しない。

## 実績・検証

- 調査時点で、開発サーバーの`/sw.js`がViteのHTMLフォールバックを返していた。
- 開発サーバーの`/sw.js`で、即時有効化、Cache Storage削除、Service Worker解除、クライアント再読込を行うようにした。
- 開発版のエントリーポイントでも、同一オリジンに残ったService Workerを解除するようにした。
- `GET http://127.0.0.1:8080/sw.js`: `application/javascript`、`no-store`で解除スクリプトが返ることを確認した。
- `GET http://127.0.0.1:8080/api/notes`: SQLite APIの200応答を確認した。
- `podman build -t ai-pwa-starter:stale-sw-fix-check .`: 成功。
- クライアント8件、SQLiteサーバー3件のテストが成功した。
- TypeScriptの型チェックと本番PWAビルドが成功し、通常のWorkbox Service Workerと10件のprecacheが生成された。
- 接続したChromeで`http://localhost:8080`を開き、同期が`送信0、受信2、競合0、失敗0`で完了し、コンソールエラーがないことを確認した。
- 同じタブでService Worker登録0件、制御中Workerなし、Cache Storage 0件を確認した。
- 未確認: インストール済みPWAの独立ウィンドウがChrome拡張の操作対象に現れない場合、そのウィンドウ内の状態は未確認。
