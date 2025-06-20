# ソリティア オンライン (Firebase版)

クロンダイク・ソリティアのオンライン版です。Firebase Realtime Databaseを使用して統計データを保存し、美しいUIでクラシックなカードゲームを楽しめます。

## 🎮 ゲーム機能

### 🃏 **ゲームプレイ**
- **クロンダイク・ソリティア**: 最も人気のあるソリティアバリエーション
- **2つの難易度**: 初心者モード（1枚めくり）と上級者モード（3枚めくり）
- **ドラッグ&ドロップ**: 直感的なカード操作
- **自動勝利判定**: 全ての基礎札が完成すると自動的にゲーム終了

### 🎯 **ゲーム機能**
- **元に戻す機能**: 最大10手まで戻すことが可能
- **ヒント機能**: 次に打てる手をアドバイス
- **スコアシステム**: 時間とパフォーマンスに基づくスコア計算
- **リアルタイムタイマー**: プレイ時間の表示

### 📊 **統計機能**
- **総ゲーム数**: プレイした回数を記録
- **勝利数と勝率**: 成功率の追跡
- **最高スコア**: ベストパフォーマンスの記録
- **最短時間**: 最速クリア時間
- **平均時間**: 平均プレイ時間の計算

## 🚀 **技術仕様**

### **フロントエンド**
- **HTML5**: セマンティックマークアップ
- **CSS3**: モダンなグラデーションとアニメーション
- **JavaScript (ES6+)**: クラスベースの設計
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

### **バックエンド**
- **Firebase Realtime Database**: リアルタイムデータ同期
- **Firebase Hosting**: 高速なWebホスティング
- **LocalStorage**: ローカル統計データの保存

### **ゲームロジック**
- **完全なソリティアルール実装**
- **カードシャッフルアルゴリズム**
- **ドラッグ&ドロップAPI**
- **タッチデバイス対応**

## 🎨 **UI/UX特徴**

### **デザイン**
- **緑のグラデーション背景**: カジノテーブルを模したデザイン
- **美しいカードデザイン**: クラシックなトランプカード
- **スムーズなアニメーション**: カード移動とホバー効果
- **直感的なインターフェース**: 分かりやすいボタンとレイアウト

### **レスポンシブ対応**
- **モバイル最適化**: タッチ操作とサイズ調整
- **タブレット対応**: 中間サイズでの最適表示
- **デスクトップ**: フル機能での快適なプレイ

## 📱 **対応デバイス**

- **デスクトップ**: Windows, macOS, Linux
- **モバイル**: iOS Safari, Android Chrome
- **タブレット**: iPad, Android タブレット
- **ブラウザ**: Chrome, Firefox, Safari, Edge

## 🎯 **ゲームルール**

### **目標**
4つの基礎札（ハート、ダイヤ、クラブ、スペード）にA〜Kまでを順番に積み上げる

### **基本ルール**
1. **タブロー**: 7列に配られたカードを操作
2. **基礎札**: 各スートのA〜Kを順番に積む
3. **山札**: 残りのカードから1枚または3枚ずつめくる
4. **移動ルール**: 
   - タブロー: 異なる色で数字が1つ小さいカードの上に置く
   - 基礎札: 同じスートで数字が1つ大きいカードを置く

## 🔧 **開発・デプロイ**

### **ローカル開発**
```bash
# プロジェクトクローン
git clone [repository-url]
cd solitaire-firebase

# ローカルサーバー起動
python3 -m http.server 8000
# または
npx serve .
```

### **Firebase デプロイ**
```bash
# Firebase CLI インストール
npm install -g firebase-tools

# Firebase ログイン
firebase login

# プロジェクト初期化
firebase init

# デプロイ
firebase deploy
```

## 📈 **スコアシステム**

- **基礎札配置**: +10点/カード
- **時間ボーナス**: 早くクリアするほど高得点
- **最大スコア**: 理論上の最高点は約1520点

## 🎮 **操作方法**

### **マウス操作**
- **クリック**: カード選択
- **ドラッグ&ドロップ**: カード移動
- **山札クリック**: カードをめくる

### **タッチ操作**
- **タップ**: カード選択
- **ドラッグ**: カード移動
- **山札タップ**: カードをめくる

## 🔒 **プライバシー**

- **ローカルストレージ**: 統計データはブラウザに保存
- **Firebase**: 匿名での使用、個人情報は収集しません
- **セキュア**: HTTPS通信で安全

## 🆕 **今後の予定**

- [ ] マルチプレイヤー対戦モード
- [ ] 他のソリティアバリエーション（スパイダー、フリーセルなど）
- [ ] アチーブメントシステム
- [ ] カスタムカードデザイン
- [ ] サウンドエフェクト

## 📞 **サポート**

問題や提案がある場合は、GitHubのIssuesページでお知らせください。

---

**楽しいソリティアライフを！** 🎉 