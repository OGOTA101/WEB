# Firebase セットアップ状況

## 現在の状態

- Firebase CLI 15.26.0 を確認済み
- `ogotama@gmail.com` でログイン済み
- Hosting 用の設定は [`firebase.json`](../firebase.json) に作成済み
- 新規プロジェクトID `magic-roulette-20260812` の作成を試行
- Google Cloud 側から「プロジェクト作成 quota を超過している」と返り、新規登録は保留
- 新規プロジェクトが作成されなかったため、既存プロジェクトへの無断デプロイはしていない

## 新規プロジェクト作成後の手順

```powershell
npx -y firebase-tools@latest use --add
npm run build
npx -y firebase-tools@latest deploy --only hosting
```

`use --add` では、今回のゲーム用に新しく作成したFirebaseプロジェクトIDを選択する。既存ゲームのプロジェクトを選ばない。
