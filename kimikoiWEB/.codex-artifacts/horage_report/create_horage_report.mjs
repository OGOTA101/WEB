import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, "../../outputs/horage_weekly_report_20260508");

const palette = {
  ink: "#172033",
  muted: "#5B6475",
  line: "#CAD3DF",
  blue: "#1F4E79",
  blue2: "#DCEAF7",
  green: "#2D6A4F",
  green2: "#E2F0E8",
  amber: "#8A5A00",
  amber2: "#FFF1CC",
  gray: "#F4F6F8",
  white: "#FFFFFF",
};

const implementationRows = [
  ["デスクトップUI基盤", "仮想デスクトップのウィンドウ管理、タスクバー、スタートメニュー、アイコン、コンテキストメニューを実装。", "完了"],
  ["アプリ/ウィンドウPrefab", "Kimikoi、LIME、Googru、ファイル、設定、ゴミ箱、タスクマネージャ等のPrefabと定義アセットを追加。", "完了"],
  ["Kimikoi ADV本体", "タイトル、名前入力、ADV本文、選択肢、ログ、設定、終了確認、日付/場所/曜日表示を実装・調整。", "完了"],
  ["シナリオ連携", "Excel由来データを master_scenario.csv に変換するスクリプトと読込/進行制御を整備。", "完了"],
  ["UI運用改善", "Prefab/Scene優先のUI実装規約を追加し、コード側の固定レイアウト上書きを削減。", "完了"],
  ["フォント/TMP", "日本語表示用フォントとTextMeshPro設定を追加・更新し、Prefab側のテキスト指定を一括修正。", "完了"],
  ["音声/演出基盤", "BGM/SE素材整理、SoundManager、DOTween、起動/遷移/クリック演出を整備。", "完了"],
  ["検証/調整", "GameViewスクリーンショットを取得し、ログ表示、レイアウト、視認性、マスク周りを確認・修正。", "対応中"],
];

const nonImplementationRows = [
  ["仕様確認", "企画書、仮想デスクトップ、Kimikoi、LIME、タイトル画面の仕様書を確認し、実装対象を整理。", "1.5h"],
  ["作業計画/工数整理", "5/6〜5/8の作業範囲を分類し、報告書用の工数項目と集計欄を作成。", "1.0h"],
  ["連絡・調整", "実装方針、Prefab優先ルール、検証観点を整理し、作業報告にまとめられる形へ整備。", "0.8h"],
  ["素材/資料整理", "UI画像、BGM、仕様書、スクリーンショット保存先、READMEを整理。", "1.2h"],
  ["AI/Unity作業環境", "Cursor/Claude/Unity AI補助用のルール・スキル、PackageManager、manifest類を更新。", "1.0h"],
  ["確認・記録", "Git履歴、未コミット差分、検証スクリーンショット、作業日を確認し、報告根拠を整理。", "0.7h"],
];

const effortRows = [
  ["Unity実装", 23.5],
  ["Prefab/UI調整", 10.0],
  ["仕様確認・調整", 1.5],
  ["工数計算/報告書作成", 1.0],
  ["資料・素材整理", 1.2],
  ["検証・記録", 1.5],
];

function setColumns(sheet) {
  const widths = [118, 180, 520, 110, 110, 115, 100, 96];
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 40, 1).format.columnWidthPx = width;
  });
  sheet.getRange("A1:H40").format = {
    font: { name: "Yu Gothic", color: palette.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
  };
  sheet.getRange("A1:H40").format.rowHeightPx = 28;
  sheet.showGridLines = false;
}

function title(sheet, text, fill = palette.blue) {
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1:H1").format = {
    fill,
    font: { bold: true, color: palette.white, size: 16 },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
  };
  sheet.getRange("A1:H1").format.rowHeightPx = 42;
}

function labelValueBlock(sheet, values) {
  sheet.getRange("A3:H5").values = values;
  sheet.getRange("A3:A5").format = { fill: palette.gray, font: { bold: true } };
  sheet.getRange("C3:C5").format = { fill: palette.gray, font: { bold: true } };
  sheet.getRange("E3:E5").format = { fill: palette.gray, font: { bold: true } };
  sheet.getRange("G3:G5").format = { fill: palette.gray, font: { bold: true } };
  sheet.getRange("A3:H5").format = {
    border: { color: palette.line, style: "continuous" },
    verticalAlignment: "middle",
    wrapText: true,
  };
}

function writeSection(sheet, startRow, heading, headers, rows, statusColor = palette.blue2) {
  const row = startRow;
  sheet.getRange(`A${row}:H${row}`).merge();
  sheet.getRange(`A${row}`).values = [[heading]];
  sheet.getRange(`A${row}:H${row}`).format = {
    fill: statusColor,
    font: { bold: true, color: palette.ink, size: 12 },
    verticalAlignment: "middle",
  };
  sheet.getRange(`A${row}:H${row}`).format.rowHeightPx = 30;

  const headerRow = row + 1;
  sheet.getRange(`A${headerRow}:H${headerRow}`).values = [headers];
  sheet.getRange(`A${headerRow}:H${headerRow}`).format = {
    fill: palette.ink,
    font: { bold: true, color: palette.white },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
  };

  const bodyStart = row + 2;
  if (rows.length > 0) {
    sheet.getRangeByIndexes(bodyStart - 1, 0, rows.length, 8).values = rows;
    sheet.getRangeByIndexes(bodyStart - 1, 0, rows.length, 8).format = {
      border: { color: palette.line, style: "continuous" },
      wrapText: true,
      verticalAlignment: "top",
    };
    for (let i = 0; i < rows.length; i += 1) {
      sheet.getRangeByIndexes(bodyStart - 1 + i, 0, 1, 8).format.rowHeightPx = 42;
    }
  }
}

function notes(sheet, row, text) {
  sheet.getRange(`A${row}:H${row}`).merge();
  sheet.getRange(`A${row}`).values = [[text]];
  sheet.getRange(`A${row}:H${row}`).format = {
    fill: palette.gray,
    font: { color: palette.muted, size: 9 },
    wrapText: true,
  };
  sheet.getRange(`A${row}:H${row}`).format.rowHeightPx = 34;
}

function buildReportWorkbook({ filled }) {
  const workbook = Workbook.create();
  const page1 = workbook.worksheets.add("1_実装作業");
  const page2 = workbook.worksheets.add("2_その他業務");

  for (const sheet of [page1, page2]) setColumns(sheet);

  title(page1, filled ? "エンジニア作業報告書 1/2 - 実装作業" : "エンジニア作業報告テンプレート 1/2 - 実装作業");
  labelValueBlock(page1, [
    ["案件名", filled ? "キミと恋する15日（仮） / Unity実装" : "（案件名）", "作業期間", filled ? "2026/5/6〜2026/5/8" : "YYYY/MM/DD〜YYYY/MM/DD", "報告者", filled ? "エンジニア" : "（氏名）", "作成日", filled ? "2026/5/8" : "YYYY/MM/DD"],
    ["対象", filled ? "Unity / 仮想デスクトップ / Kimikoi ADV" : "（対象範囲）", "進捗", filled ? "主要実装完了、ログ表示など一部追加調整中" : "（進捗）", "根拠", filled ? "Git履歴・仕様書・検証SS" : "（根拠）", "版", filled ? "May-1" : "（版）"],
    ["概要", filled ? "5月最初の稼働として、仮想OS画面とKimikoi内ADVの実装土台を構築。" : "（1〜2文で概要）", "", "", "", "", "", ""],
  ]);

  const implBody = filled
    ? implementationRows.map(([area, detail, status]) => [area, "5/6〜5/8", detail, status, "", "", "", ""])
    : Array.from({ length: 8 }, () => ["（分類）", "（日付）", "（具体的な作業内容）", "（状態）", "", "", "", ""]);
  writeSection(page1, 7, "実装した作業内容", ["分類", "日付", "内容", "状態", "", "", "", ""], implBody, palette.blue2);
  notes(page1, 19, filled
    ? "補足: Web上の報告書作成例を参考に、5W1H・短文・成果/状態が見える形で整理。詳細手順ではなく、提出向けに要点化。"
    : "記入メモ: 5W1H、成果、状態、課題/対応を短く具体的に記載する。");

  title(page2, filled ? "エンジニア作業報告書 2/2 - その他業務" : "エンジニア作業報告テンプレート 2/2 - その他業務", palette.green);
  labelValueBlock(page2, [
    ["案件名", filled ? "キミと恋する15日（仮） / Unity実装" : "（案件名）", "作業期間", filled ? "2026/5/6〜2026/5/8" : "YYYY/MM/DD〜YYYY/MM/DD", "報告者", filled ? "エンジニア" : "（氏名）", "作成日", filled ? "2026/5/8" : "YYYY/MM/DD"],
    ["対象", filled ? "連絡・調整・資料整理・工数整理" : "（対象範囲）", "進捗", filled ? "整理済み" : "（進捗）", "根拠", filled ? "仕様書、Git履歴、Screenshots" : "（根拠）", "版", filled ? "May-1" : "（版）"],
    ["概要", filled ? "実装外の業務、調整、工数計算、報告書テンプレート作成を整理。" : "（1〜2文で概要）", "", "", "", "", "", ""],
  ]);

  const nonImplBody = filled
    ? nonImplementationRows.map(([area, detail, effort]) => [area, "5/6〜5/8", detail, effort, "", "", "", ""])
    : Array.from({ length: 6 }, () => ["（分類）", "（日付）", "（具体的な作業内容）", "（工数）", "", "", "", ""]);
  writeSection(page2, 7, "実装以外の業務", ["分類", "日付", "内容", "工数", "", "", "", ""], nonImplBody, palette.green2);

  const effortStart = 16;
  sheetEffort(page2, effortStart, filled);
  notes(page2, 29, filled
    ? "次回: 残ログ表示、Prefab設定、実機/Editor上の動作確認を継続し、必要に応じて仕様書との差分を更新。"
    : "記入メモ: 実装外業務は、連絡、仕様確認、調整、工数算出、資料整理、検証記録を分ける。");

  return workbook;
}

function sheetEffort(sheet, startRow, filled) {
  sheet.getRange(`A${startRow}:H${startRow}`).merge();
  sheet.getRange(`A${startRow}`).values = [["工数計算"]];
  sheet.getRange(`A${startRow}:H${startRow}`).format = {
    fill: palette.amber2,
    font: { bold: true, color: palette.amber, size: 12 },
    verticalAlignment: "middle",
  };

  const headerRow = startRow + 1;
  sheet.getRange(`A${headerRow}:D${headerRow}`).values = [["区分", "予定h", "実績h", "差異h"]];
  sheet.getRange(`A${headerRow}:D${headerRow}`).format = {
    fill: palette.ink,
    font: { bold: true, color: palette.white },
    horizontalAlignment: "center",
  };

  const rows = filled
    ? effortRows.map(([name, actual]) => [name, "", actual, ""])
    : Array.from({ length: 6 }, () => ["（区分）", "", "", ""]);
  sheet.getRangeByIndexes(headerRow, 0, rows.length, 4).values = rows;
  for (let i = 0; i < rows.length; i += 1) {
    const excelRow = headerRow + 1 + i;
    sheet.getRange(`D${excelRow}`).formulas = [[`=IF(OR(B${excelRow}="",C${excelRow}=""),"",C${excelRow}-B${excelRow})`]];
  }
  const totalRow = headerRow + 1 + rows.length;
  sheet.getRange(`A${totalRow}:D${totalRow}`).values = [["合計", "", "", ""]];
  sheet.getRange(`B${totalRow}`).formulas = [[`=SUM(B${headerRow + 1}:B${totalRow - 1})`]];
  sheet.getRange(`C${totalRow}`).formulas = [[`=SUM(C${headerRow + 1}:C${totalRow - 1})`]];
  sheet.getRange(`D${totalRow}`).formulas = [[`=IF(OR(B${totalRow}="",C${totalRow}=""),"",C${totalRow}-B${totalRow})`]];
  sheet.getRangeByIndexes(headerRow, 0, rows.length + 2, 4).format = {
    border: { color: palette.line, style: "continuous" },
    wrapText: true,
    verticalAlignment: "middle",
  };
  sheet.getRange(`A${totalRow}:D${totalRow}`).format = {
    fill: palette.gray,
    font: { bold: true },
    border: { color: palette.line, style: "continuous" },
  };
  sheet.getRange(`B${headerRow + 1}:D${totalRow}`).format.numberFormat = "0.0";
}

async function exportAndVerify(workbook, fileName) {
  const page1 = await workbook.inspect({
    kind: "table",
    range: "1_実装作業!A1:H22",
    include: "values,formulas",
    tableMaxRows: 24,
    tableMaxCols: 8,
    maxChars: 5000,
  });
  console.log(page1.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "final formula error scan",
    maxChars: 2000,
  });
  console.log(errors.ndjson);

  for (const sheetName of ["1_実装作業", "2_その他業務"]) {
    const preview = await workbook.render({
      sheetName,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const bytes = new Uint8Array(await preview.arrayBuffer());
    await fs.writeFile(path.join(outputDir, `${fileName}_${sheetName}.png`), bytes);
  }

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  const fullPath = path.join(outputDir, `${fileName}.xlsx`);
  await xlsx.save(fullPath);
  return fullPath;
}

await fs.mkdir(outputDir, { recursive: true });

const template = buildReportWorkbook({ filled: false });
const report = buildReportWorkbook({ filled: true });

const templatePath = await exportAndVerify(template, "engineer_weekly_report_template");
const reportPath = await exportAndVerify(report, "engineer_weekly_report_20260506_20260508");

console.log(JSON.stringify({ templatePath, reportPath }, null, 2));
