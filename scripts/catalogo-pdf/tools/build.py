"""Une los lotes extraídos y genera el catálogo del sitio.

  extraccion/out/batch-NN.json  →  avios-demo/src/lib/catalog/catalogo-pdf.json
                                   avios-demo/public/catalogo/<slug>-<n>.webp

Uso (desde la carpeta que contiene extraccion/ y avios-demo/):
    .venv/Scripts/python extraccion/tools/build.py [--sin-fotos]
"""
import glob, io, json, os, re, sys, unicodedata

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.join(HERE, "..")
SITE = os.path.join(ROOT, "..", "avios-demo")
OUT_JSON = os.path.join(SITE, "src", "lib", "catalog", "catalogo-pdf.json")
OUT_IMG = os.path.join(SITE, "public", "catalogo")
MAX_PX, QUALITY = 900, 70
CREATED = "2026-11-11T00:00:00.000Z"

CAT_ORDER = [
    "cintas", "galones-flecos-y-borlas", "puntillas-y-encajes", "elasticos", "sesgos",
    "hilos-y-lanas", "cordones-y-tientos", "broches-herrajes-y-velcro", "lenceria-y-corseteria",
    "agujas-y-alfileres", "tijeras-y-corte", "herramientas-de-costura", "maquina-de-coser",
    "tejido-y-bordado", "telas-y-entretelas", "lentejuelas-strass-y-perlas", "apliques-y-escudos",
    "manualidades", "flores-artificiales", "accesorios-para-el-cabello", "cortineria",
    "accesorios-de-vestimenta",
]


def slugify(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", t))


def r2(x):
    return round(x + 1e-9, 2)


def load_batches():
    prods, noprice = [], []
    for f in sorted(glob.glob(os.path.join(ROOT, "out", "batch-*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        for p in d.get("products", []):
            p["_batch"] = d.get("batch"); prods.append(p)
        for p in d.get("no_price_products", []):
            p["_batch"] = d.get("batch"); p["_noprice"] = True; noprice.append(p)
    fixes = os.path.join(ROOT, "fixes.py")
    if os.path.exists(fixes):
        ns = {}
        exec(open(fixes, encoding="utf-8").read(), ns)
        prods, noprice = ns["apply"](prods, noprice)
    return prods, noprice


def export_image(page, img_id, version, dest):
    """Recorta la foto como se ve en la página y la guarda en WebP. Con caché por archivo."""
    if os.path.exists(dest):
        return
    import crops
    from PIL import Image
    pm = crops.crop(page, int(img_id[1:]), clean=(version != "etiquetada"), max_px=MAX_PX)
    im = Image.frombytes("RGB", (pm.width, pm.height), pm.samples)
    im.save(dest, "WEBP", quality=QUALITY, method=4)


def build(with_photos=True):
    prods, noprice = load_batches()
    os.makedirs(OUT_IMG, exist_ok=True)
    slugs, out, colors_all = set(), [], {}
    fmt_ids = set()
    wanted_files = set()
    everything = sorted(prods + noprice, key=lambda p: (min(p["pages"]), p.get("name", "")))
    order = 0
    for p in everything:
        base = slugify(p["name"]) or "producto"
        if p.get("sku") and slugify(p["sku"]) not in base:
            base_try = base
        slug = base
        if slug in slugs and p.get("sku"):
            slug = f'{base}-{slugify(p["sku"])}'
        n = 2
        while slug in slugs:
            slug = f"{base}-{n}"; n += 1
        slugs.add(slug)
        order += 1

        # fotos
        media, idx_of = [], {}
        for i, im in enumerate(p.get("images", [])):
            ver = "e" if im["version"] == "etiquetada" else "l"
            fn = f"{slug}-{i + 1}.webp"
            # el nombre incluye de dónde salió, así un cambio de foto no reusa un archivo viejo
            key = f'{slug}-p{im["page"]}{im["id"]}{ver}.webp'
            wanted_files.add(key)
            if with_photos:
                export_image(im["page"], im["id"], im["version"], os.path.join(OUT_IMG, key))
            media.append({"url": f"/catalogo/{key}", "alt": im.get("alt") or p["name"], "position": i})
            idx_of.setdefault(im["id"], i)
            idx_of[(im["page"], im["id"])] = i

        # variantes
        variants = []
        for vi, v in enumerate(p.get("variants", [])):
            formats = []
            for fi, f in enumerate(v["formats"]):
                fid = f"f-{slug}-{vi + 1}-{fi + 1}"
                assert fid not in fmt_ids, fid
                fmt_ids.add(fid)
                formats.append({
                    "id": fid, "tier": f["tier"], "label": f["label"], "unit": f["unit"],
                    "contentQty": f["content_qty"],
                    "priceUyu": None if f["price"] is None else r2(f["price"]),
                    "unitPriceUyu": round(f["unit_price"], 4),
                    "available": True, "minQty": 1,
                })
            formats.sort(key=lambda f: 0 if f["tier"] == "menor" else 1)
            var = {"id": f"v-{slug}-{vi + 1}", "label": v.get("label", ""),
                   "axis": p.get("variant_axis") if v.get("label") else None,
                   "available": True, "formats": formats}
            vk = (v.get("image_page"), v.get("image"))
            if vk in idx_of:
                var["mediaIndex"] = idx_of[vk]
            elif v.get("image") in idx_of:
                var["mediaIndex"] = idx_of[v["image"]]
            if v.get("hex"):
                var["hex"] = v["hex"].lower()
            variants.append(var)

        desc = (p.get("description") or "").strip()
        note = (p.get("wholesale_note") or "").strip()
        review = list(p.get("needs_review") or [])
        status = "active"
        if p.get("_noprice"):
            status = "active"
            variants = [{"id": f"v-{slug}-1", "label": "", "axis": None, "available": True, "formats": []}]
            review.append("Sin precio en el catálogo: se muestra como 'consultar precio'")

        tones = []
        for c in p.get("colors", []):
            cid = "col-" + slugify(c["name"])
            tones.append({"id": cid, "name": c["name"], "hex": c["hex"].lower()})
            colors_all.setdefault(cid, {"id": cid, "name": c["name"], "hex": c["hex"].lower()})

        out.append({
            "id": f"p-{slug}", "slug": slug, "name": p["name"], "description": desc or None,
            "categorySlug": p["category"], "status": status, "badge": p.get("badge"),
            "sku": p.get("sku"), "material": p.get("material"), "media": media, "variants": variants,
            "colors": tones, "sortOrder": order, "createdAt": CREATED,
            "discountPercent": 0, "discountActive": False, "needsReview": review,
            "wholesaleNote": note or None,
            "priceOnRequest": bool(p.get("_noprice")),
            "sourcePages": sorted(p["pages"]),
        })

    # orden de la tienda: por categoría y, adentro, por página del PDF
    out.sort(key=lambda p: (CAT_ORDER.index(p["categorySlug"]) if p["categorySlug"] in CAT_ORDER else 99, p["sortOrder"]))
    for i, p in enumerate(out, 1):
        p["sortOrder"] = i

    json.dump({"products": out, "colors": list(colors_all.values())},
              open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # limpiar fotos que ya no se usan
    if with_photos:
        for f in os.listdir(OUT_IMG):
            if f not in wanted_files:
                os.remove(os.path.join(OUT_IMG, f))
    size = sum(os.path.getsize(os.path.join(OUT_IMG, f)) for f in os.listdir(OUT_IMG))
    print(f"{len(out)} productos, {sum(len(p['variants']) for p in out)} variantes, "
          f"{sum(len(p['media']) for p in out)} fotos ({size / 1e6:.0f} MB), "
          f"{sum(1 for p in out if p['priceOnRequest'])} a consultar")
    by = {}
    for p in out: by[p["categorySlug"]] = by.get(p["categorySlug"], 0) + 1
    for c in CAT_ORDER: print(f"  {c}: {by.get(c, 0)}")
    extra = {k: v for k, v in by.items() if k not in CAT_ORDER}
    if extra: print("  FUERA DE LISTA:", extra)


if __name__ == "__main__":
    build(with_photos="--sin-fotos" not in sys.argv)
