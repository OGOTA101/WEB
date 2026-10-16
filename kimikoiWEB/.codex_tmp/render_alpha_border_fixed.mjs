import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_α版.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|循環', options: { useRegex: true, maxResults: 100 }, summary: 'formula/error scan' });
console.log(errors.ndjson);
await fs.mkdir('.codex_tmp/renders', { recursive: true });
const blob = await wb.render({ sheetName: 'α版ダウンチャート', range: 'A1:AD28', scale: 1, format: 'png' });
await fs.writeFile('.codex_tmp/renders/alpha_chart_border_fixed.png', new Uint8Array(await blob.arrayBuffer()));
