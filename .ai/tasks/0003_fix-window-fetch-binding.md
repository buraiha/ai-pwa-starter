# Window.fetchの呼び出しコンテキストを修正する

Status: completed

## 目的

ブラウザで同期したときに`Can only call Window.fetch on instances of Window`となり、SQLiteサーバーへ送受信できない不具合を修正する。

## 期待結果

- 標準の`Window.fetch`を使う同期が正しいWindowコンテキストで呼ばれる。
- テストから注入するfetch互換関数の挙動を維持する。
- 同期、競合、未送信データ保護の既存テストが通る。

## 制約

- API、SQLite、同期順序、競合規則を変更しない。
- 依存関係を追加しない。
- ブラウザの既存IndexedDBデータを変更・削除しない。

## 実績・検証

- `SyncService`の標準fetchをラッパー内で`globalThis.fetch(...args)`として呼び、`this.request(...)`によってWindowのコンテキストを失わないようにした。
- Window以外の`this`で例外を返すfetchを使った回帰テストを追加し、Windowのメソッドとして送信・受信の両方が成功することを確認した。
- `podman build -t ai-pwa-starter:fetch-wrapper-check .`: 成功。
- クライアント8件、SQLiteサーバー3件のテストが成功した。
- TypeScriptの型チェック、Vite/PWAビルド、Manifest、Service Worker、10件のprecache生成が成功した。
- 8080番のViteがラッパー版コードを配信していることを確認し、既存データボリュームを保持して開発コンテナを再起動した。
- 後続task 0005で接続したChromeから同期を再実行し、エラーなく完了することを確認した。
