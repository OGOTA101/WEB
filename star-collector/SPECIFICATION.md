# 仕様書: 星空さんぽ (Starry Sanpo) - 完全版仕様書

本文書は、アプリケーションの現在の実装状態（JavaScriptコードベース）を正確に反映した、開発者およびデザイナー向けの完全なリファレンスである。

## 1. プロジェクト概要

### コンセプト
**「眠れない夜は、星を集めて。」**
プレイヤーは猫となり、夜空を見上げて落ちてくる星々を集める。数値を競うよりも、心地よいビジュアルと環境音に浸ることを目的としたリラクゼーション・カジュアルゲーム。

### ターゲットプラットフォーム
- **Webブラウザ** (Mobile First, PC Compatible)
- **Viewport**: 9:16 (縦長) 固定。PCでは左右に黒帯を表示。

---

## 2. ゲームメカニクス (Game Mechanics)

### コア・ゲームループ
1.  **Spawn**: 難易度テーブルに基づき、一定間隔で「星 (`StarEntity`)」を生成。
2.  **Input**: ユーザーが画面をタップ/クリック。
3.  **Hit Detection**: タップ座標と星の座標を照合。
4.  **Result**:
    - **Hit**: スコア加算、効果音再生、エフェクト発生、星の消滅。
    - **Miss**: 星の無い場所をタップした場合、スタミナ減少。
5.  **GameOver**: スタミナが0になるとゲーム終了。リザルト画面へ。

### パラメータ計算式 (Math Model)

#### 1. 速度倍率 (Speed Multiplier)
ユーザーが選択したモードにより、ゲーム全体の速度が決定される。
- **Slow (ゆっくり)**: `0.5`
- **Normal (ふつう)**: `1.0`
- **Fast (はやい)**: `1.5`

#### 2. 星の生成 (Spawning)
- **Spawn Interval (ms)**: `BaseSpawnRate / SpeedMultiplier`
- **Movement Speed**: `BaseMoveSpeed * SpeedMultiplier`
- **Life Time (ms)**: `(BaseLifeTime * 3) + Stat_LifeAdd`
    - ※ 実装上、`BaseLifeTime` は難易度定義の値をそのまま使用せず、3倍されている箇所がある点に注意。

#### 3. 判定ロジック (Hit Detection)
タップ座標 `(tx, ty)` と星の座標 `(sx, sy)` の距離 `dist` を計算。
- **Hit Radius**: `Math.max(25, StarSize * 1.5) * Stat_HitScale`
  - 最低保証半径: 25px
  - 基本判定: 星の描画サイズの1.5倍
  - 補正: アイテム効果の `hitScale` (通常1.0) を乗算
- **判定**: `dist < HitRadius` であればヒット。

#### 4. スコア計算 (Scoring)
```javascript
Point = (Base(1) + RarityBonus + Stat_ScoreAdd) * Stat_ScoreMult
```
- **Base**: 1点
- **RarityBonus**:
  - Normal (0): +0
  - Uncommon (1): +1
  - Rare (2): +2
  - Epic (3): +3
  - Legend (4): +5 (定義のみ、通常出現なし)
- **Stat_ScoreAdd**: アイテムによる加算
- **Stat_ScoreMult**: アイテムによる乗算 (端数切り捨て)

#### 5. スタミナ (Stamina)
- **MaxStamina**: `100 + Stat_StaminaAdd`
- **Miss Cost**: `-10` (固定)
- **Recovery**: アイテム効果 `luckyHeal` (確率で+1回復)

---

## 3. データテーブル (Data Tables)

### A. 難易度テーブル (Difficulty Table)
コンボ数に応じて段階的に難易度が上昇する。

| Level | MaxCombo | SpawnRate(ms) | LifeTime(ms) | Type | Size | RareChance | Desc |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 0 | 9 | 800 | 3000 | static | 18 | 0.0 | Intro |
| 1 | 29 | 700 | 2500 | static | 16 | 0.05 | Wake up |
| 2 | 59 | 600 | 2000 | static | 14 | 0.1 | Normal |
| 3 | 89 | 550 | 1500 | static | 13 | 0.2 | Fast |
| 4 | 119 | 500 | 1200 | wobbly | 12 | 0.3 | Wobbly |
| 5 | 149 | 450 | 1000 | moving | 11 | 0.4 | Moving |
| 6 | 179 | 400 | 800 | rush | 10 | 0.5 | Rush |
| 7 | 199 | 350 | 700 | blink | 9 | 0.6 | Blink |
| 8 | 9999 | 250 | 600 | starfall | 8 | 0.8 | Starfall |

- **Type詳細**:
  - `static`: 動かない。
  - `wobbly`: その場でゆらゆら揺れる (Sine wave)。
  - `moving`: 直線的に移動する。
  - `rush`: 高速で移動し、すぐに消える。
  - `blink`: 明滅する。
  - `starfall`: 非常に高速に出現・移動する。

### B. レアリティ設定 (Rarity)
星生成時に乱数 `roll (0.0~1.0)` で決定。基礎確率にアイテム効果 `Stat_RareRate` が加算される。

| Rarity | Threshold | Color | Bonus |
|:---:|:---:|:---|:---:|
| 0 (Normal) | Else | `#ffd700` (Gold) | +0 |
| 1 (Uncommon)| < 0.60 | `#00ffff` (Cyan) | +1 |
| 2 (Rare) | < 0.85 | `#50ff50` (Green) | +2 |
| 3 (Epic) | < 0.95 | `#d050ff` (Purple) | +3 |
| 4 (Legend) | >= 0.95 | `rainbow` | +5 |

### C. システム定数
- **MAX_STAMINA**: 100
- **Miss_STAMINA_COST**: 10
- **GACHA_COST**: 500 (Star)
- **Initial Stars**: 500 (Data.js default)

---

## 4. コンテンツデータ (Content Data)

### A. アクセサリー・ベースアイテム (Base Items)
全30種。ID: `base_xx`。それぞれにType (装備部位) と固有のフレーバーテキストが存在する。
※ テキストは敬語を用いない詩的な表現で統一されている。

| ID | Name | Type | Note |
|:---|:---|:---|:---|
| 01 | 星のヘアピン | head | 夜空からこぼれ落ちた小さな金色の星屑。 |
| 02 | 猫の首輪 | neck | 歩くたびにチリチリ鳴る。飼い主を呼び寄せる。 |
| 03 | 銀河の指輪 | ring | 深遠な宇宙が広がるガラス細工。 |
| 04 | 天使の羽 | back | ふわふわとした純白の羽。 |
| 05 | 三日月の冠 | head | 静かな夜の魔力を秘めた銀色の冠。 |
| 06 | 魔法のステッキ | hand | 星を操る小さな杖。 |
| 07 | 流星のピアス | head | 流れ星の尾を結晶化させたピアス。 |
| 08 | 夜想曲のオルゴール | hand | 失われた時間を巻き戻す音色。 |
| 09 | 彗星のしっぽ | back | 氷と塵でできた冷たい尻尾。 |
| 10 | 星詠みの眼鏡 | head | 星の瞬きを観測する眼鏡。 |
| 11 | 宵闇のマント | back | 夜そのものを縫い合わせた漆黒のマント。 |
| 12 | プリズムの欠片 | neck | 朝露が固まったような七色の欠片。 |
| 13 | 星屑のコンパス | hand | 「ステキなもの」を指し示す気まぐれな針。 |
| 14 | 居眠り雲 | back | ちぎれ雲を捕まえたふかふかのクッション。 |
| 15 | 織姫の羽衣 | back | 天の川で輝く薄衣。 |
| 16 | シリウスのランタン | hand | 星の光を閉じ込めたアンティークなランタン。 |
| 17 | 古びた星図 | hand | 今はもう存在しない星座が描かれた羊皮紙。 |
| 18 | 小判のチャーム | neck | キラキラ光る黄金色のメダル。 |
| 19 | 満月のポシェット | back | お月様のようなフェルト製のポシェット。 |
| 20 | 極光のリボン | head | オーロラを結んだリボン。 |
| 21 | 砂時計のペンダント | neck | サラサラと光る砂が時