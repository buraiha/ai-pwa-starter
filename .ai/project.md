# Project Contract

## 1. Project Overview

- 概要: AIが新しいオフライン対応PWAを作るための実行可能な薄いスターター
- 参照機能: Noteの端末保存、明示的同期、競合保持、PWAオフライン起動
- 主な技術: React、TypeScript、Vite、Dexie/IndexedDB、vite-plugin-pwa/Workbox、Vitest/fake-indexeddb、Node.js SQLite、rootless Podman、distroless Node.js
- 非対象: 汎用業務フレームワーク、完成済み認証、マルチテナント、アプリ固有の同期規則

## 2. Repository Boundaries

- `src/db/`: Dexieスキーマ
- `src/repositories/`: 端末データ操作とトランザクション境界
- `src/services/`: 同期などブラウザ外部との境界
- `src/App.tsx`: サンプルUI。業務アプリ作成時の主な置換対象
- `server/`: SQLiteスキーマと永続化
- `server.mjs`: 同一オリジンの静的配信、サンプルAPI、`/health`
- `vite.config.ts`: PWA、Service Worker、開発APIプロキシ、Vitest
- `Containerfile*`、`compose.yaml`: rootless Podman向け開発・実行環境
- `dist/`、`*.tsbuildinfo`、`data/` は生成物またはローカルデータであり手編集・コミットしない

## 3. Development Environment and Commands

- Node.js 22、`pnpm@10.15.0`
- セットアップ: `pnpm install`
- 開発: `pnpm dev`
- テスト: `pnpm test`
- 型チェック・PWAビルド: `pnpm build`
- 開発コンテナ: `podman compose up --build`
- 実行イメージ: `podman build -t ai-pwa-starter .`

## 4. Invariants and Compatibility

- 「オフライン起動」はService Worker、「端末データ保持」はIndexedDBが担う。
- UIはDexieを直接操作しない。
- 未送信、送信失敗、競合中の端末データをサーバー受信で上書きしない。
- Noteサンプルは認証なし・単一利用者の参照実装であり、公開前にアプリ固有の認証認可へ置き換える。
- SQLiteは `/data/app.sqlite` に置き、コンテナの永続ボリュームを使用する。
- Service Workerの実機検証にはHTTPSまたはlocalhostを使用する。

## 5. Validation Contract

| 変更種別 | 必須検証 | 追加確認 |
| --- | --- | --- |
| React/TypeScript | `pnpm test`、`pnpm build` | 対象画面の手動確認 |
| Dexie/Repository | `pnpm test`、`pnpm build` | 失敗・競合・スキーマ互換性 |
| PWA/Service Worker | `pnpm test`、`pnpm build` | ビルド配信をlocalhost/HTTPSでオンライン後にオフライン再起動 |
| Server/SQLite | `pnpm test`、`pnpm build` | `/health`、保存、競合、永続化 |
| Containerfile | 上記と `podman build` | nonroot起動、`/health`、永続ボリューム |
| 文書のみ | `git diff --check` | 実装・設定との整合 |

## 6. Protected Data and Files

- ブラウザのIndexedDB、`data/`、Podmanボリュームを明示的な依頼なしに削除しない。
- パスワード、Cookie、トークン、秘密鍵、実データをソース、fixture、ログへ含めない。

## 7. External and Production Boundaries

- サンプルAPIに認証認可はない。ローカル評価用であり、そのまま公開しない。
- 公開前に認証、認可、テナント境界、CSRF、レート制限、バックアップ、HTTPS、監視をアプリ要件に合わせて設計する。
- 明示的な依頼なしにレジストリpush、deploy、公開設定変更を行わない。
