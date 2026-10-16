import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_α版11月末調整.xlsx';
const input = await FileBlob.load(path);
const wb = await SpreadsheetFile.importXlsx(input);
for (const range of ["'α版工数'!A1:K18", "'α版ダウンチャート'!A1:AD18"]) {
  const inspect = await wb.inspect({ kind: 'table', range, include: 'values,formulas', tableMaxRows: 18, tableMaxCols: 30, maxChars: 5000 });
  console.log('RANGE', range);
  console.log(inspect.ndjson);
}
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|循環', options: { useRegex: true, maxResults: 100 }, summary: 'formula/error scan' });
console.log('ERROR_SCAN');
console.log(errors.ndjson);
await fs.mkdir('.codex_tmp/renders', { recursive: true });
for (const [sheetName, range, filename] of [['α版工数','A1:K22','alpha_effort_new.png'], ['α版ダウンチャート','A1:AD22','alpha_chart_new.png']]) {
  const blob = await wb.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(`.codex_tmp/renders/${filename}`, new Uint8Array(await blob.arrayBuffer()));
  console.log('rendered', filename);
}
