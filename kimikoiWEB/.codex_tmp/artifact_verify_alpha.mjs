import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_α版11月末調整.xlsx';
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
for (const range of ["'α版工数_11月末'!A1:K16", "'α版ダウンチャート'!A1:Z16"]) {
  const table = await workbook.inspect({kind:'table', range, include:'values,formulas', tableMaxRows:16, tableMaxCols:26});
  console.log('---', range);
  console.log(table.ndjson.slice(0,3000));
}
const errors = await workbook.inspect({kind:'match', searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options:{useRegex:true, maxResults:50}, summary:'formula error scan'});
console.log('---errors---');
console.log(errors.ndjson);
