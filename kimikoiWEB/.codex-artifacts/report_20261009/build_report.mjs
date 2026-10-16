import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB";
const support = path.join(root, ".codex-artifacts/report_20261009");
const templatePath = path.join(root, "outputs/work_reports_20260508/エンジニア作業報告書_テンプレート_改訂版.xlsx");
const outputPath = path.join(root, "outputs/work_reports_20261009/エンジニア作業報告書_2026年10月第2週.xlsx");
const sheetName = "2026年10月第2週";

const reportCells = {
  A2: "対象期間: 2026/10/03〜2026/10/09（10/5出社）",
  E3: "今回の要約",
  A4: "2026/10/03〜\n2026/10/09",
  B4: "10/5〜10/9\n10/5出社",
  C4: "キミと恋する15日（仮）",
  D4: "Unity本番開発",
  E4: "ときめき・信頼ルートの演出、会話、保存復帰を反映。常駐妹をSpine対応。\n専用素材・数値の確定、文字表示とEXEでの反復確認は継続。",
  A25: "・対象期間：10/3〜10/9。作業日：10/5〜10/9。10/5出社。\n・前回継続の入力開始・日次撮影などは対象修正を完了。既報の完了作業は再掲しない。\n・完了は記載した作業範囲。専用手・表情素材、DAY10の増減量、EXE反復死亡・ロード・聴取確認は継続。\n・日本語フォントと版0040は調整中。新UI素材の登録と実画面への組込を区別して確認する。",
};

const rows = [
  {
    row: 8, A: "選択分岐/\n共通演出",
    B: "・ときめきDAY7〜9の選択肢を2段階化\n・信頼DAY7の4択と増減先を修正\n・ハンコ、開眼、回想、ゲージ鼓動を接続",
    D: "DAY6〜10 CSV / パラメータ\nKimikoiRoutePresentation", F: "完了",
    G: "・妹の割込み後に\n　選択肢を再表示\n・選択枝の増減を修正\n・回想とハンコを表示",
    H: "対象演出の\n検証済み",
    commits: ["8d8879c", "22bf8f5", "5f8f90c"],
    evidence: ["Docs/Scenario/ときめき・しんらい_実装結果_2026-10-03.md"],
  },
  {
    row: 9, A: "ルート終盤/\n正式素材反映",
    B: "・DAY10のスマホ点灯・目アップを追加\n・両ルートの手の襲撃と終了を接続\n・背景3点・星CG・正式SE8種を接続",
    D: "DAY10 / ルート演出Prefab\n背景・CG・SEデータ", F: "作業中",
    G: "・スマホを押して点灯\n・手の演出後に終了\n・手・表情と増減量は\n　最終確定待ち",
    H: "専用手・表情\n増減量は未確定",
    commits: ["22bf8f5", "5f8f90c", "a702bb4", "6f1220d", "8357a5e", "71d3d31"],
    evidence: ["Docs/Scenario/ときめき・しんらい_実装結果_2026-10-03.md", "Docs/Scenario/ときめき・しんらい_正式SE対応_2026-10-07.md"],
  },
  {
    row: 10, A: "会話・Web/\n入力修正",
    B: "・信頼LIMEを分離し、切替時に入力を開始\n・妹の吹き出しとDAY10立ち絵を修正\n・閉じたGoogruのページ復帰と読込を修正",
    D: "LIME / Googru / Timeline\n信頼DAY6〜10 CSV", F: "完了",
    G: "・LIME入力を自動開始\n・DAY10は立ち絵会話\n・閉じたWebを同じ\n　ページで開き直す",
    H: "修正反映済み\n通し確認はQA",
    commits: ["a9a35af", "9e31816", "38ede44", "ecdbc02", "a1d41ef", "f1931f1"],
    evidence: ["Docs/Scenario/FB_status_review_2026-10-03.md", "Docs/Scenario/信頼ルート_立ち絵と常駐妹会話修正_2026-10-07.md"],
    previous: "前回10行目：入力開始は検証済み。全域クリック・SKIPはQAへ継続。",
  },
  {
    row: 11, A: "常駐妹/\nSpine・粒子",
    B: "・常駐妹をSprite/Spineで切替\n・14モーション再生とタスクバー配置を調整\n・固定オーラを外し、黒い靄と光の粒を描画",
    D: "SisterResident / Spine 4.2\nSisterAuraParticleGraphic", F: "完了",
    G: "・表示切替と待機動作\n・タスクバー下は隠す\n・靄と光の粒が動く\n　ことを画面で確認",
    H: "Play Mode\n確認済み",
    commits: ["c3cde70", "690047e", "37a3a62", "90d5038", "ae382a7", "db5bf6d", "0481194"],
    evidence: ["outputs/spine-audit-20261008/確認結果.md", "outputs/spine-layout-20261008/確認結果.md", "outputs/sister-particles-20261008/verification.md"],
  },
  {
    row: 12, A: "保存・復帰/\n前回継続分",
    B: "・日次保存を有効な画面で撮影し停止を防止\n・DAY戻りの保存画像を元の色で表示\n・スマホ・回想・表情の保存復元を追加",
    D: "DAY保存 / Snapshot v6\nKimikoiDayReturnPanel", F: "完了",
    G: "・撮影時の停止を解消\n・保存画像の色を修正\n・スマホの明暗と回想\n　をロード後も保持",
    H: "前回継続分\n対象修正完了",
    commits: ["2a0da86", "7a7632c", "8d8879c"],
    evidence: ["outputs/all-routes-loop-20261005/四ルート進行・ゲームオーバー監査結果.md", "Docs/Scenario/ときめき・しんらい_実装結果_2026-10-03.md"],
    previous: "前回8行目：日次撮影と状態保存の修正完了。EXEロード・全設定確認はQAへ継続。",
  },
  {
    row: 13, A: "削除・死亡/\n再開修正",
    B: "・最後の1件は命乞いを聞いてから削除\n・死亡動画前の消灯と攻撃開始位置を修正\n・初回死亡後はメニューを挟まずDAY1へ",
    D: "SisterDataDelete / 死亡動画\nSisterGameOver", F: "作業中",
    G: "・命乞い後に全削除\n・消灯して死亡動画へ\n・初回はDAY1へ戻る\n　EXE反復は確認待ち",
    H: "反復死亡と\nEXE確認待ち",
    commits: ["c7030f4", "e07a7a1", "c3b4c20"],
    evidence: ["Docs/Scenario/FB_status_review_2026-10-03.md"],
    previous: "前回完了のごみ箱・暗転は再掲せず、最後の1件と動画・復帰の追加変更を記載。",
  },
  {
    row: 14, A: "進行停止対策/\n負荷軽減",
    B: "・動画中断・窓非表示でも進行待ちを解除\n・CSV解析と保存枠検査の重複処理を削減\n・描画の二重書込みと毎フレーム負荷を修正",
    D: "Timeline / CSV / 保存枠\nRenderGraph / バグ演出", F: "完了",
    G: "・中断後の待機を解除\n・同じデータの再読込\n　を減らすよう修正\n・描画の二重処理対策",
    H: "対策実装完了\nEXE描画はQA",
    commits: ["5371f5a", "6fc9917", "562adad", "6550eef", "6ccdd8c", "06d59fa", "daf0696", "94f3543", "19a9139", "f45995a", "7bfe35e", "66f0ef0"],
  },
  {
    row: 15, A: "表示・ビルド/\n保守調整",
    B: "・日本語フォントの文字とアトラスを更新\n・動的フォント画像を消しビルド肥大を防止\n・警告を整理、EXEで実行ログを閲覧可能に",
    D: "TMP / FontClearDynamicData\nRuntime Console / 版0039", F: "作業中",
    G: "・日本語の欠けを確認\n・EXEのログを読める\n・次版と長文表示を\n　引き続き確認",
    H: "版0039反映済\n0040調整中",
    commits: ["c50e763", "0e5ded4", "7258ee0", "fc1b841", "6bbbfaf", "10cf519", "768bd98", "6021f0b", "a5fccc6", "481e0a8", "18cf158"],
    previous: "前回11行目：フォントの未コミット差分が継続。旧黒帯・話者枠の実装は繰返さない。",
  },
  {
    row: 19, A: "資料更新/\n仕様記録",
    B: "・DAY6〜10の反映結果と残る演出を資料化\n・正式SEの接続と立ち絵会話の修正を記録\n・CSV再生成時の適用手順と仮SE方針を整理",
    D: "ルート実装結果 / 正式SE記録\n立ち絵修正 / 再適用手順", F: "完了",
    G: "・反映箇所と残件一覧\n・音源と台詞の対応\n・再生成後も修正を\n　戻せる手順を記録",
    H: "今週追加資料",
    commits: ["e132ef8", "85e30ec", "71d3d31", "ecdbc02", "42bc121"],
    evidence: ["Docs/Scenario/ときめき・しんらい_実装結果_2026-10-03.md", "Docs/Scenario/ときめき・しんらい_未反映演出整理_2026-10-03.md", "Docs/Scenario/信頼ルート_立ち絵と常駐妹会話修正_2026-10-07.md"],
  },
  {
    row: 20, A: "素材確認/\n不足整理",
    B: "・背景3点・正式SE8種の接続先を確認\n・Spine公式配布物688ファイルを照合\n・新UIを受領登録、手・表情の不足を整理",
    D: "背景・SE / Spine照合記録\nときめきUI / 素材不足一覧", F: "完了",
    G: "・背景とSEの接続確認\n・Spineの出所を照合\n・新UIと不足素材を\n　実装済みと区別",
    H: "素材確認・\n不足整理まで",
    commits: ["8d83495", "4961b75", "34cf512", "0df9450", "a76ee43"],
    evidence: ["outputs/spine-cleanup-20261008/確認結果.md", "Docs/Scenario/ときめき・しんらい_正式SE対応_2026-10-07.md"],
  },
  {
    row: 21, A: "本番QA/\n継続確認",
    B: "・4ルート53項目、死亡13項目を検証\n・EXE反復死亡とロードの確認点を整理\n・全域クリック・SKIP・音量の確認を継続",
    D: "4ルート・死亡監査 / FB一覧\n本番EXE・実操作確認", F: "作業中",
    G: "・4ルートの最後まで\n　Editor自動検証済み\n・EXEの動画と再開\n・全域クリック未確認",
    H: "Editor検証済\n実機・聴取待ち",
    commits: ["2a0da86", "22bf8f5", "5f8f90c", "42bc121"],
    evidence: ["outputs/all-routes-loop-20261005/四ルート進行・ゲームオーバー監査結果.md", "Docs/Scenario/FB_status_review_2026-10-03.md"],
    previous: "前回21行目：Editor4ルート・死亡検証を追加。EXE、全域クリック、SKIP、音の聴取は継続。",
  },
  {
    row: 22, A: "報告書/\n様式更新",
    B: "・前回継続項目をGit・検証記録と照合\n・10/3〜10/9分と10/5出社を記録\n・確認欄の折返しと完了の扱いを見直し",
    D: "本報告書\n作業報告書テンプレート", F: "完了",
    G: "・前回継続分を再判定\n・既報の完了は除外\n・出社日と改行を反映",
    H: "",
    commits: [],
  },
];

for (const item of rows) {
  for (const col of ["A", "B", "D", "F", "G", "H"]) reportCells[`${col}${item.row}`] = item[col];
}

const templateCells = {
  E3: "今回の要約",
  A4: "開始日〜\n終了日",
  B4: "作業日\n出社日を記載",
  E4: "今週の追加実装・修正と前回継続分の変化を記載。\n完了した対象作業と残る確認を分け、既報の完了内容は繰返さない。",
  A8: "ゲーム進行/\nシナリオ",
  A9: "ゲームアプリ/\n仮想OS",
  A10: "UI/Prefab/\n演出",
  A11: "セーブ/ロード\n状態復元",
  A12: "音響・表示/\nフォント",
  A13: "マスター/\nルート",
  A14: "検証/\nデバッグ",
  A15: "本番確認/\n調整",
  B8: "・完了は反映範囲と結果を記載\n・作業中は残る確認内容を記載\n・前回継続分の状態変更を反映",
  D8: "対象Script / Prefab / CSV",
  G8: "・操作後の変化を記載\n・確認待ちも具体化\n・折返し込み5行以内\n・末尾一文字を防ぐ",
  H8: "全体QAは\n別項目で管理",
  A19: "資料/\n仕様更新",
  A20: "確認環境/\n運用",
  A21: "実装状況/\n整理",
  A22: "報告書/\n様式更新",
  B19: "・資料名と更新・調査内容を記載\n・受領・接続・実機確認を区別\n・新規の成果と残件を整理",
  D19: "更新資料 / 調査・検証記録",
  G19: "・資料の更新点を記録\n・検証と未確認を区別\n・全体で5行以内",
  A25: "・対象期間・作業日・出社日を記録。今週の新規修正と前回継続分の状態変更を記載。\n・完了は対象作業の反映・確認範囲で判定。素材待ち・実機確認などの残件を具体化し、既報の完了は再掲しない。\n・作業内容は4行、確認欄は折返し込み5行以内。実際の列幅で確認し、一文字だけの改行を避ける。",
};

await fs.mkdir(support, { recursive: true });
const mode = process.argv[2] ?? "preview";
if (mode === "preview" || mode === "draft") {
  if (mode === "preview") {
    const book = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
    console.log((await book.inspect({ kind: "sheet", include: "id,name", maxChars: 900 })).ndjson);
    const preview = await book.render({ sheetName: "作業報告テンプレート", range: "A1:H28", scale: 1, format: "png" });
    await fs.writeFile(path.join(support, "template_before.png"), new Uint8Array(await preview.arrayBuffer()));
  }
  await fs.writeFile(path.join(support, "authored_values.json"), JSON.stringify({
    reportCells, templateCells, rows, outputPath, templatePath, sheetName,
    reportPeriod: ["2026-10-03", "2026-10-09"], workPeriod: ["2026-10-05", "2026-10-09"], attendance: ["2026-10-05"],
  }, null, 2));
  console.log("Draft written.");
} else if (mode === "create") {
  for (const [name, cells] of [["report", reportCells], ["template", templateCells]]) {
    const book = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
    const sheet = book.worksheets.getItemAt(0);
    for (const [address, value] of Object.entries(cells)) sheet.getRange(address).values = [[value]];
    book.recalculate();
    console.log(name, (await book.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 20 }, maxChars: 900 })).ndjson);
    await (await SpreadsheetFile.exportXlsx(book)).save(path.join(support, `${name}_artifact.xlsx`));
  }
  console.log("Artifact exports written for native-layout preservation.");
} else if (mode === "verify") {
  for (const [name, filePath, title] of [["report", outputPath, sheetName], ["template", templatePath, "作業報告テンプレート"]]) {
    const book = await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));
    console.log(name, (await book.inspect({ kind: "table", sheetId: title, range: "F8:H15", include: "values", tableMaxRows: 8, tableMaxCols: 3, maxChars: 2400 })).ndjson);
    const preview = await book.render({ sheetName: title, range: "A1:H28", scale: 1.5, format: "png" });
    await fs.writeFile(path.join(support, `${name}_final.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  console.log("Final previews written.");
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
