import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_α版.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const out = await wb.inspect({ kind: 'table', range: "'α版ダウンチャート'!A1:AD20", include: 'values,formulas', tableMaxRows: 20, tableMaxCols: 30, maxChars: 5000 });
console.log(out.ndjson);
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|循環', options: { useRegex: true, maxResults: 100 }, summary: 'formula/error scan' });
console.log('ERRORS'); console.log(errors.ndjson);
await fs.mkdir('.codex_tmp/renders', { recursive: true });
for (const [sheetName, range, filename] of [['α版ダウンチャート','A1:AD28','alpha_chart_final_cf.png'], ['α版工数','A1:L32','alpha_effort_final_cf.png']]) {
 const blob = await wb.render({ sheetName, range, scale: 1, format: 'png' });
 await fs.writeFile(`.codex_tmp/renders/${filename}`, new Uint8Array(await blob.arrayBuffer()));
 console.log('rendered', filename);
}
