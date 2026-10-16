import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const input = await FileBlob.load("C:/Users/ihogo/Downloads/VA業務/請求書_本番9月末.xlsx");
const wb = await SpreadsheetFile.importXlsx(input);
const sheet = wb.worksheets.getItem("10％、源泉あり");
const check = await wb.inspect({kind:"formula", sheetId:"10％、源泉あり", range:"A1:K40", maxChars:8000, options:{maxResults:100}});
console.log(check.ndjson);
