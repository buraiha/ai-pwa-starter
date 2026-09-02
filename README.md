# AI PWA Starter

AIが新しいオフライン対応PWAを作るための、薄く実行可能なプロジェクトひな型です。Genpoで使った構成から、日報、工事、重機、写真、固定認証仕様などの業務要素を外しています。

これは依存ライブラリとして組み込むフレームワークではありません。新しいリポジトリへ複製し、サンプルNoteをアプリ固有のデータと画面へ置き換えて使います。

## 含まれるもの

- React + TypeScript + Vite
- vite-plugin-pwa + Workboxによるアプリシェルの事前キャッシュ
- Dexie + IndexedDBによる端末内保存
- Noteの作成、編集、削除、明示的同期の参照実装
- serverVersionを使った競合検出と、端末版・サーバー版の保持
- Node.js `node:sqlite` によるローカル同期API
- Vitest + fake-indexeddbとNode.js標準テスト
- rootless Podman向け開発環境とnonroot distroless実行イメージ
- AI向けProject Contract、task、設計・検証ガイド

## 意図的に含めないもの

- 本番用の認証・認可
- 実装済みマルチテナント
- アプリ固有のデータモデル、同期競合規則、添付ファイル制限
- HTTPS終端、バックアップ、監視、CI/CD、デプロイ先設定

サンプルAPIは認証されません。ローカル評価専用で、そのままインターネットへ公開しないでください。マルチテナント対応を追加するときは [`docs/multitenancy-blueprint.md`](docs/multitenancy-blueprint.md) を使用します。

## 起動

前提はNode.js 22と`pnpm@10.15.0`です。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

- PWA開発画面: `http://localhost:5173`
- SQLite API: `http://127.0.0.1:8080`
- SQLite: `data/app.sqlite`

Viteは`/api`をSQLite APIへ転送します。`pnpm dev`のService Workerは最終確認には使用せず、`pnpm build`後の成果物をlocalhostまたはHTTPSで確認してください。

## 検証

```sh
pnpm test
pnpm build
```

ビルド済みPWAの手動確認では、最初にオンラインで開き、Noteを端末へ保存してからオフラインへ切り替え、タブまたはPWAを閉じて再起動します。画面とNoteが復元され、オフライン編集できることを確認します。

## Podman

```sh
podman compose up --build
```

実行イメージは次で作成します。

```sh
podman build -t ai-pwa-starter .
podman run --rm -p 127.0.0.1:8080:8080 -v ai-pwa-starter-data:/data ai-pwa-starter
```

起動後は`http://127.0.0.1:8080/health`を確認します。データはイメージ内ではなく`/data/app.sqlite`へ保存します。

Podmanの既定OCI形式では、Containerfileの`HEALTHCHECK`宣言が無視される場合があります。`/health`自体は実装されていますが、運用時はQuadlet、Compose、監視サービスなど実際の起動方式でもヘルスチェックを設定してください。

## 新しいアプリにするとき

1. このディレクトリを新しいリポジトリへ複製する。
2. `.ai/tasks/`へ要求と受け入れ条件を書く。
3. [`docs/new-app-checklist.md`](docs/new-app-checklist.md)の設計判断を確定する。
4. `Note`、`NoteRepository`、Note API、`App.tsx`をアプリ固有の集約へ置き換える。
5. IndexedDBとSQLiteのスキーマ移行、同期・競合・削除規則を実装する。
6. 自動テスト、ビルド、localhost/HTTPSのオフライン再起動、必要な実機確認を行う。

サンプルを残したまま別機能を横へ増築するのではなく、不要なNote機能を型・DB・Repository・API・UI・テストから一貫して置換してください。

## 構成

```text
src/db/              IndexedDBスキーマ
src/repositories/    端末内データ操作
src/services/        同期など外部境界
server/              SQLite永続化
server.mjs           API、静的配信、health
.ai/                 AI向けProject Contract、task、ガイド
docs/                新アプリ設計チェックリストとテナント基盤仕様
```

詳細は [`docs/architecture.md`](docs/architecture.md) を参照してください。
