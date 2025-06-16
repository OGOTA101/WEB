# 五目並べオンライン（Firebase版）- Windows開発環境

## 🎮 完成品URL
https://gomoku-game-2024.web.app

## 📋 必要な環境

### 1. Node.js のインストール
1. [Node.js公式サイト](https://nodejs.org/)からLTS版をダウンロード
2. インストール実行
3. コマンドプロンプトで確認：
   ```
   node --version
   npm --version
   ```

### 2. Firebase CLI のインストール
```bash
npm install -g firebase-tools
```

### 3. Firebase認証
```bash
firebase login
```

## 🚀 開発環境のセットアップ

### 1. プロジェクトの初期化
```bash
npm install
```

### 2. ローカル開発サーバー起動
```bash
npm start
# または
firebase serve
```

### 3. デプロイ
```bash
npm run deploy
# または
firebase deploy --project=gomoku-game-2024
```

## 📁 ファイル構成

```
gomoku-firebase-windows/
├── index.html              # メインHTMLファイル
├── style.css               # スタイルシート
├── firebase-script.js      # Firebase連携JavaScript
├── firebase.json           # Firebase設定
├── database.rules.json     # Realtime Databaseルール
├── package.json            # Node.js依存関係
└── README-Windows.md       # このファイル
```

## 🔧 Firebase設定

現在のFirebaseプロジェクト：`gomoku-game-2024`

設定済み項目：
- ✅ Firebase Hosting
- ✅ Realtime Database
- ✅ セキュリティルール
- ✅ 自動デプロイ設定

## 🎯 主要機能

- リアルタイムマルチプレイヤーマッチング
- 15×15五目並べボード
- ターンタイマー（30秒）
- 降参機能
- レスポンシブデザイン
- 勝利判定システム

## 🐛 トラブルシューティング

### Firebase接続エラー
1. Firebase CLIが最新か確認
2. プロジェクトが正しく設定されているか確認
3. インターネット接続を確認

### ローカル開発で問題が発生
```bash
firebase serve --host 0.0.0.0 --port 5000
```

## 📞 サポート

このプロジェクトはMacからWindowsに移植されました。
何か問題があれば、コンソールログを確認してください。 