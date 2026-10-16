import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_自動化完成版.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [label, sheetName, range] of [
  ["AUTO_TOP", "ダウンチャート", "ダウンチャート!A1:AZ35"],
  ["AUTO_ESTIMATE_TOP", "本番工数", "本番工数!B3:L35"],
]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 40,
    tableMaxCols: 60,
    tableMaxCellChars: 100,
  });
  console.log(label);
  console.log(result.ndjson);
  const png = await workbook.render({
    sheetName,
    range,
    format: "png",
    scale: 2,
  });
  await fs.writeFile(`${outDir}/${label.toLowerCase()}.png`, Buffer.from(await png.arrayBuffer()));
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
