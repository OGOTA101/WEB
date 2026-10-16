from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import tempfile, shutil
import xml.etree.ElementTree as ET

xlsx = Path(r'C:\Users\ihogo\Downloads\VA業務\請求書_本番9月末.xlsx')
values = {
    'D11': 1488214,
    'J21': 1350000,
    'J22': 2136,
    'J23': 980,
    'J24': 0,
    'J25': 0,
    'J26': 0,
    'J27': 0,
    'J28': 0,
    'J29': 0,
    'J30': 0,
    'J31': 0,
    'J33': 1353116,
    'J34': 135098,
    'D35': 135098,
    'F35': 1350980,
    'J36': 1488214,
}
ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ET.register_namespace('', ns['main'])

tmp = Path(tempfile.mkstemp(suffix='.xlsx')[1])
with ZipFile(xlsx, 'r') as zin, ZipFile(tmp, 'w', ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'xl/worksheets/sheet1.xml':
            root = ET.fromstring(data)
            for c in root.findall('.//main:c', ns):
                ref = c.get('r')
                if ref in values:
                    v = c.find('main:v', ns)
                    if v is None:
                        v = ET.SubElement(c, f"{{{ns['main']}}}v")
                    v.text = str(values[ref])
            data = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        zout.writestr(item, data)
shutil.move(str(tmp), str(xlsx))
print(xlsx)
