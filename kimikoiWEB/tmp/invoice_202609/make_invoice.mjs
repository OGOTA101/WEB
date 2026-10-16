import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Downloads/VA業務/請求書_本番7月末.xlsx";
const outputPath = "C:/Users/ihogo/Downloads/VA業務/請求書_本番9月末.xlsx";
const previewPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/tmp/invoice_202609/preview_9gatsu.png";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("10％、源泉あり");

sheet.getRange("K6").values = [["発行日：2026年09月30日"]];
sheet.getRange("D17").values = [["2026年10月26日"]];

sheet.getRange("B21").values = [["8月～9月末"]];
sheet.getRange("C21").values = [["ホラゲ本開発　第2フェーズ分"]];
sheet.getRange("E21").values = [[1]];
sheet.getRange("F21").values = [["式"]];
sheet.getRange("G21").values = [[1350000]];
sheet.getRange("I21").values = [[0.1]];

sheet.getRange("B22").values = [["8月～9月末"]];
sheet.getRange("C22").values = [["交通費（8月～9月分）"]];
sheet.getRange("E22").values = [[1]];
sheet.getRange("F22").values = [["式"]];
sheet.getRange("G22").values = [[2136]];
sheet.getRange("I22").values = [[0]];

sheet.getRange("B23").values = [["8月～9月末"]];
sheet.getRange("C23").values = [["固定IPアドレスライセンス代"]];
sheet.getRange("E23").values = [[1]];
sheet.getRange("F23").values = [["式"]];
sheet.getRange("G23").values = [[980]];
sheet.getRange("I23").values = [[0.1]];

sheet.getRange("B40").values = [[
  "※上記「ホラゲ本開発 第2フェーズ分」には、対象期間内の成果物\n" +
  "作業、週次作業報告書/ビルドファイル/開発資料テンプレート等の作成費用が含まれております。\n" +
  "※交通費は出社記録に基づき、2026年8月～9月分を計上しています。\n" +
  "※固定IPアドレスライセンス代はロリポップ！固定IPアクセスのお支払い履歴に基づき、2026年8月～9月分を計上しています。"
]];

workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  sheetId: "10％、源泉あり",
  range: "A1:K40",
  include: "values,formulas",
  tableMaxRows: 40,
  tableMaxCols: 11,
  maxChars: 12000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "10％、源泉あり", range: "A1:K40", scale: 2, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewPath }));
