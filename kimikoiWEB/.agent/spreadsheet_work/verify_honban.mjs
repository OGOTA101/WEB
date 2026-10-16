import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_MIN20_MAX40_最終.xlsx";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 6000,
  tableMaxRows: 20,
  tableMaxCols: 11,
  tableMaxCellChars: 80,
});
console.log("SUMMARY");
console.log(summary.ndjson);

const top = await workbook.inspect({
  kind: "table",
  range: "本番割増_MIN20_MAX40!C3:K19",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 9,
  tableMaxCellChars: 120,
});
console.log("TOP");
console.log(top.ndjson);

const added = await workbook.inspect({
  kind: "table",
  range: "本番割増_MIN20_MAX40!B293:K299",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log("ADDED");
console.log(added.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
