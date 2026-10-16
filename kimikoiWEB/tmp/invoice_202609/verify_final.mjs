import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("C:/Users/ihogo/Downloads/VA業務/請求書_本番9月末.xlsx");
const wb = await SpreadsheetFile.importXlsx(input);

const table = await wb.inspect({
  kind: "table",
  sheetId: "10％、源泉あり",
  range: "A1:L44",
  include: "values,formulas",
  tableMaxRows: 44,
  tableMaxCols: 12,
  maxChars: 14000,
});
console.log(table.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

const preview = await wb.render({
  sheetName: "10％、源泉あり",
  range: "A1:L44",
  scale: 2,
  format: "png",
});
await fs.writeFile(
  "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/tmp/invoice_202609/preview_final.png",
  new Uint8Array(await preview.arrayBuffer()),
);
