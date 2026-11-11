"""Valida out/batch-NN.json contra el texto y las fotos reales del PDF.

Uso (desde la carpeta que contiene extraccion/):
    .venv/Scripts/python extraccion/tools/validate.py NN
"""
import json, re, sys, os

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CATS = {
    "cintas", "galones-flecos-y-borlas", "puntillas-y-encajes", "elasticos", "sesgos",
    "hilos-y-lanas", "cordones-y-tientos", "broches-herrajes-y-velcro", "lenceria-y-corseteria",
    "agujas-y-alfileres", "tijeras-y-corte", "herramientas-de-costura", "maquina-de-coser",
    "tejido-y-bordado", "telas-y-entretelas", "lentejuelas-strass-y-perlas", "apliques-y-escudos",
    "manualidades", "flores-artificiales", "accesorios-para-el-cabello", "cortineria",
    "accesorios-de-vestimenta", "otros",
}
AXES = {"ancho", "medida", "color", "modelo", None}
NUM = re.compile(r"\d+(?:[.,]\d+)?")
DOLLAR = re.compile(r"\$\s*(\d+(?:[.,]\d+)?)")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def num(s):
    return float(s.replace(",", "."))


def load():
    P = json.load(open(os.path.join(ROOT, "pages.json"), encoding="utf-8"))
    G = json.load(open(os.path.join(ROOT, "geom.json")))
    B = json.load(open(os.path.join(ROOT, "batches.json")))
    return {p["page"]: p for p in P}, G, B


def validate(n):
    P, G, B = load()
    a, b = B[n - 1]
    path = os.path.join(ROOT, "out", f"batch-{n:02d}.json")
    errs, warns = [], []
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        print(f"ERRORES: 1\n  no se pudo leer {path}: {e}")
        return 1

    def E(m): errs.append(m)
    def W(m): warns.append(m)

    page_text = {p: " ".join(l["t"] for l in P[p]["lines"]) for p in range(a, b + 1)}
    page_nums = {p: {round(num(x), 4) for x in NUM.findall(t)} for p, t in page_text.items()}
    page_dollars = {p: [round(num(x), 4) for x in DOLLAR.findall(t)] for p, t in page_text.items()}
    page_imgs = {p: {f'x{g["xref"]}' for g in G[str(p)] if g["ok"]} for p in range(a, b + 1)}

    used_pages, used_imgs, printed_by_page = set(), set(), {p: set() for p in range(a, b + 1)}
    names = {}

    def check_images(tag, pr):
        seen = set()
        for im in pr.get("images", []):
            pid = (im.get("page"), im.get("id"))
            if im.get("page") not in page_imgs:
                E(f"{tag}: foto {im.get('id')} en página {im.get('page')} fuera del tramo {a}-{b}"); continue
            if im.get("id") not in page_imgs[im["page"]]:
                E(f"{tag}: la foto {im.get('id')} no existe (o no es visible) en la página {im['page']}")
            if pid in seen: E(f"{tag}: foto repetida {pid}")
            seen.add(pid); used_imgs.add(pid)
            if im.get("version") not in ("limpia", "etiquetada"):
                E(f"{tag}: foto {im.get('id')} version inválida: {im.get('version')!r}")
            if not (im.get("alt") or "").strip(): E(f"{tag}: foto {im.get('id')} sin alt")
        return {i for _, i in seen}

    def check_common(tag, pr):
        if not (pr.get("name") or "").strip(): E(f"{tag}: sin name")
        nm = pr.get("name", "")
        if nm and nm == nm.upper() and len(nm) > 6: W(f"{tag}: name todo en mayúsculas")
        if pr.get("category") not in CATS: E(f"{tag}: categoría inválida {pr.get('category')!r}")
        if not pr.get("pages"): E(f"{tag}: sin pages")
        for p in pr.get("pages", []):
            if p not in page_text: E(f"{tag}: página {p} fuera del tramo {a}-{b}")
            else: used_pages.add(p)
        if not (pr.get("description") or "").strip(): E(f"{tag}: sin description")
        if not (pr.get("pdf_text") or "").strip(): W(f"{tag}: sin pdf_text")

    for idx, pr in enumerate(data.get("products", [])):
        tag = f'producto[{idx}] "{pr.get("name", "?")}"'
        check_common(tag, pr)
        key = (pr.get("name") or "").strip().lower()
        if key in names: E(f"{tag}: nombre duplicado en el lote (también producto[{names[key]}])")
        names[key] = idx
        ids = check_images(tag, pr)
        if not pr.get("images"): W(f"{tag}: sin fotos")
        if pr.get("variant_axis") not in AXES: E(f"{tag}: variant_axis inválido {pr.get('variant_axis')!r}")
        vs = pr.get("variants") or []
        if not vs: E(f"{tag}: sin variants"); continue
        labels = [v.get("label", "") for v in vs]
        if len(set(labels)) != len(labels): E(f"{tag}: labels de variante repetidos")
        if len(vs) > 1 and any(not l for l in labels): E(f"{tag}: variante sin label")
        if len(vs) > 1 and pr.get("variant_axis") is None: E(f"{tag}: varias variantes y variant_axis null")
        if len(vs) == 1 and labels[0] == "" and pr.get("variant_axis") is not None:
            E(f"{tag}: una sola variante sin label pero variant_axis no es null")
        pnums = set().union(*[page_nums.get(p, set()) for p in pr.get("pages", [])]) if pr.get("pages") else set()
        for v in vs:
            vt = f'{tag} variante "{v.get("label", "")}"'
            if v.get("image") and v["image"] not in ids: E(f"{vt}: image {v['image']} no está en images del producto")
            if v.get("hex") and not HEX.match(v["hex"]): E(f"{vt}: hex inválido {v['hex']!r}")
            if pr.get("variant_axis") == "color" and not v.get("hex"): W(f"{vt}: color sin hex")
            fs = v.get("formats") or []
            if not fs: E(f"{vt}: sin formats"); continue
            fl = [f.get("label") for f in fs]
            if len(set(fl)) != len(fl): E(f"{vt}: labels de presentación repetidos")
            for f in fs:
                ft = f'{vt} [{f.get("label")}]'
                if f.get("tier") not in ("menor", "mayor"): E(f"{ft}: tier inválido")
                if f.get("unit") not in ("m", "yd", "u"): E(f"{ft}: unit inválido")
                if not (f.get("label") or "").strip(): E(f"{ft}: sin label")
                up, cq, pz = f.get("unit_price"), f.get("content_qty"), f.get("price")
                if not isinstance(up, (int, float)) or up <= 0: E(f"{ft}: unit_price inválido {up!r}"); continue
                if (cq is None) != (pz is None): E(f"{ft}: content_qty y price tienen que ser null los dos o ninguno")
                elif cq is not None:
                    if cq <= 0: E(f"{ft}: content_qty <= 0")
                    elif abs(up * cq - pz) > max(0.011, 0.011 * cq):
                        E(f"{ft}: no cierra: {up} × {cq} = {up * cq:.2f} pero price = {pz}")
                pt = f.get("printed")
                if pt is None:
                    if not f.get("derived_from"): E(f"{ft}: printed null sin derived_from")
                else:
                    if round(float(pt), 4) not in pnums:
                        E(f"{ft}: printed {pt} no aparece en el texto de las páginas {pr.get('pages')}")
                    elif pz is not None and abs(pt - pz) > 0.011 and abs(pt - up) > 0.011:
                        E(f"{ft}: printed {pt} no es ni price ({pz}) ni unit_price ({up})")
                    for p in pr.get("pages", []):
                        if p in printed_by_page: printed_by_page[p].add(round(float(pt), 4))
        for c in pr.get("colors", []):
            if not c.get("name") or not HEX.match(c.get("hex") or ""): E(f"{tag}: color inválido {c}")

    for idx, pr in enumerate(data.get("no_price_products", [])):
        tag = f'sin_precio[{idx}] "{pr.get("name", "?")}"'
        check_common(tag, pr); check_images(tag, pr)

    for s in data.get("skipped_pages", []):
        if s.get("page") in page_text: used_pages.add(s["page"])
        if not s.get("reason"): E(f"skipped_pages {s.get('page')}: sin reason")
    for s in data.get("skipped_images", []):
        used_imgs.add((s.get("page"), s.get("id")))
        if not s.get("reason"): E(f"skipped_images {s}: sin reason")
    unused = {}
    for s in data.get("unused_prices", []):
        unused.setdefault(s.get("page"), []).append(round(float(s.get("value")), 4))
        if not s.get("reason"): E(f"unused_prices {s}: sin reason")

    for p in range(a, b + 1):
        if p not in used_pages: E(f"página {p}: no está en ningún producto ni en skipped_pages")
        for i in sorted(page_imgs[p]):
            if (p, i) not in used_imgs: E(f"página {p}: la foto {i} no está asignada ni en skipped_images")
        for d in page_dollars[p]:
            if d not in printed_by_page[p] and d not in unused.get(p, []):
                E(f"página {p}: el precio $ {d:g} no lo usa ninguna presentación ni está en unused_prices")

    np_ = len(data.get("products", [])); nv = sum(len(p.get("variants", [])) for p in data.get("products", []))
    print(f"lote {n} (páginas {a}-{b}): {np_} productos, {nv} variantes, "
          f"{len(data.get('no_price_products', []))} sin precio, {len(used_imgs)} fotos")
    for w in warns: print("  WARN", w)
    for e in errs: print("  ERROR", e)
    print(f"ERRORES: {len(errs)}  AVISOS: {len(warns)}")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(validate(int(sys.argv[1])))
