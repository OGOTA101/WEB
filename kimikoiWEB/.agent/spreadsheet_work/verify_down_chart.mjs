import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = process.env.KIMIKOI_VERIFY_WORKBOOK || "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [label, sheetName, range] of [
  ["DOWN_ESTIMATE_TOP", "本番工数", "本番工数!B3:L35"],
  ["DOWN_CHART_TOP", "ダウンチャート", "ダウンチャート!A1:AZ35"],
]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 40,
    tableMaxCols: 52,
    tableMaxCellChars: 80,
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
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
