# ナンバーリンク オンライン (Firebase版)

**完全無料**でホスティングできるFirebase Realtime Databaseを使用したオンライン協力型数字推理ゲームです。

## 🎮 ゲーム特徴

- ✅ **2-20人対応**: 少人数から大人数まで楽しめる
- ✅ **リアルタイム対戦**: Firebase Realtime Databaseによる瞬時同期
- ✅ **ルームシステム**: 6桁コードで簡単にルーム作成・参加
- ✅ **テーマシステム**: 20種類のプリセット + 自由入力
- ✅ **レベル制**: レベル1-3の段階的な難易度
- ✅ **ライフシステム**: 緊張感のある協力プレイ
- ✅ **ゲームログ**: リアルタイムでプレイヤーの行動を表示

## 🎯 ゲームルール

### 基本ルール
1. 各プレイヤーに1-100の数字カードが1枚配られる
2. テーマに沿って、自分のカードを説明する（数字は見せない）
3. 全員で協力して、カードを小さい順に出すことを目指す
4. レベルが上がるごとに難易度が上昇
5. ミスをするとライフが減る
6. ライフが0になるとゲームオーバー

### レベル制
- **レベル1**: ライフ3、カード枚数少なめ
- **レベル2**: ライフ2、カード枚数増加
- **レベル3**: ライフ1、全員のカードで勝負

## 🚀 デプロイ手順

### 1. Firebaseプロジェクトの作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例: `numberlink-online`）

### 2. Firebase Realtime Databaseの有効化
1. Firebaseコンソールで「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールは「テストモード」を選択

### 3. Firebase設定の取得
Firebaseコンソールで設定を取得し、`game-script.js` の `firebaseConfig` を更新してください。

### 4. デプロイ
```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

## 💰 Firebase無料枠

- **Realtime Database**: 1GB保存、100同時接続
- **Hosting**: 10GB保存、1GB/月転送量

## 📁 ファイル構成

```
├── index.html           # メインHTML
├── style.css            # スタイルシート
├── game-script.js       # ゲームロジック
├── firebase.json        # Firebase設定
├── database.rules.json  # データベースルール
└── README.md            # このファイル
```

## ライセンス

MIT License

