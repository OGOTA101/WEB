# TETRIS // REN

空白を残さない列重力と、ぷよテト風のRENを組み合わせたブラウザテトリスです。

## ルール

- テトリミノを固定すると、各列のブロックが下へ詰まります。
- そろったラインは消え、次の消去までにライン消去が続くとRENが上がります。
- RENはラインスコアにボーナスを加え、盤面中央のコールアウトと発光で強調します。
- スコア、ライン数、レベル、ハードドロップ／ソフトドロップの得点を記録します。
- 8個置くごと、または10ライン消すごとにレベルが上がり、落下速度が上がります。
- BEST RENは同じブラウザのローカルストレージに保存されます。

## 操作

PC: `← →` 移動 / `↓` ソフトドロップ / `↑` または `Space` 即落下 / `X` 回転 / `Z` 逆回転 / `P` 一時停止

スマホ: 盤面の左／右をタップして移動 / 下スワイプで即落下 / 上スワイプで回転。画面下の `← → ↻ SOFT DROP` ボタンも使用できます。

RENは最初のライン消去から `02` として表示されます。

## Firebase Hosting

```powershell
npx -y firebase-tools@latest hosting:sites:create tetris-ren-sg --project sggame-hub
npx -y firebase-tools@latest deploy --only hosting
```

デプロイ対象はこのフォルダの `index.html`、`styles.css`、`game.js` です。

公開URL: https://tetris-ren-sg.web.app
