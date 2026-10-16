import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_再調整版.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [label, range] of [
  ["TOP", "本番割増_再調整!C3:L21"],
  ["REDUCTIONS", "本番割増_再調整!B124:L132"],
  ["REDUCTION_SKINSHIP", "本番割増_再調整!B217:L221"],
  ["REDUCTION_LOOP_ED", "本番割増_再調整!B241:L251"],
  ["REDUCTION_META", "本番割増_再調整!B268:L287"],
  ["REDUCTION_DEBUG", "本番割増_再調整!B278:L284"],
  ["ADD_1", "本番割増_再調整!B293:L321"],
  ["ADD_2", "本番割増_再調整!B322:L350"],
  ["ADD_3", "本番割増_再調整!B351:L357"],
]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 30,
    tableMaxCols: 11,
    tableMaxCellChars: 100,
  });
  console.log(label);
  console.log(result.ndjson);
  const png = await workbook.render({
    sheetName: "本番割増_再調整",
    range,
    format: "png",
    scale: 2,
  });
  await fs.writeFile(`${outDir}/rechecked_${label.toLowerCase()}.png`, Buffer.from(await png.arrayBuffer()));
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
