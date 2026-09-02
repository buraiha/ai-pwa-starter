# Implementation Guide

1. taskと関連実装・テストを読む。
2. サンプルを残すか、アプリ固有実装へ置換するかを明示する。
3. 型、Dexieスキーマ、Repository、同期、API、UIの順に責務を保って変更する。
4. スキーマ変更時はDexieとSQLite双方の移行を設計する。
5. 必要なテストと文書を同じ変更で更新する。
6. 依存関係を変えた場合だけlockfileを更新する。
