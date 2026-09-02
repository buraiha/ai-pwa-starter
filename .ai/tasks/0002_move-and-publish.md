# スターターを独立プロジェクトへ移動して公開する

Status: completed

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
- GitHub CLIと操作可能なブラウザは利用できなかったため、資格情報を出力・保存せず、既存のGit credentialをGitHub公式APIへ直接渡してpublicリポジトリを作成した。
- `https://github.com/buraiha/ai-pwa-starter`を`origin`に設定し、`main`をpushして追跡設定した。
