import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・本番工数_時間単価見積_660万円.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const result = await workbook.inspect({
  kind: "table",
  range: "本番工数_時間見積!B2:I32",
  include: "values,formulas",
  tableMaxRows: 35,
  tableMaxCols: 10,
  tableMaxCellChars: 100,
});
console.log(result.ndjson);

const png = await workbook.render({
  sheetName: "本番工数_時間見積",
  range: "B2:Q32",
  format: "png",
  scale: 2,
});
await fs.writeFile(`${outDir}/hourly_budget.png`, Buffer.from(await png.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
