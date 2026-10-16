import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("../outputs/work_reports_20260508");

const palette = {
  navy: "#1F3A5F",
  blue: "#DDEAF7",
  paleBlue: "#F3F7FC",
  teal: "#DCEFEA",
  green: "#E8F4E8",
  gray: "#F3F4F6",
  line: "#B8C2CC",
  text: "#1F2933",
  white: "#FFFFFF",
  note: "#FFF7D6",
};

function setBase(sheet) {
  sheet.showGridLines = false;
  const all = sheet.getRange("A1:H42");
  all.format.font = { name: "Yu Gothic", size: 10, color: palette.text };
  all.format.wrapText = true;
  all.format.verticalAlignment = "top";

  const widths = [90, 110, 130, 135, 135, 135, 135, 130];
  widths.forEach((w, i) => {
    sheet.getRangeByIndexes(0, i, 42, 1).format.columnWidthPx = w;
  });
}

function title(sheet, titleText, subtitleText) {
  const titleRange = sheet.getRange("A1:H1");
  titleRange.merge();
  titleRange.values = [[titleText]];
  titleRange.format.fill = palette.navy;
  titleRange.format.font = { name: "Yu Gothic", size: 16, bold: true, color: palette.white };
  titleRange.format.horizontalAlignment = "center";
  titleRange.format.verticalAlignment = "middle";
  titleRange.format.rowHeightPx = 36;

  const sub = sheet.getRange("A2:H2");
  sub.merge();
  sub.values = [[subtitleText]];
  sub.format.fill = palette.blue;
  sub.format.font = { name: "Yu Gothic", size: 10, bold: true, color: palette.navy };
  sub.format.horizontalAlignment = "center";
  sub.format.verticalAlignment = "middle";
  sub.format.rowHeightPx = 24;
}

function section(sheet, range, label, fill = palette.teal) {
  const r = sheet.getRange(range);
  r.merge();
  r.values = [[label]];
  r.format.fill = fill;
  r.format.font = { name: "Yu Gothic", size: 11, bold: true, color: palette.navy };
  r.format.verticalAlignment = "middle";
  r.format.rowHeightPx = 24;
}

function labelBlock(sheet, range, values, fill = palette.paleBlue) {
  const r = sheet.getRange(range);
  r.values = values;
  r.format.fill = fill;
  r.format.font = { name: "Yu Gothic", size: 9, bold: true, color: palette.navy };
  r.format.horizontalAlignment = "center";
  r.format.verticalAlignment = "middle";
}

function bodyBlock(sheet, range, values, fill = palette.white) {
  const r = sheet.getRange(range);
  r.values = values;
  r.format.fill = fill;
  r.format.font = { name: "Yu Gothic", size: 9, color: palette.text };
  r.format.verticalAlignment = "top";
}

function border(range) {
  range.format.borders = { preset: "all", style: "thin", color: palette.line };
}

function mergeRows(sheet, start, end, cols = ["A:H"]) {
  for (let row = start; row <= end; row++) {
    for (const colRange of cols) {
      const [left, right] = colRange.split(":");
      sheet.getRange(`${left}${row}:${right}${row}`).merge();
    }
  }
}

function buildTemplate() {
  const wb = Workbook.create();
  const sheet = wb.worksheets.add("週次作業報告テンプレート");
  setBase(sheet);
  title(sheet, "エンジニア週次作業報告書", "対象期間・実装内容・付帯業務を1ページで簡潔に整理");

  labelBlock(sheet, "A3:B4", [["対象期間", "報告者"], ["YYYY/MM/DD〜YYYY/MM/DD", "氏名 / 担当"]]);
  labelBlock(sheet, "C3:D4", [["プロジェクト", "提出日"], ["プロジェクト名", "YYYY/MM/DD"]]);
  labelBlock(sheet, "E3:H4", [["今週の要約", null, null, null], ["例: 実装範囲、成果、次に確認すべき点を1〜2文で記載", null, null, null]], palette.gray);
  sheet.getRange("E3:H3").merge();
  sheet.getRange("E4:H4").merge();
  border(sheet.getRange("A3:H4"));

  section(sheet, "A6:H6", "1. 実装した作業内容");
  labelBlock(sheet, "A7:H7", [["区分", "具体内容", null, "成果物 / 対象ファイル", null, "状態", "確認内容", "備考"]]);
  sheet.getRange("B7:C7").merge();
  sheet.getRange("D7:E7").merge();
  bodyBlock(sheet, "A8:H13", [
    ["例: Unity実装", "・何を実装したか\n・どの画面/機能に反映したか", null, "例: Prefab / Script / Scene", null, "完了", "動作確認内容", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
  ]);
  mergeRows(sheet, 8, 13, ["B:C", "D:E"]);
  border(sheet.getRange("A7:H13"));

  section(sheet, "A15:H15", "2. 実装以外の業務");
  labelBlock(sheet, "A16:H16", [["区分", "具体内容", null, "成果物 / 参照資料", null, "状態", "確認内容", "備考"]]);
  sheet.getRange("B16:C16").merge();
  sheet.getRange("D16:E16").merge();
  bodyBlock(sheet, "A17:H21", [
    ["例: 資料作成", "・仕様書/報告書/見積シート等の作成\n・関係者確認、整理、調整", null, "例: xlsx / md / pdf", null, "完了", "内容確認", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
  ]);
  mergeRows(sheet, 17, 21, ["B:C", "D:E"]);
  border(sheet.getRange("A16:H21"));

  section(sheet, "A23:H23", "3. 補足 / 次回確認事項");
  bodyBlock(sheet, "A24:H28", [
    ["・残課題、次週確認、依存事項を箇条書きで記載\n・工数が不要な場合は時間欄を設けず、成果と状態を中心に記載", null, null, null, null, null, null, null],
    ["", null, null, null, null, null, null, null],
    ["", null, null, null, null, null, null, null],
    ["", null, null, null, null, null, null, null],
    ["", null, null, null, null, null, null, null],
  ]);
  sheet.getRange("A24:H28").merge(true);
  border(sheet.getRange("A24:H28"));

  section(sheet, "A30:H30", "記載ルール");
  bodyBlock(sheet, "A31:H33", [[
    "・5W1Hを意識し、誰が見ても対象期間・作業内容・成果物が分かるように書く。\n・長文にせず、箇条書きで具体的に書く。\n・数字や固有名詞、ファイル名を入れると簡潔でも伝わりやすい。",
    null, null, null, null, null, null, null,
  ]], palette.note);
  sheet.getRange("A31:H33").merge();
  border(sheet.getRange("A31:H33"));

  return wb;
}

function buildReport() {
  const wb = Workbook.create();
  const sheet = wb.worksheets.add("2026年5月第1週");
  setBase(sheet);
  title(sheet, "エンジニア作業報告書", "対象期間: 2026/05/01〜2026/05/08");

  labelBlock(sheet, "A3:B4", [["対象期間", "作業日"], ["2026/05/01〜2026/05/08", "5/1, 5/6, 5/7, 5/8"]]);
  labelBlock(sheet, "C3:D4", [["プロジェクト", "対象"], ["キミと恋する15日（仮）", "Unityモック / きみこいWeb資料"]]);
  labelBlock(sheet, "E3:H4", [["今週の要約", null, null, null], ["Unityモックの疑似デスクトップ基盤、キミコイ/LIME周辺UI、資料整理を実施。Prefab中心の運用に寄せ、確認用スクリーンショットと仕様書も整備。", null, null, null]], palette.gray);
  sheet.getRange("E3:H3").merge();
  sheet.getRange("E4:H4").merge();
  border(sheet.getRange("A3:H4"));

  section(sheet, "A6:H6", "1. エンジニアとして実装した作業内容");
  labelBlock(sheet, "A7:H7", [["区分", "具体内容", null, "成果物 / 対象", null, "状態", "確認内容", "備考"]]);
  sheet.getRange("B7:C7").merge();
  sheet.getRange("D7:E7").merge();
  bodyBlock(sheet, "A8:H15", [
    ["Unity基盤", "・Unity MCP / AI Assistant / Package Manager設定を追加・調整\n・DOTween、TextMeshPro、日本語フォント周りを導入・更新", null, "Packages / ProjectSettings / Fonts / Plugins", null, "完了", "Unityプロジェクト設定と関連アセットをコミット", ""],
    ["疑似デスクトップ", "・デスクトップシェル、ウィンドウ管理、タスクバー、スタートメニュー、右クリックメニューを実装\n・ファイル/アイコン/ウィンドウ定義をScriptableObject系データとして整備", null, "DesktopShellController.cs / DesktopWindowManager.cs / TaskbarController.cs / Data/Desktop", null, "完了", "Prefab・Scene反映、スクリーンショットで表示確認", ""],
    ["ゲーム内アプリ", "・キミコイADV、LIME、Googru、タスクマネージャー等のウィンドウ制御を実装・調整\n・外側ADV/内側ADV、選択肢、ログ、名前入力、設定画面のPrefabを追加", null, "KimikoiAdvWindowController.cs / LimeWindowController.cs / GoogruWindowController.cs / Prefabs/Desktop", null, "完了", "各画面の配置・テキスト・操作を段階確認", ""],
    ["シナリオ連携", "・master_scenario.csvの単一マスター運用に合わせた読込/進行制御を整備\n・Excel仕様からCSVへ変換する補助スクリプトを追加", null, "MasterScenarioController.cs / tools/build_master_from_xlsx.py / Data/System/master_scenario.csv", null, "完了", "CSV化と進行用データの配置を確認", ""],
    ["UI/Prefab調整", "・デスクトップ、キミコイ基本画面、タイトル、コンフィグ、ログ、選択肢、ダイアログのUI素材を取り込み\n・Prefabのテキスト指定、フォント、表示位置、重なり、網掛け等を修正", null, "Assets/UI / Prefabs/Desktop / Main.unity", null, "完了", "GameView/verifyスクリーンショットで比較確認", ""],
    ["検証環境", "・スクリーンショット保存先とREADMEを整備\n・ドラッグ選択、時計、タスクマネージャー、キミコイ画面などの検証画像を保存", null, "Assets/Screenshots / Screenshots", null, "完了", "検証画像を残して確認経路を明確化", ""],
    ["", "", null, "", null, "", "", ""],
    ["", "", null, "", null, "", "", ""],
  ]);
  mergeRows(sheet, 8, 15, ["B:C", "D:E"]);
  [8, 9, 10, 11, 12, 13].forEach((row) => sheet.getRange(`A${row}:H${row}`).format.rowHeightPx = 58);
  border(sheet.getRange("A7:H15"));

  section(sheet, "A17:H17", "2. 実装以外の業務");
  labelBlock(sheet, "A18:H18", [["区分", "具体内容", null, "成果物 / 参照資料", null, "状態", "確認内容", "備考"]]);
  sheet.getRange("B18:C18").merge();
  sheet.getRange("D18:E18").merge();
  bodyBlock(sheet, "A19:H23", [
    ["仕様整理", "・きみこいWeb内の総合仕様書、付録、READMEを作成/更新\n・Unityモックに合わせて二層ADV、単一CSV、Prefab優先運用を明記", null, "ゲーム仕様書.md / ゲーム仕様書_付録.md / README.md", null, "完了", "Unity側の実装前提と整合", ""],
    ["資料作成", "・タイトル、LIME、キミコイパート、仮想デスクトップアプリの各Excel仕様書を整理\n・モック制作概要書、企画書、技術設計資料も参照し内容を集約", null, "【モック】キミコイ_*仕様書.xlsx / 技術設計たたき台.md", null, "完了", "Web側資料として保存済み", "工数記載なし"],
    ["運用整理", "・UI実装運用規約、再現チェックリスト、画面差分表を整備\n・ランタイム生成ではなくScene/Prefab実体を編集する方針を明文化", null, "Assets/Docs/UI/* / Assets/Docs/Planning/*", null, "完了", "後続作業の判断基準として使用可能", ""],
    ["報告書整備", "・作業報告書テンプレートを作成\n・5/1〜5/8分の実作業報告を1ページに集約", null, "本Excelテンプレート / 本報告書", null, "完了", "5W1H、箇条書き、具体性を反映", "工数欄なし"],
    ["", "", null, "", null, "", "", ""],
  ]);
  mergeRows(sheet, 19, 23, ["B:C", "D:E"]);
  [19, 20, 21, 22].forEach((row) => sheet.getRange(`A${row}:H${row}`).format.rowHeightPx = 58);
  border(sheet.getRange("A18:H23"));

  section(sheet, "A25:H25", "3. 補足 / 次回確認事項");
  bodyBlock(sheet, "A26:H29", [[
    "・現時点の報告は工数なし。成果物、実装範囲、確認内容を中心に記載。\n・次回はUnity上で主要導線（デスクトップ起動→キミコイ起動→ADV進行→外側復帰）の通し確認を優先。\n・TextMeshPro/Prefab/Sceneに未コミット差分が残っているため、最終提出前に差分確認が必要。",
    null, null, null, null, null, null, null,
  ]], palette.note);
  sheet.getRange("A26:H29").merge();
  border(sheet.getRange("A26:H29"));

  section(sheet, "A31:H31", "参照した報告書作成ポイント");
  bodyBlock(sheet, "A32:H35", [[
    "Web調査より、報告書は5W1H、具体性、簡潔さ、箇条書きが有効と判断。\n参照: https://jp.sansan.com/media/business-report/ / https://exia.co.jp/bizroute/houkoku.html / https://notepm.jp/template/work-report",
    null, null, null, null, null, null, null,
  ]], palette.gray);
  sheet.getRange("A32:H35").merge();
  border(sheet.getRange("A32:H35"));

  return wb;
}

async function saveWorkbook(wb, filename) {
  await fs.mkdir(outputDir, { recursive: true });
  const errors = await wb.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula error scan",
  });
  console.log(`${filename} errors:`);
  console.log(errors.ndjson);
  const sheetName = wb.worksheets.getItemAt(0).name;
  const preview = await wb.render({ sheetName, range: "A1:H36", scale: 1, format: "png" });
  const previewBytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(outputDir, `${filename}.png`), previewBytes);
  const xlsx = await SpreadsheetFile.exportXlsx(wb);
  await xlsx.save(path.join(outputDir, `${filename}.xlsx`));
}

await saveWorkbook(buildTemplate(), "エンジニア週次作業報告書_テンプレート");
await saveWorkbook(buildReport(), "エンジニア作業報告書_2026年5月第1週");
console.log(`saved to ${outputDir}`);
