import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_MIN20_MAX40_最終.xlsx";
const outDir = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.agent/spreadsheet_work/renders";

await fs.mkdir(outDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const top = await workbook.render({
  sheetName: "本番割増_MIN20_MAX40",
  range: "C3:K21",
  format: "png",
  scale: 2,
});
await fs.writeFile(`${outDir}/honban_top.png`, Buffer.from(await top.arrayBuffer()));

const added = await workbook.render({
  sheetName: "本番割増_MIN20_MAX40",
  range: "B293:K299",
  format: "png",
  scale: 2,
});
await fs.writeFile(`${outDir}/honban_added.png`, Buffer.from(await added.arrayBuffer()));

console.log(`${outDir}/honban_top.png`);
console.log(`${outDir}/honban_added.png`);
