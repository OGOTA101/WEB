# 🐱 ねこもくならべオンライン Windows版セットアップガイド

このガイドは、Windows環境で「ねこもくならべオンライン」をセットアップして、Firebase上にデプロイするための手順を説明します。

## 前提条件

- Windows 10/11
- インターネット接続
- Googleアカウント（Firebase用）

## 🚀 クイックスタート

### 1. Node.jsのインストール

1. [Node.js公式サイト](https://nodejs.org/)にアクセス
2. LTS版（推奨版）をダウンロード
3. インストーラーを実行し、デフォルト設定でインストール
4. PowerShellまたはコマンドプロンプトを開いて確認：
```cmd
   node --version
   npm --version
   ```

### 2. Firebase CLIのインストール

PowerShellまたはコマンドプロンプトで：
```cmd
npm install -g firebase-tools
```

### 3. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名：`nekomoku-narabage-game`（またはお好みの名前）
4. Googleアナリティクスは「無効」を選択
5. 「プロジェクトを作成」をクリック

### 4. Realtime Databaseの有効化

1. Firebaseコンソールで「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. 場所：「asia-northeast1（東京）」を選択
4. セキュリティルール：「テストモードで開始」を選択

### 5. Firebase Hostingの有効化

1. Firebaseコンソールで「Hosting」を選択
2. 「使ってみる」をクリック

### 6. Firebase設定の取得

1. Firebaseコンソールで ⚙️（設定）→「プロジェクトの設定」
2. 「全般」タブ → 「マイアプリ」セクション
3. 「ウェブアプリを追加」をクリック
4. アプリ名：`nekomoku-narabage-web`
5. 「Firebase Hostingも設定する」にチェック
6. 「アプリを登録」をクリック
7. **設定コードをコピー**

### 7. プロジェクトファイルの設定

1. このフォルダで `firebase-script.js` を開く
2. `firebaseConfig` オブジェクトを先ほどコピーした設定に置き換え：

```javascript
const firebaseConfig = {
    apiKey: "あなたのAPIキー",
    authDomain: "nekomoku-narabage-game.firebaseapp.com",
    databaseURL: "https://nekomoku-narabage-game-default-rtdb.firebaseio.com",
    projectId: "nekomoku-narabage-game",
    storageBucket: "nekomoku-narabage-game.firebasestorage.app",
    messagingSenderId: "あなたのメッセージSenderID",
    appId: "あなたのアプリID"
};
```

### 8. Firebase初期化とデプロイ

PowerShellでこのフォルダに移動し：

```cmd
# Firebaseにログイン
firebase login

# プロジェクトを初期化
firebase init

# 以下の設定を選択：
# - Hosting: Configure files for Firebase Hosting
# - Use an existing project: nekomoku-narabage-game
# - Public directory: . (ドット)
# - Single-page app: No
# - GitHub自動デプロイ: No

# デプロイ実行
firebase deploy
```

## 🎮 ローカルテスト

デプロイ前にローカルでテスト：

```cmd
# Firebase開発サーバー起動
firebase serve

# または、シンプルなHTTPサーバー
python -m http.server 8000
```

ブラウザで `http://localhost:5000` にアクセス

## 🛠 トラブルシューティング

### Firebase CLI インストールエラー
```cmd
# 権限エラーの場合、PowerShellを管理者として実行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g firebase-tools
```

### 接続エラー
- Firebaseコンソールでプロジェクト設定を再確認
- `firebase-script.js`の設定が正しいか確認
- ブラウザの開発者ツールでエラーログを確認

### デプロイエラー
```cmd
# 現在のプロジェクトを確認
firebase projects:list

# プロジェクトを切り替え
firebase use nekomoku-narabage-game
```

## 🌐 本番環境

デプロイ成功後、以下のURLでゲームにアクセス可能：
- `https://nekomoku-narabage-game.web.app`
- または `https://nekomoku-narabage-game.firebaseapp.com`

## 📱 カスタムドメイン（オプション）

独自ドメインを使用したい場合：
1. Firebaseコンソール → Hosting → ドメインを追加
2. DNS設定を行う（提供されるCNAMEレコードを設定）

---

🐱 **Happy Nekomoku Narabage Gaming!** 🐱

質問やトラブルがあれば、Firebase公式ドキュメントをご確認ください。
