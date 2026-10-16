# Calorie Inc. Game Base

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Implemented

- 開始国選択
- 7か国の接続マップ
- 自動進行シミュレーション
- 魔力バブル / 節目バブル / 研究妨害バブル
- 4系統スキルツリー
- JSON 駆動データ
- 瘦身魔法研究ゲージ
- 国ごとの対策段階（監視 / 節食令 / 浄化護符）
- 速度変更（1x / 2x / 4x）
- オートセーブ
- 勝敗判定
- かわいいアニメ調の初期アセット

## Data files

- `src/data.countries.json`
- `src/data.skills.json`
- `src/data.events.json`

## Core files

- `src/simulation.ts` — 進行計算
- `src/game-events.ts` — 節目イベント / バブル生成 / 世界イベント
- `src/App.tsx` — 画面と操作
- `src/types.ts` — 型定義

## Controls

- マウス: 国選択 / バブル回収 / スキル取得
- `Space`: 一時停止 / 再開
- `1`, `2`, `4`: 進行速度変更

## First-pass balance notes

- 序盤はバブル回収で MP を得る
- 中盤は拡散 / 肉付き / 偽装の配分が必要
- 実肥満度が深く進むと、偽装していても研究は開始される
- ただし現状は初回バランスで、プレイテストを通じて数値調整を続ける前提

## Dev helpers

```bash
npm run balance:check
npm run balance:scenarios
```
