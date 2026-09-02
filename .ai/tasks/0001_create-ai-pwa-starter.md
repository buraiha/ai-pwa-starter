# AI向けPWAスターターを作成する

Status: completed

## 目的

Genpoで検証してきたPWA、IndexedDB、同期、SQLite、Podmanの構成から業務固有部分を外し、AIが新しいPWAを作る基盤を用意する。

## 期待結果

- サンプルNoteをオフラインで作成・編集・削除できる。
- 一度読み込んだビルド済みアプリをオフライン起動できる構成である。
- IndexedDBとSQLiteの間を明示的に同期できる。
- 競合時に端末の未送信内容を失わない。
- 自動テスト、PWAビルド、rootless/nonrootコンテナ構成がある。
- AIが新アプリへ置換する判断点と検証条件が文書化されている。

## 対象

- `ai-pwa-starter/` 配下の新規プロジェクト一式
- React/TypeScript/Vite、Dexie、PWA、Vitest、Node SQLite、Podman、distroless

## 対象外

- Genpo既存コードの変更
- 完成済みの認証・認可・マルチテナント
- 本番デプロイ、レジストリpush、Gitコミット
- 汎用ライブラリや独自DSLの作成

## 制約

- サンプルAPIは認証なしのローカル参照実装として明示する。
- 同期競合は楽観ロックで検出し、端末版とサーバー版の両方を保持する。
- Genpo固有の業務名、データ、認証仕様をコピーしない。

## 受け入れ条件

- `pnpm test` が成功する。
- `pnpm build` が成功しService WorkerとManifestが生成される。
- `podman build` が成功し、nonrootのdistroless Node.jsで起動できる構成である。
- READMEとProject Contractが現在の実装に一致する。
- Genpoの既存ファイルに変更がない。

## 実績

- `ai-pwa-starter/`を新設し、Genpo既存ファイルは変更しなかった。
- React/TypeScript/Vite、Dexie/IndexedDB、PWA/Workbox、Node SQLiteの実行可能なNoteサンプルを追加した。
- 端末保存、削除マーカー、楽観ロック、409競合保持、同期中の追加入力保護を実装した。
- rootless Podman開発構成と、UID 65532で動くdistroless Node.js実行イメージを追加した。
- AI向けProject Contract、ガイド、新アプリ設計チェックリストを追加した。
- 認証なしサンプルから再実装できるマルチテナント基盤仕様と変更箇所・必須テストを文書化した。

## 検証

- `pnpm install --frozen-lockfile`: 成功。`pnpm@10.15.0`とlockfileの整合を確認。
- `pnpm test`: 成功。クライアント7件、SQLiteサーバー3件。
- `pnpm build`: 成功。TypeScript、Vite、Manifest、Service Worker、10件のprecacheを生成。
- `podman build -t ai-pwa-starter:verification .`: 成功。ビルド中にも全テストとPWAビルドが成功。
- `podman compose config`: 成功。開発用ポート、bind mount、node_modules・SQLite用volumeを確認。
- `podman image inspect`: 実行ユーザーが`65532`であることを確認。
- 一時コンテナ: `/health`が200、PWAのHTML配信、SQLite保存、古いversionへの409を確認。検証コンテナと一時データボリュームは削除した。
- 一部未確認: ブラウザ開発者ツールまたはスマートフォンによる、完全終了後のオフライン再起動は未実施。
- 注意: Podman既定のOCI形式ではContainerfileの`HEALTHCHECK`宣言が無視される警告が出るため、`/health`のHTTP応答は手動確認し、運用時のヘルスチェック設定は利用する起動方式へ委ねる。
