from zipfile import ZipFile
from pathlib import Path
p=Path(r'C:\Users\ihogo\Downloads\VA業務\請求書_本番9月末.xlsx')
with ZipFile(p) as z:
    print([n for n in z.namelist() if n.startswith('xl/worksheets/sheet')][:5])
    data=z.read('xl/worksheets/sheet1.xml').decode('utf-8')
    for cell in ['D11','J21','J22','J23','J24','J33','J34','D35','F35','J36']:
        idx=data.find(f'r="{cell}"')
        print('---', cell, idx)
        print(data[max(0,idx-80):idx+260] if idx!=-1 else 'missing')
