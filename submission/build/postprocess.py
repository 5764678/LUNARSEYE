#!/usr/bin/env python3
"""Add slide transitions (Fade) and entrance builds (Fade) to the pptxgenjs output.

pptxgenjs cannot write animations, so this edits the slide XML directly:
  * every slide gets <p:transition spd="med"><p:fade/></p:transition>
  * out/builds.json lists, per slide, ordered steps: {trigger: "auto"|"click", names: [objectName...], delay, dur}
    - "click": appears when the presenter clicks (all names in the step appear together)
    - "auto":  starts by itself (After Previous), `delay` ms after the previous step finished
Usage: python3 build/postprocess.py [in.pptx] [out.pptx]
"""
import json
import sys
import zipfile
from pathlib import Path

from lxml import etree

HERE = Path(__file__).resolve().parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out" / "LUNARSEYE_deck_raw.pptx"
DST = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "out" / "LUNARSEYE_deck.pptx"
BUILDS = json.loads((HERE / "out" / "builds.json").read_text())

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"p": P, "a": A}


def q(tag):
    return "{%s}%s" % (P, tag)


class Ids:
    def __init__(self, start):
        self.n = start

    def next(self):
        self.n += 1
        return self.n


def effect_xml(ids, spid, node_type, dur, grp):
    a, b, c = ids.next(), ids.next(), ids.next()
    grp_attr = ' grpId="0"' if grp else ""
    return (
        f'<p:par><p:cTn id="{a}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold"{grp_attr} nodeType="{node_type}">'
        f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:set><p:cBhvr><p:cTn id="{b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
        f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
        f'<p:to><p:strVal val="visible"/></p:to></p:set>'
        f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{c}" dur="{dur}"/>'
        f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
        f"</p:childTnLst></p:cTn></p:par>"
    )


def build_timing(root, steps):
    """Return a <p:timing> element for the ordered steps, or None."""
    name_to = {}
    for sp in root.iter(q("sp"), q("pic"), q("grpSp"), q("cxnSp"), q("graphicFrame")):
        nv = sp.find(".//p:cNvPr", NS)
        if nv is not None:
            is_sp = sp.tag == q("sp")
            is_txbox = is_sp and sp.find("p:nvSpPr/p:cNvSpPr", NS) is not None and sp.find("p:nvSpPr/p:cNvSpPr", NS).get("txBox") == "1"
            has_fill = is_sp and sp.find("p:spPr/a:solidFill", NS) is not None
            name_to[nv.get("name")] = (nv.get("id"), is_sp, is_txbox, has_fill)
    # placeholder titles keep the layout's own shape name: alias them as "title-<n>"
    for sp in root.iter(q("sp")):
        ph = sp.find("p:nvSpPr/p:nvPr/p:ph", NS)
        if ph is not None and ph.get("type") == "title":
            nv = sp.find(".//p:cNvPr", NS)
            alias = [k for st in steps for k in st["names"] if k.startswith("title-")]
            for k in alias:
                name_to[k] = (nv.get("id"), True, False, False)
    missing = [n for st in steps for n in st["names"] if n not in name_to]
    if missing:
        raise SystemExit(f"build refers to unknown shape names: {missing}")

    ids = Ids(2)  # 1 = tmRoot, 2 = mainSeq
    outer = []
    bld = {}  # spid -> animBg?

    def note(spid, meta):
        _, is_sp, is_txbox, has_fill = meta
        if is_sp:
            bld[spid] = (not is_txbox) and has_fill

    auto = [s for s in steps if s["trigger"] == "auto"]
    click = [s for s in steps if s["trigger"] == "click"]
    if [s["trigger"] for s in steps] != ["auto"] * len(auto) + ["click"] * len(click):
        raise SystemExit("auto steps must come before click steps")

    if auto:
        o = ids.next()
        inner_xml = []
        t = 0
        for st in auto:
            t += st["delay"]
            i = ids.next()
            effs = []
            for k, nm in enumerate(st["names"]):
                spid, *rest = name_to[nm]
                meta = (spid, *rest)
                note(spid, meta)
                effs.append(effect_xml(ids, spid, "afterEffect" if k == 0 else "withEffect", st["dur"], meta[1]))
            inner_xml.append(f'<p:par><p:cTn id="{i}" fill="hold"><p:stCondLst><p:cond delay="{t}"/></p:stCondLst><p:childTnLst>{"".join(effs)}</p:childTnLst></p:cTn></p:par>')
            t += st["dur"]
        outer.append(
            f'<p:par><p:cTn id="{o}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
            f'<p:childTnLst>{"".join(inner_xml)}</p:childTnLst></p:cTn></p:par>'
        )
    for st in click:
        o, i = ids.next(), ids.next()
        effs = []
        for k, nm in enumerate(st["names"]):
            spid, *rest = name_to[nm]
            meta = (spid, *rest)
            note(spid, meta)
            effs.append(effect_xml(ids, spid, "clickEffect" if k == 0 else "withEffect", st["dur"], meta[1]))
        outer.append(
            f'<p:par><p:cTn id="{o}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="{i}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{"".join(effs)}</p:childTnLst></p:cTn></p:par>'
            f"</p:childTnLst></p:cTn></p:par>"
        )
    bld_xml = ""
    if bld:
        items = "".join(f'<p:bldP spid="{sp}" grpId="0"{" animBg=\"1\"" if bg else ""}/>' for sp, bg in bld.items())
        bld_xml = f"<p:bldLst>{items}</p:bldLst>"
    xml = (
        f'<p:timing xmlns:p="{P}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{"".join(outer)}</p:childTnLst></p:cTn>'
        f'<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
        f"</p:childTnLst></p:cTn></p:par></p:tnLst>{bld_xml}</p:timing>"
    )
    return etree.fromstring(xml)


def process_slide(data, n):
    root = etree.fromstring(data)
    # remove any previous transition/timing so the script is idempotent
    for tag in ("transition", "timing"):
        for el in root.findall(q(tag)):
            root.remove(el)
    anchor = root.find(q("clrMapOvr"))
    if anchor is None:
        anchor = root.find(q("cSld"))
    pos = list(root).index(anchor) + 1
    tr = etree.fromstring(f'<p:transition xmlns:p="{P}" spd="med"><p:fade/></p:transition>')
    root.insert(pos, tr)
    steps = BUILDS.get(str(n))
    if steps:
        root.insert(pos + 1, build_timing(root, steps))
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def main():
    zin = zipfile.ZipFile(SRC)
    tmp = DST.with_suffix(".tmp")
    zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
    count = 0
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.startswith("ppt/slides/slide") and item.filename.endswith(".xml"):
            n = int(item.filename[len("ppt/slides/slide"):-4])
            data = process_slide(data, n)
            count += 1
        zout.writestr(item, data)
    zout.close()
    tmp.replace(DST)
    print(f"wrote {DST} ({count} slides, {sum(len(v) for v in BUILDS.values())} build steps)")


if __name__ == "__main__":
    main()
