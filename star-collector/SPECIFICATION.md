# 仕様書: 星空さんぽ (Starry Sanpo) - 完全版仕様書

本文書は、アプリケーションの現在の実装状態（JavaScriptコードベース）を正確に反映した、開発者およびデザイナー向けの完全なリファレンスである。

## 1. プロジェクト概要

### コンセプト
**「眠れない夜は、星を集めて。」**
プレイヤーは猫となり、夜空を見上げて落ちてくる星々を集める。3分間の制限時間の中で、どれだけ多くの美しい星を集められるかを競うタイムアタック・コレクションゲーム。

### ターゲットプラットフォーム
- **Webブラウザ** (Mobile First, PC Compatible)
- **Viewport**: 9:16 (縦長) 固定。PCでは左右に黒帯を表示。

---

## 2. ゲームメカニクス (Game Mechanics)

### コア・ゲームループ
1.  **Spawn**: 難易度テーブルに基づき、一定間隔で「星」を生成。
2.  **Input**: ユーザーが画面をタップ/クリック。
3.  **Hit Detection**: タップ座標と星の座標を照合。
4.  **Result**:
    - **Hit**: スコア加算、効果音再生、エフェクト発生、星の消滅。
    - **Miss**: 星の無い場所をタップした場合、残り時間減少（ペナルティ）。
5.  **GameOver**: 残り時間が0になるとゲーム終了。リザルト画面へ。

### パラメータ計算式 (Math Model)

#### 1. 時間管理 (Time System)
- **Time Limit**: 180秒 (3分) + アクセサリ補正。
- **Time Reduction**:
  - 自然減少: 1秒ごとに -1秒。
  - **Penalty**: ミス（空振り）ごとに **-10秒**。
- **Warning (Dawn Effect)**: 残り時間が30秒を切ると、画面が徐々に明るくなり（夜明けの演出）、薄い黄色〜白のグラデーションが重なります。

#### 2. 星の生成 (Spawning)
- **Spawn Interval**: `BaseSpawnRate / SpeedMultiplier`
- **Life Time**: `(BaseLifeTime * 3) + Stat_LifeAdd`
- **Speed Multiplier**:
  - Slow: 0.5 / Normal: 1.0 / Fast: 1.5

#### 3. 判定ロジック
- **Hit Radius**: `Math.max(25, StarSize * 1.5) * Stat_HitScale`
- **Gimmicks**:
  - **Constellation**: 星座（連結した星）のどれか1つをタップすると、リンクしている全ての星を獲得。
  - **Shooting Star**: 流星は着弾するまで判定を持たない（演出）。

#### 4. スコア計算
```javascript
Point = (Base(1) + RarityBonus + Stat_ScoreAdd) * Stat_ScoreMult
```
- **Constellation Bonus**: 星座の星は基本点に加え `+2` のボーナス。

---

## 3. データテーブル (Data Tables)

### A. 難易度・ギミック出現率
コンボ数に応じて難易度とギミック発生率が変化する。

| Level | Cond | Gimmick (Const / Shooting) | Desc |
|:---:|:---:|:---:|:---|
| 0-3 | ~89 | 0% / 0% | Intro - Fast |
| 4 | 119 | 10% / 5% | Wobbly |
| 5 | 149 | 15% / 10% | Moving |
| 6 | 179 | 20% / 15% | Rush |
| 7 | 199 | 25% / 20% | Blink |
| 8 | 9999 | 30% / 30% | Starfall |

### B. ギミック詳細
- **Constellation (星座)**: 3〜4個の星がセットで出現。
- **Shooting Star (流星)**: 画面外から飛来する。

### C. システム定数
- **TIME_LIMIT_SECONDS**: 180
- **MISS_TIME_PENALTY**: 10
- **GACHA_COST**: 300 (Star)
- **Initial Stars**: 500

---

## 4. コンテンツデータ (Content Data)

### A. アクセサリー・ベースアイテム (Base Items)
全30種。ID: `base_01` ~ `base_30`。
（詳細なリストは config.js 参照）

### B. 付与効果 (Effects)
ガチャ時にランダム付与。

| Category | Effect | Stats Ref |
|:---|:---|:---|
| **判定** | ヒット判定拡大 | hitScale: +0.2 ~ +1.0 |
| **星寿命** | 星の表示時間延長 | lifeAdd: +500ms ~ +2000ms |
| **制限時間** | ゲーム時間延長 | timeAdd: +30s ~ +90s |
| **幸運** | レア星出現率UP | rareRate: +0.1 ~ +0.2 |
| **スコア** | 獲得スコア/星UP | scoreAdd, currencyMult |
| **Unique** | 自動回収 (5s毎) | autoCatch: 5000 |
| | 時戻し (5%で+5s) | luckyHeal: 0.05 |
| | 狙撃手 (判定小/点2倍) | hitScale:-0.2, scoreMult:2.0 |

---

## 5. UI/UX仕様

### 画面レイアウト
- **Top-Left (Combined)**:
  - タイマー (`⌛ 180`)
  - 獲得スター数 (`★ 123`)
- **Top-Right**: ポーズボタンのみ。
- **Main**: 星空キャンバス。

### 画面遷移
Title -> Game -> Result -> Title。
(Sub: Gacha, Equip, Ranking, HowTo, Credits)

---

## 6. データ構造 (Storage Schema)

### LocalStorage: `starry_cat_save_v2`
```json
{
  "stars": 500,
  "highScore": 0,
  "equippedId": "uuid...",
  "inventory": [...]
}
```
