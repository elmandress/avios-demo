"""Recorta una foto tal como se ve en la página. clean=True saca el texto de encima."""
import pymupdf, re, json
PDF = r"D:\PhoneLink\New folder\42a358d347c94227aad51bab45698767.pdf"
_doc = None; _clean = None
IMG = json.load(open("extraccion/images.json", encoding="utf-8"))
GEOM = json.load(open("extraccion/geom.json"))

def docs():
    global _doc, _clean
    if _doc is None:
        _doc = pymupdf.open(PDF); _clean = pymupdf.open(PDF)
    return _doc, _clean

_stripped = set()
def strip_text(doc, pno):
    if pno in _stripped: return
    page = doc[pno]
    for x in page.get_contents():
        s = doc.xref_stream(x)
        doc.update_stream(x, re.sub(rb'BT.*?ET', b' ', s, flags=re.S))
    _stripped.add(pno)

def crop(page_no, xref, clean=True, max_px=1200):
    """Devuelve un Pixmap de la región visible de la imagen xref en la página (1-based)."""
    d, c = docs()
    g = next(x for x in GEOM[str(page_no)] if x["xref"] == xref)
    r = pymupdf.Rect(g["vis"])
    nat = IMG[str(xref)]
    # zoom: densidad nativa aproximada de la foto, sin pasarse de max_px en el lado largo
    info = next(i for i in d[page_no-1].get_image_info(xrefs=True) if i["xref"] == xref)
    bw = info["bbox"][2]-info["bbox"][0]; bh = info["bbox"][3]-info["bbox"][1]
    z_nat = max(nat["w"], nat["h"]) / max(bw, bh)
    z = min(z_nat, max_px / max(r.width, r.height))
    z = max(z, 1.0)
    doc = c if clean else d
    if clean: strip_text(c, page_no-1)
    return doc[page_no-1].get_pixmap(matrix=pymupdf.Matrix(z, z), clip=r, alpha=False)

if __name__ == "__main__":
    for pn, xr in ((38, 272), (38, 271), (501, None), (11, None), (2, None)):
        xs = [xr] if xr else [x["xref"] for x in GEOM[str(pn)]][:1]
        for x in xs:
            for cl in (True, False):
                p = crop(pn, x, cl); p.save(f"extraccion/_t_{pn}_{x}_{'c' if cl else 'l'}.jpg", jpg_quality=85)
                print(pn, x, cl, p.width, p.height)
