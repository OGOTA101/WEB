import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB";
const support = path.join(root, ".codex-artifacts/report_20261002");
const templatePath = path.join(root, "outputs/work_reports_20260508/エンジニア作業報告書_テンプレート_改訂版.xlsx");
const outputDir = path.join(root, "outputs/work_reports_20261002");
const outputPath = path.join(outputDir, "エンジニア作業報告書_2026年10月第1週.xlsx");

const reportCells = {
  A2: "対象期間: 2026/09/19〜2026/10/02（2週間分・9/28出社）",
  E3: "今回の要約",
  A4: "2026/09/19〜\n2026/10/02",
  B4: "9/21〜10/2\n9/28出社",
  C4: "キミと恋する15日（仮）",
  D4: "Unity本番開発",
  E4: "セーブ復元、Google・LIME操作、本文表示、演出・音響を修正。\nMOC整備と版管理は完了。追加調整と本番確認を継続。",
  A25: "・対象：9/19〜10/2の2週間分。作業日：9/21〜10/2。9/28出社。\n・前回継続のMOC整備・版管理は完了。今回の追加修正と継続FBを記載。\n・EXEのロード・リトライと動画終了後の操作は確認待ち。窓切替・文字表示を調整中。",
};

const rows = [
  {
    row: 8, A: "セーブ/ロード\n状態復元",
    B: "・ロード後も設定と削除済み状態を維持\n・日次保存の競合と数値の二重加算を修正\n・DAY保存画像を更新し再保存処理を調整",
    D: "SaveManager / 状態復元\nKimikoiDayCheckpoint", F: "作業中",
    G: "・ロード後の設定と\n　削除状態を確認\n・再開時の数値を確認\n・保存画像のDAY確認",
    H: "復元・再保存\n調整中",
    commits: ["cb2831e", "e1ace05", "ee201a6", "534d9c3", "6e2faea", "51fb051"],
  },
  {
    row: 9, A: "Google起動/\n操作誘導",
    B: "・Googleアイコンを強調し\n　ダブルクリック待ちを追加\n・手動起動をキミコイ検索結果へ接続\n・窓を戻しても閲覧ページを維持",
    D: "GoogruWindowController\nTutorialFocusOverlay", F: "完了",
    G: "・Googleをダブル\n　クリックで起動\n・検索から公式サイト\n　まで進めるか確認\n・復帰後もページ保持",
    H: "手動起動の\n検証済み",
    commits: ["b95f952", "071f3d6", "7cd84d4"],
  },
  {
    row: 10, A: "ADV/LIME\n入力・進行",
    B: "・切替直後はどちらの窓でも会話を進行\n・未読SKIPと台詞・助けLIMEの待ちを調整\n・タスクバーで背面窓を前面化するよう修正",
    D: "KimikoiAdvTimelineBridge\nLimeWindowController", F: "作業中",
    G: "・窓切替後も会話進行\n・未読ではSKIP不可\n・タスクバーで窓復帰",
    H: "窓切替を\n継続調整",
    commits: ["36791b9", "6571085", "f0f7e00", "2cc293b", "6c77a4e", "1089957", "4465d77"],
  },
  {
    row: 11, A: "REAL_ADV/\n文字表示",
    B: "・本文を中央寄せ、黒帯の高さと余白を調整\n・空の話者は名前枠を隠し妹表記を統一\n・ごみ箱誘導中の本文を明るく表示",
    D: "OuterAdvOverlayController\nREAL_ADV / TMP", F: "作業中",
    G: "・長い本文の収まり\n・空の話者は枠なし\n・ごみ箱誘導中も台詞\n　を読めるか確認",
    H: "フォント差分\n確認中",
    commits: ["60a61ae", "be9b3a3", "f8dd323", "68e5e83", "cd21226", "793d669"],
  },
  {
    row: 12, A: "削除操作/\n妹・怪異演出",
    B: "・ごみ箱の削除対象・取消と成功時SEを修正\n・削除時の吹き出しと妹復活の表示を修正\n・暗転1〜4秒とSNS5秒の表示時間を調整",
    D: "SisterDataDelete / ごみ箱\n妹表示 / ルート演出", F: "完了",
    G: "・捨てた対象と音\n・削除時の台詞と妹\n　復活の表示を確認\n・暗転とSNS表示時間\n　を確認",
    H: "",
    commits: ["60ee16c", "0a44f12", "02f3520", "e0c6973", "3f58bb4", "f31038f"],
  },
  {
    row: 13, A: "LIME隠し/\n起動と復帰",
    B: "・DAY6のLIME起動をダブルクリック待ちに\n・隠す・戻すデモを台詞後にマウスで実演\n・画面外のLIMEはタイトルバーを残す",
    D: "ScriptedDesktopCursor\nいらいらDAY6", F: "完了",
    G: "・LIMEを手動起動\n・台詞後に隠す実演\n・タイトルバーを残し\n　窓を戻す動きを確認",
    H: "",
    commits: ["192d507", "a2d037e", "82d838e", "4207abb", "6c77a4e"],
  },
  {
    row: 14, A: "音響/\nBGM調整",
    B: "・妹登場後とスキンシップ中のBGMを修正\n・海辺の開始、怨念復活時の停止を反映\n・妹ノイズと怨念加算音の音量を調整",
    D: "KimikoiAdvAudioController\nBGM設定 / シナリオ表", F: "完了",
    G: "・妹登場後のBGM\n・海辺で開始し復活で\n　止まるか確認\n・ノイズ音量を確認",
    H: "",
    commits: ["111adfe", "85286f0", "f819f36", "bbac3c0", "2def307", "9ab293c"],
  },
  {
    row: 15, A: "MOC整備/\n本番版設定",
    B: "・MOC起動メニューとLIME表示を調整\n・本番版番号を0029〜0034へ更新\n・ログ表示を軽量化しカーソル警告を修正",
    D: "MOC / ProjectSettings\nRuntime Console", F: "完了",
    G: "・MOCとLIMEの表示\n・版番号0034を確認\n・ログ量と警告を確認",
    H: "前回継続分\n完了",
    commits: ["e075f1c", "39a8050", "5a8766d", "8fe686c", "2a2b4fe"],
  },
  {
    row: 19, A: "シナリオ資料/\nデータ同期",
    B: "・シナリオ正本と現行CSV表を更新\n・各ルートDAY6〜10のシート読込を追加\n・BGM列とDAY3選択後の数値反映を調整",
    D: "シナリオ正本 / 現行CSV表\nルートDAY6〜10", F: "完了",
    G: "・正本と取込先を一致\n・DAY6〜10の取込\n・選択後の数値を確認",
    H: "",
    commits: ["62e3bbc", "2eda813", "00df5f1", "5be5723", "1ec4bd6"],
  },
  {
    row: 20, A: "調査記録/\nFB資料更新",
    B: "・FB10件とGoogle誘導の反映記録を作成\n・ときめき・信頼DAY6〜10のCSVを照合\n・死亡動画と描画負荷の調査結果を資料化",
    D: "FB反映記録 / CSV照合\n動画・性能調査メモ", F: "完了",
    G: "・FB修正と残件を記録\n・ルート台詞を照合\n・動画・性能の原因\n　候補を整理",
    H: "調査・資料化\n完了",
    commits: ["f46115f", "d364fce", "2955e5d", "18fb26e", "2a2b4fe"],
  },
  {
    row: 21, A: "本番QA/\n継続FB対応",
    B: "・セーブ復元の回帰検証17項目を確認\n・死亡動画と窓切替の未解決FBを整理\n・EXEのロードと動画終了後の確認点を整理",
    D: "SaveRestore検証 / FB一覧\n本番EXE確認", F: "作業中",
    G: "・ロードとDAY戻り\n・死亡動画後の操作\n・窓切替と再起動時\n　の表示を確認",
    H: "動画の不具合\n調査継続",
    commits: ["d364fce", "18fb26e"],
  },
  {
    row: 22, A: "報告書/\n様式更新",
    B: "・前回継続項目と2週間のGit履歴を照合\n・9/19〜10/2分を1ページに整理\n・9/28出社と完了区分を反映し様式を更新",
    D: "本報告書\n作業報告書テンプレート", F: "完了",
    G: "・2週間分をまとめる\n・9/28出社を記載\n・完了と継続を見直す",
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
  E4: "対象期間の新規・追加修正と前回継続分を記載。\n完了した作業と継続確認を分け、既報の完了内容は再掲しない。",
  B8: "・対象機能と変更点を具体的に記載\n・前回継続分の完了状況を見直す\n・作業内容は改行込みで4行以内",
  D8: "対象Script / Prefab / CSV",
  G8: "・操作と結果を具体化\n・改行込みで5行以内\n・折返しも行数に含む\n・一文字だけ残さない",
  B19: "・資料名と更新・調査内容を記載\n・検証済みと確認待ちを区別\n・出社日と対象期間を記録",
  D19: "更新資料 / 調査・検証記録",
  G19: "・資料の更新点を記録\n・検証と未確認を区別\n・全体で5行以内",
  A25: "・対象期間は週・複数週に対応。作業日と出社日を記載。\n・前回継続分は完了状況を見直し、既報の完了内容は再掲しない。\n・作業内容は4行、確認欄は折返し込み5行以内。操作と結果を具体的に記載。",
};

await fs.mkdir(support, { recursive: true });
const mode = process.argv[2] ?? "preview";
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
const sheet = wb.worksheets.getItemAt(0);

if (mode === "preview" || mode === "draft") {
  if (mode === "preview") {
    console.log((await wb.inspect({ kind: "sheet", include: "id,name", maxChars: 1200 })).ndjson);
    console.log(wb.help("worksheet.pageLayout", { include: "index,examples,notes", maxChars: 2200 }).ndjson);
    const preview = await wb.render({ sheetName: "作業報告テンプレート", range: "A1:H28", scale: 1, format: "png" });
    await fs.writeFile(path.join(support, "template_before.png"), new Uint8Array(await preview.arrayBuffer()));
  }
  await fs.writeFile(path.join(support, "authored_values.json"), JSON.stringify({
    reportCells, templateCells, rows, outputPath, templatePath,
    sheetName: "2026年10月第1週", reportPeriod: ["2026-09-19", "2026-10-02"],
  }, null, 2));
  console.log("Draft written.");
} else if (mode === "create") {
  const reportWb = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
  const reportSheet = reportWb.worksheets.getItemAt(0);
  for (const [address, value] of Object.entries(reportCells)) reportSheet.getRange(address).values = [[value]];
  for (const [address, value] of Object.entries(templateCells)) sheet.getRange(address).values = [[value]];
  for (const [name, book] of [["report", reportWb], ["template", wb]]) {
    book.recalculate();
    const errors = await book.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 20 }, maxChars: 1500 });
    console.log(name, errors.ndjson);
    const output = await SpreadsheetFile.exportXlsx(book);
    await output.save(path.join(support, `${name}_artifact.xlsx`));
  }
  await fs.mkdir(outputDir, { recursive: true });
  console.log("Artifact exports written for native-layout preservation.");
} else if (mode === "verify") {
  for (const [name, filePath, sheetName] of [
    ["report", outputPath, "2026年10月第1週"],
    ["template", templatePath, "作業報告テンプレート"],
  ]) {
    const book = await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));
    console.log(name, (await book.inspect({ kind: "table", sheetId: sheetName, range: "F8:H15", include: "values", tableMaxRows: 8, tableMaxCols: 3, maxChars: 2500 })).ndjson);
    const preview = await book.render({ sheetName, range: "A1:H28", scale: 1.5, format: "png" });
    await fs.writeFile(path.join(support, `${name}_final.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  console.log("Final previews written.");
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
