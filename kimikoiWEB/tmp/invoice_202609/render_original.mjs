import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("C:/Users/ihogo/Downloads/VA業務/請求書_本番7月末.xlsx");
const wb = await SpreadsheetFile.importXlsx(input);
const preview = await wb.render({
  sheetName: "10％、源泉あり",
  range: "A1:L40",
  scale: 2,
  format: "png",
});
await fs.writeFile(
  "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/tmp/invoice_202609/preview_original_7gatsu.png",
  new Uint8Array(await preview.arrayBuffer()),
);
