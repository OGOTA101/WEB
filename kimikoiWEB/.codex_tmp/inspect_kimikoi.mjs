import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_MOC検証後.xlsx",
  "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい本番見積.xlsx",
];

for (const path of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
  console.log(`\nFILE\t${path}`);
  console.log(`SHEETS\t${workbook.worksheets.items.map((s) => s.name).join("\t")}`);
  for (const sheet of workbook.worksheets.items) {
    const range = `${sheet.name}!A1:Z80`;
    const table = await workbook.inspect({
      kind: "table",
      range,
      include: "values,formulas",
      tableMaxRows: 80,
      tableMaxCols: 26,
    });
    console.log(`\nRANGE\t${range}`);
    console.log(table.ndjson);
  }
}
