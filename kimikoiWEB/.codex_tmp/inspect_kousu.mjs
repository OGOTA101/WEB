import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_自動化完成版.xlsx';
const input = await FileBlob.load(inputPath);
const wb = await SpreadsheetFile.importXlsx(input);
const overview = await wb.inspect({ kind: 'workbook,sheet,table,drawing', maxChars: 12000, tableMaxRows: 5, tableMaxCols: 8, tableMaxCellChars: 80 });
console.log(overview.ndjson);
