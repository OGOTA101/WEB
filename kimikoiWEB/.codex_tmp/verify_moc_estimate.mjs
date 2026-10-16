import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import fs from "node:fs/promises";

const path = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい本番見積_MOC検証後_再計算.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));

for (const range of ["見積!B5:K36", "明細!A1:K20"]) {
  const table = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 40,
    tableMaxCols: 12,
  });
  console.log(`RANGE ${range}`);
  console.log(table.ndjson);
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log("ERROR_SCAN");
console.log(errors.ndjson);

await fs.mkdir("C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.codex_tmp/renders", { recursive: true });
for (const sheetName of ["見積", "明細"]) {
  await workbook.render({ sheetName, range: sheetName === "見積" ? "B2:K38" : "A1:K30", scale: 1 });
  console.log(`RENDERED ${sheetName}`);
}
