#!/usr/bin/env python3
"""Make the 7-slide deck for the NASA project-submission system from the main deck.
Keeps slides 1, 4, 5, 6, 8, 9, 13; removes animations (readers see the final state) and adds a credit line.
Usage: python3 build/make_nasa7.py   (after build_deck.js + postprocess.py)"""
import copy
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from lxml import etree

KEEP = [1, 4, 5, 6, 8, 9, 13]
prs = Presentation("build/out/LUNARSEYE_deck.pptx")
ids = prs.slides._sldIdLst
all_ids = list(ids)
for i, sld in enumerate(all_ids, 1):
    if i not in KEEP:
        prs.part.drop_rel(sld.rId)
        ids.remove(sld)
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
for s in prs.slides:
    for t in s._element.findall("{%s}timing" % P):
        s._element.remove(t)
# drop the section list (it names removed slides)
for ext in prs.part._element.xpath("//p:extLst/p:ext[@uri='{521415D9-36F7-43E2-AB2F-B90AF26B5E84}']"):
    ext.getparent().remove(ext)
# credit line on the last slide, bottom-left (clear of the footer)
last = prs.slides[len(KEEP) - 1]
tb = last.shapes.add_textbox(Inches(0.6), Inches(6.62), Inches(9.0), Inches(0.4))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]
r = p.add_run()
r.text = ("Data credit: NASA LRO/LOLA, GSFC PGDA, NAIF SPICE (DE440), SVS Moon Kit, JPL Horizons. Full references in the project description. "
          "AI use: Claude Code helped write the code. Independent project, not endorsed by NASA.")
r.font.size = Pt(11); r.font.name = "Calibri"; r.font.color.rgb = RGBColor(0xC3, 0xCB, 0xD6)
prs.save("LUNARSEYE_nasa_7slides.pptx")
# declare .jpg as image/jpeg (python-pptx keeps the original names but pptxgenjs wrote jpeg parts without a default)
import zipfile, shutil
src = "LUNARSEYE_nasa_7slides.pptx"; tmp = src + ".tmp"
with zipfile.ZipFile(src) as zi, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        data = zi.read(it.filename)
        if it.filename == "[Content_Types].xml" and b'Extension="jpg"' not in data:
            data = data.replace(b"<Default ", b'<Default Extension="jpg" ContentType="image/jpeg"/><Default ', 1)
        zo.writestr(it, data)
shutil.move(tmp, src)
print("saved", len(prs.slides), "slides")
