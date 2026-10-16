import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_α版11月末調整.xlsx';
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
await fs.mkdir('C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.codex_tmp/renders', {recursive:true});
for (const [sheetName, range, file] of [
  ['α版工数_11月末', 'A1:K22', 'alpha_effort.png'],
  ['α版ダウンチャート', 'A1:AD22', 'alpha_chart.png']
]) {
  const blob = await workbook.render({sheetName, range, scale: 1});
  await blob.save(`C:/Users/ihogo/Desktop/WEB/kimikoiWEB/.codex_tmp/renders/${file}`);
  console.log(`${sheetName} rendered ${range}`);
}
