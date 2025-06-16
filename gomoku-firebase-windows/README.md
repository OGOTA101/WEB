# 五目並べオンライン (Firebase版)

**完全無料**でホスティングできるFirebase Realtime Databaseを使用したオンライン五目並べゲームです。

## 🔥 Firebase版の特徴

- ✅ **完全無料**: Firebase無料枠内で運用可能
- ✅ **リアルタイム対戦**: Firebase Realtime Databaseによる瞬時同期
- ✅ **サーバーレス**: サーバー管理不要
- ✅ **世界中からアクセス**: Firebase CDNで高速配信
- ✅ **自動スケーリング**: アクセス数に応じて自動拡張

## 🚀 デプロイ手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例: `gomoku-online`）
4. Googleアナリティクスは不要なので無効化
5. 「プロジェクトを作成」をクリック

### 2. Firebase Realtime Databaseの有効化

1. Firebaseコンソールで「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. 場所を選択（asia-northeast1推奨）
4. セキュリティルールは「テストモード」を選択
5. 「有効にする」をクリック

### 3. Firebase Hostingの有効化

1. Firebaseコンソールで「Hosting」を選択
2. 「使ってみる」をクリック
3. 手順に従って設定

### 4. Firebase設定の取得

1. Firebaseコンソールで「プロジェクトの設定」（⚙️アイコン）をクリック
2. 「全般」タブの下部にある「アプリ」セクション
3. 「ウェブアプリを追加」をクリック
4. アプリ名を入力（例: `gomoku-web`）
5. Firebase Hostingも設定にチェック
6. 「アプリを登録」をクリック
7. **Firebase設定コード**をコピー

### 5. Firebase設定の適用

`firebase-script.js` ファイルの `firebaseConfig` オブジェクトを更新：

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 6. Firebase CLIのインストールとデプロイ

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトを初期化
firebase init

# デプロイ
firebase deploy
```

## 💰 Firebase無料枠

Firebase無料枠は非常に寛大です：

- **Realtime Database**: 1GB保存、100同時接続
- **Hosting**: 10GB保存、1GB/月転送量
- **月間課金**: 小規模〜中規模なら**完全無料**

## 🎮 ローカル開発

Firebase設定後、ローカルでテスト：

```bash
# Firebase開発サーバーを起動
firebase serve

# または
python3 -m http.server 8000
```

ブラウザで `http://localhost:5000` （Firebaseの場合）にアクセス

## 📁 ファイル構成

```
├── index.html              # メインHTML
├── style.css               # スタイルシート
├── firebase-script.js      # FirebaseクライアントJS
├── firebase.json           # Firebase設定
├── database.rules.json     # データベースルール
├── package.json            # プロジェクト設定
└── README.md               # このファイル
```

## 🛠 カスタマイズ

### データベース構造

```
firebase-database/
├── players/                # オンラインプレイヤー
│   └── player_id/
│       ├── id: string
│       ├── name: string
│       ├── inQueue: boolean
│       └── gameId: string
├── queue/                  # マッチングキュー
│   └── player_id/
│       ├── id: string
│       ├── name: string
│       └── timestamp: number
└── games/                  # 進行中のゲーム
    └── game_id/
        ├── players: array
        ├── board: array[15][15]
        ├── currentPlayer: number
        ├── blackPlayer: string
        ├── whitePlayer: string
        └── gameState: string
```

## 🔧 トラブルシューティング

### Firebase設定エラー
- `firebase-script.js`の`firebaseConfig`が正しく設定されているか確認
- FirebaseコンソールでRealtime Databaseが有効になっているか確認

### 接続エラー
- ブラウザの開発者ツールでエラーログを確認
- Firebaseプロジェクトの認証設定を確認

### デプロイエラー
- `firebase login`で正しくログインしているか確認
- プロジェクトIDが正しいか確認

## 📊 パフォーマンス

- **接続速度**: 瞬時接続（Firebase CDN）
- **レスポンス**: <100ms（リアルタイム同期）
- **同時プレイヤー**: 無料枠で100人まで

## 🌐 本番運用

デプロイ後のURLでワールドワイドアクセス可能：
- `https://your-project.web.app`
- カスタムドメインも設定可能

## ライセンス

MIT License 