# Nanamoku Firebase

30x30の細かい盤面で最大7人が対戦する、カードスキル付きの変則7目並べです。

このフォルダは、Vite + TypeScript、Canvas盤面、DOMベースのHUDで実装しています。現在はCPU対戦、カード、デッキ編成まで遊べるローカル版が入っています。Firebase Hosting向けの設定も追加済みで、オンライン同期は次フェーズでCloud FirestoreとCloud Functionsへ載せる想定です。

## 起動

```bash
npm install
npm run dev
```

ローカルURLは通常 `http://127.0.0.1:5179` です。

## 今ある資料

- [ゲーム仕様](docs/SPEC.md)
- [カード仕様](docs/CARDS.md)
- [Firebase通信設計](docs/FIREBASE_SCHEMA.md)
- [フォルダ構成](docs/FOLDER_STRUCTURE.md)
- [実装計画](docs/IMPLEMENTATION_PLAN.md)
- [Codexスキル導入メモ](docs/CODEX_SKILLS.md)

## ゲームの仮タイトル

仮名は「ナナモク」です。正式タイトルは後で変更できます。

## 大きな方針

- 2人対戦では黒と白を使い、3人目以降は赤、青、緑、紫、金系の色を追加する。
- 30x30の盤面で、縦、横、斜めのいずれかに自分の石を7個以上連続させると勝利する。
- 各プレイヤーは7枚のデッキを持ち込む。
- デッキ構成は通常カード4枚、強カード2枚、最強カード1枚。
- カードは自分のターンの通常着手前に、自分の石をコストとして除去して発動する。
- CPUは3段階の難易度を持つ。
- オンライン対戦はFirebase経由で、最大7人まで同じ部屋に参加できる。

## 実装済み

- CPU対戦 Easy / Normal / Hard
- 30x30盤面と7連勝利判定
- 通常12枚、強8枚、最強4枚のカード定義と発動処理
- デフォルトデッキ
- デッキ編成画面
- 盤面演出、カード演出、ログ表示
- Firebase Hosting / Firestore Rules の初期設定
