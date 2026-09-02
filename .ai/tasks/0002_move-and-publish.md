# スターターを独立プロジェクトへ移動して公開する

Status: partial

## 目的

Genpo配下に作成したAI PWA Starterを、独立したプロジェクトとして`/Users/takashi/mydev/ai-pwa-starter`へ移し、Gitで履歴管理してGitHubへpublic公開する。

## 期待結果

- スターター一式が指定先にあり、Genpo側に重複が残らない。
- 移動後のソースでテスト、PWAビルド、差分確認が成功する。
- 秘密情報や生成物を含めず、日本語コミットが作成される。
- GitHubのpublicリポジトリへpushされ、ローカルと公開内容が一致する。

## 制約

- Genpoの既存ファイルを変更しない。
- 認証なしサンプルAPIを本番サービスとしてデプロイしない。
- GitHub公開前に全追跡候補と秘密情報を確認する。

## 実績・検証

- `/Users/takashi/mydev/ai-pwa-starter`へ全ファイルを移動し、Genpo側に重複がないことを確認した。
- 独立したGitリポジトリを`main`ブランチで初期化した。
- 移動後の`podman build -t ai-pwa-starter:publish-check .`内で、クライアント7件・サーバー3件のテストとPWAビルドが成功した。
- `podman compose config`が成功した。
- 公開候補に秘密鍵、代表的なGitHub/AWS/Google/Slackトークン形式、`.env`、SQLite、`node_modules`、`dist`、`tsbuildinfo`がないことを確認した。
- GitHub上の`buraiha/ai-pwa-starter`は404で、同名リポジトリがまだ存在しないことを確認した。
- 未完了: ローカルにGitHub CLIがなく、操作可能なブラウザとリポジトリ作成APIも利用できなかったため、GitHub publicリポジトリの作成とpushは未実施。
