# 実装計画

## Phase 0 仕様と骨組み

- 仕様書を作る。
- フォルダ構成を作る。
- カード24枚とFirebase通信方針を決める。
- Codexに必要そうな補助スキルを入れる。

現在はここまで。

## Phase 1 フロントエンド土台

- Vite + TypeScriptを初期化する。
- Canvas盤面を表示する。
- 30x30の座標変換、ズーム、パンを入れる。
- DOMのタイトル、待機、対戦、結果画面を作る。
- ローカルだけで石を置ける状態にする。

## Phase 2 ルールエンジン

- 盤面データ構造を作る。
- 縦、横、斜めの7連勝利判定を作る。
- ターン進行を作る。
- 通常着手の合法判定を作る。
- ユニットテストを追加する。

## Phase 3 カードとデッキ

- カード定義24枚をデータ化する。
- カード効果を純粋関数として実装する。
- デッキ編集画面を作る。
- 試合中のカード使用UIを作る。
- カード効果のユニットテストを追加する。

## Phase 4 CPU

- Easyを実装する。
- Normalのスコアリングを実装する。
- Hardの候補セル探索と先読みを実装する。
- Web Workerに移してUI停止を防ぐ。

## Phase 5 Firebase対戦

- Firebase設定を追加する。
- Anonymous Authを入れる。
- Firestore購読を入れる。
- Cloud FunctionsでcreateRoom、joinRoom、startGame、submitTurnを作る。
- Emulator Suiteで2ブラウザ対戦を確認する。

## Phase 6 ガチャと所持カード

- cardCatalogを固定データ化する。
- rollGacha Functionを実装する。
- inventoryとdecksをFirestoreに保存する。
- 10連保証を入れる。

## Phase 7 仕上げ

- UIを磨く。
- スマホ表示を調整する。
- 効果音を入れる。
- Playwrightで主要導線を確認する。
- Firebase Hostingへデプロイする。

## 最初の実装優先順位

1. ローカル2人対戦で30x30盤面と7連判定を動かす。
2. カードなしCPU Easyを動かす。
3. カードを通常カードから順番に入れる。
4. Firestore同期に載せる。
5. Functions検証に移す。
6. 強カード、最強カード、ガチャを入れる。

最初からオンラインとカードを全部同時に作ると原因切り分けが難しくなるため、ローカルルール、UI、Firebaseの順に固める。
