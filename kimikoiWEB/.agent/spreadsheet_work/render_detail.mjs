import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_詳細版.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [name, range] of [
  ["detail_top", "C3:K21"],
  ["detail_added_1", "B293:K315"],
  ["detail_added_2", "B316:K342"],
]) {
  const png = await workbook.render({
    sheetName: "本番割増_詳細",
    range,
    format: "png",
    scale: 2,
  });
  await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(await png.arrayBuffer()));
  console.log(`${outDir}/${name}.png`);
}
