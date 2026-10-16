# フォルダ構成

## ルート

```text
nanamoku-firebase/
  docs/
  firebase/
  functions/
  public/
  scripts/
  src/
  tests/
```

## docs

仕様書と設計資料を置く。

| ファイル | 役割 |
| --- | --- |
| SPEC.md | ゲーム全体の仕様 |
| CARDS.md | カード24枚とガチャ案 |
| FIREBASE_SCHEMA.md | Firestore、Functions、同期方針 |
| FOLDER_STRUCTURE.md | このフォルダ説明 |
| IMPLEMENTATION_PLAN.md | 実装順序 |
| CODEX_SKILLS.md | 導入済み、利用予定スキル |

## src

フロントエンド実装を置く。ゲーム状態は描画と分離する。

```text
src/
  app/
  firebase/
  game/
    ai/
    board/
    cards/
    deck/
    rules/
    turns/
  rendering/
  styles/
  types/
  ui/
    components/
    screens/
  workers/
```

| フォルダ | 役割 |
| --- | --- |
| app | アプリ起動、ルーティング、画面状態 |
| firebase | Firebase初期化、購読、Functions呼び出し |
| game/board | 30x30盤面、座標、セル操作 |
| game/rules | 勝利判定、合法手判定 |
| game/cards | カード定義、カード効果 |
| game/deck | デッキ構築、所持カード、ガチャ用データ |
| game/turns | ターン解決、行動ログ |
| game/ai | CPU思考 |
| rendering | Canvas描画、盤面カメラ、ズーム、パン |
| ui | DOM UI、画面、HUD、カード表示 |
| workers | CPU思考など重い処理 |
| types | 共通型定義 |

## functions

Firebase Cloud Functionsを置く。対戦の確定処理とガチャ抽選を担当する。

```text
functions/
  src/
```

初期実装では、フロントエンドと同じルール関数を共有できるように、純粋なルール処理をパッケージ化する。

## firebase

Firestoreルール、インデックス、エミュレータ設定の元資料を置く。

本格実装時にはルートに `firebase.json`、`firestore.rules`、`firestore.indexes.json` を追加する。

## public

Firebase Hostingで配信する静的アセットを置く。

```text
public/
  assets/
    icons/
    images/
    sfx/
```

## tests

```text
tests/
  unit/
  playwright/
```

unitには勝利判定、カード効果、CPU評価のテストを置く。playwrightにはブラウザ上の動作確認を置く。
