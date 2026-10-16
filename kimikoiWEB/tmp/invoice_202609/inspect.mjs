import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const input = await FileBlob.load("C:/Users/ihogo/Downloads/VA業務/請求書_本番7月末.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const info = await workbook.inspect({kind:"sheet,table", maxChars:4000, tableMaxRows:6, tableMaxCols:8});
console.log(info.ndjson);
