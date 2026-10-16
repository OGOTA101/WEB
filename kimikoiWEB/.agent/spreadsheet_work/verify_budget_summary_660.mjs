import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・概算予算表_660万円.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const table = await workbook.inspect({
  kind: "table",
  range: "概算予算表!B2:K28",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 12,
  tableMaxCellChars: 90,
});
console.log("BUDGET_TABLE");
console.log(table.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);

const png = await workbook.render({
  sheetName: "概算予算表",
  range: "B2:K30",
  format: "png",
  scale: 2,
});
await fs.writeFile(`${outDir}/budget_summary_660.png`, Buffer.from(await png.arrayBuffer()));
