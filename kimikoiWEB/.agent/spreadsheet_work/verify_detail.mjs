import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_本番割増_詳細版.xlsx";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const top = await workbook.inspect({
  kind: "table",
  range: "本番割増_詳細!C3:K19",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 9,
  tableMaxCellChars: 120,
});
console.log("TOP");
console.log(top.ndjson);

const addedStart = await workbook.inspect({
  kind: "table",
  range: "本番割増_詳細!B293:K315",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log("ADDED_START");
console.log(addedStart.ndjson);

const addedEnd = await workbook.inspect({
  kind: "table",
  range: "本番割増_詳細!B316:K342",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log("ADDED_END");
console.log(addedEnd.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("ERRORS");
console.log(errors.ndjson);
