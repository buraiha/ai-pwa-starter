# Composeの公開ポートを8080へ変更する

Status: completed

## 目的

Podmanの5173番ポート転送競合を避け、Composeで起動した開発PWAをホストの8080番から利用できるようにする。

## 期待結果

- `podman compose up --build`後に`http://localhost:8080`でPWAへアクセスできる。
- コンテナ内のVite 5173番とSQLite API 8080番の構成は維持する。
- `/api`のViteプロキシを通じた同期を維持する。

## 制約

- SQLiteボリュームやIndexedDBを削除しない。
- API、同期、競合解決の実装を変更しない。
- `PWA_DEV_PORT`によるホスト側ポートの上書きを維持する。

## 実績・検証

- Composeの既定公開ポートをホスト`8080`からコンテナ内Vite`5173`への転送へ変更した。
- READMEの開発画面URLを`http://localhost:8080`へ更新した。
- `podman compose config`: 成功。`published: 8080`、`target: 5173`を確認した。
- 変更前にホスト8080番が未使用であることを確認した。
- `podman compose up --build -d`: 成功。既存volumeを削除せずコンテナを再作成した。
- `podman compose ps`: `0.0.0.0:8080->5173/tcp`で起動中であることを確認した。
- `GET http://127.0.0.1:8080/`: ViteのPWA HTMLを取得できた。
- `GET http://127.0.0.1:8080/api/notes`: Viteプロキシ経由でSQLite APIの200応答を取得できた。
