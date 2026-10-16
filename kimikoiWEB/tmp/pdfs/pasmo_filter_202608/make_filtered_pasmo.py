from pathlib import Path
import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import white, black

src = Path(r'C:\Users\ihogo\Downloads\PB80F325011156957_20260219_20260824120840_8.pdf')
out_dir = Path(r'C:\Users\ihogo\Desktop\WEB\kimikoiWEB\tmp\pdfs\pasmo_filter_202608')
out_dir.mkdir(parents=True, exist_ok=True)
overlay_pdf = out_dir / 'overlay_tmp.pdf'
merged_pdf = out_dir / 'overlay_merged_tmp.pdf'
final_out = Path(r'C:\Users\ihogo\Downloads\PB80F325011156957_20260219_20260824120840_8月以降_物販除外.pdf')

kept = [
    ('08','03','入','湯島','出','神谷町','9,383','-178'),
    ('08','03','入','神谷町','出','湯島','8,985','-178'),
    ('08','06','入','御徒町','出','御徒町','6,665','-160'),
    ('08','07','入','湯島','出','神谷町','6,487','-178'),
    ('08','07','入','神谷町','出','湯島','6,170','-178'),
    ('08','08','入','御徒町','出','東京','5,493','-155'),
    ('08','08','ﾊﾞｽ等','ＳＪＬ','','','5,193','-300'),
    ('08','10','ﾊﾞｽ等','ＳＪＬ','','','4,983','-210'),
    ('08','10','ﾊﾞｽ等','ＳＪＬ','','','4,683','-300'),
    ('08','10','入','東京','出','御徒町','4,379','-155'),
    ('08','15','入','湯島','出','地日比谷','4,201','-178'),
    ('08','15','入','地日比谷','出','湯島','4,023','-178'),
    ('08','17','入','上御徒町','出','春日','3,845','-178'),
    ('08','17','入','春日','出','上御徒町','3,667','-178'),
    ('08','22','入','上野','出','御徒町','3,292','-155'),
]

font_path = r'C:\Windows\Fonts\msgothic.ttc'
pdfmetrics.registerFont(TTFont('MSGothicLocal', font_path, subfontIndex=0))

# Build overlay that whites out the original variable areas and redraws the filtered rows.
packet = io.BytesIO()
c = canvas.Canvas(packet, pagesize=(720, 792))
c.setFillColor(white)
c.setStrokeColor(white)
# Count after the title.
c.rect(254, 708, 46, 12, stroke=0, fill=1)
# Body list area on page 2, including original stars/rows.
c.rect(151, 118, 390, 568, stroke=0, fill=1)
# Page number area.
c.rect(157.5, 39.2, 26, 10.5, stroke=0, fill=1)

c.setFillColor(black)
c.setStrokeColor(black)
c.setFont('MSGothicLocal', 9)
c.drawString(257.5, 710.05, f'（{len(kept)}件）')

x_month, x_day, x_kind1 = 158.5, 185.5, 212.5
x_station1, x_kind2, x_station2 = 280.0, 343.0, 401.5
x_balance_r, x_diff_r = 485.2, 536.0
baseline = 792 - 115.3355 + 0.05
step = 10.9
for idx, row in enumerate(kept):
    month, day, kind1, station1, kind2, station2, balance, diff = row
    y = baseline - step * idx
    c.drawString(x_month, y, month)
    c.drawString(x_day, y, day)
    c.drawString(x_kind1, y, kind1)
    c.drawString(x_station1, y, station1)
    if kind2:
        c.drawString(x_kind2, y, kind2)
    if station2:
        c.drawString(x_station2, y, station2)
    c.drawRightString(x_balance_r, y, '\\' + balance)
    c.drawRightString(x_diff_r, y, diff)

# Redraw bottom rule and one-page pagination in the original style.
c.line(135, 40.0, 555, 40.0)
c.drawString(158.38, 40.08, '(1/1)')
c.save()
packet.seek(0)
overlay_pdf.write_bytes(packet.read())

reader = PdfReader(str(src))
if len(reader.pages) < 2:
    raise RuntimeError('source PDF does not have a second page to use as layout base')
base_page = reader.pages[1]
overlay_page = PdfReader(str(overlay_pdf)).pages[0]
base_page.merge_page(overlay_page)
writer = PdfWriter()
writer.add_page(base_page)
with merged_pdf.open('wb') as f:
    writer.write(f)
print(merged_pdf)
print(final_out)
