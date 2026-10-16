import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const input = await FileBlob.load('C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_自動化完成版.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
console.log(await workbook.help('worksheets'));
