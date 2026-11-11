"""Extrae de cada página: texto con posición, fotos incrustadas con posición, y un render."""
import pymupdf, json, hashlib, sys, os
PDF = r"D:\PhoneLink\New folder\42a358d347c94227aad51bab45698767.pdf"
OUT = sys.argv[1]
d = pymupdf.open(PDF)
seen = {}   # xref -> info
pages = []
for i, p in enumerate(d):
    n = i + 1
    # texto por líneas con bbox
    lines = []
    for b in p.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        for l in b["lines"]:
            t = "".join(s["text"] for s in l["spans"]).strip()
            if not t: continue
            size = max(s["size"] for s in l["spans"])
            lines.append({"t": t, "bbox": [round(x) for x in l["bbox"]], "size": round(size, 1)})
    imgs = []
    for info in p.get_image_info(xrefs=True, hashes=False):
        x = info["xref"]
        if x == 0: continue
        if x not in seen:
            try:
                pix = pymupdf.Pixmap(d, x)
                if pix.alpha or pix.colorspace is None or pix.colorspace.n > 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix) if not pix.alpha else pymupdf.Pixmap(pymupdf.csRGB, pymupdf.Pixmap(pix, 0))
                data = pix.tobytes("jpeg", jpg_quality=92)
                h = hashlib.md5(pix.samples).hexdigest()[:12]
                fn = f"x{x}.jpg"
                with open(os.path.join(OUT, "img", fn), "wb") as f: f.write(data)
                seen[x] = {"file": fn, "w": pix.width, "h": pix.height, "hash": h, "pages": []}
            except Exception as e:
                seen[x] = {"file": None, "err": str(e), "pages": []}
        seen[x]["pages"].append(n)
        imgs.append({"xref": x, "bbox": [round(v) for v in info["bbox"]], "w": info["width"], "h": info["height"]})
    pix = p.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5))
    pix.save(os.path.join(OUT, "pages", f"p{n:03d}.jpg"), jpg_quality=80)
    pages.append({"page": n, "lines": lines, "images": imgs})
    if n % 50 == 0: print(n, flush=True)
json.dump(pages, open(os.path.join(OUT, "pages.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump(seen, open(os.path.join(OUT, "images.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("pages", len(pages), "unique images", len(seen))
