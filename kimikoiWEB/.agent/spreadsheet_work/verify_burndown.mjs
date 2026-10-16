import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_バーンダウン付き_実値入り.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [label, range] of [
  ["BURNDOWN_TOP", "バーンダウン!A1:W42"],
  ["BURNDOWN_DAILY", "バーンダウン!A45:N70"],
  ["BURNDOWN_MONTHLY", "バーンダウン!P45:W70"],
]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 30,
    tableMaxCols: 20,
    tableMaxCellChars: 100,
  });
  console.log(label);
  console.log(result.ndjson);
  const png = await workbook.render({
    sheetName: "バーンダウン",
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
