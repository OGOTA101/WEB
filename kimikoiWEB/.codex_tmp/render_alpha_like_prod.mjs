import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_α版.xlsx';
const input = await FileBlob.load(path);
const wb = await SpreadsheetFile.importXlsx(input);
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|循環', options: { useRegex: true, maxResults: 100 }, summary: 'formula/error scan' });
console.log(errors.ndjson);
await fs.mkdir('.codex_tmp/renders', { recursive: true });
for (const [sheetName, range, filename] of [['α版工数','A1:L32','alpha_effort_like_prod.png'], ['α版ダウンチャート','A1:AD28','alpha_chart_like_prod.png']]) {
  const blob = await wb.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(`.codex_tmp/renders/${filename}`, new Uint8Array(await blob.arrayBuffer()));
  console.log('rendered', filename);
}
