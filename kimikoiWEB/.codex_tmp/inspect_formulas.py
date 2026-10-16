from openpyxl import load_workbook
from pathlib import Path
path=Path(r'C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_自動化完成版.xlsx')
wb=load_workbook(path, data_only=False)
ws=wb['ダウンチャート']
for row in range(1,12):
    print('ROW',row,[ws.cell(row,col).value for col in range(1,16)])
for row in range(6,12):
    print('FORM',row,[ws.cell(row,col).value for col in range(1,15)])
print('P5:Z8 formulas')
for row in range(3,9):
    print(row,[ws.cell(row,col).value for col in range(16,27)])
