# Correcciones sobre los lotes extraídos, aplicadas al unirlos (build.py las ejecuta).
# Todo lo que está acá sale de comparar lotes entre sí: artículos que el PDF repite
# en dos páginas lejanas, o códigos repetidos con datos distintos.


def _find(prods, name=None, page=None, sku=None):
    out = [p for p in prods
           if (name is None or p["name"] == name)
           and (page is None or page in p["pages"])
           and (sku is None or p.get("sku") == sku)]
    return out


def _merge(prods, keep, drop, note=None):
    """Suma páginas y fotos de `drop` en `keep` y saca `drop` de la lista."""
    keep["pages"] = sorted(set(keep["pages"]) | set(drop["pages"]))
    seen = {(i["page"], i["id"]) for i in keep["images"]}
    ids = {i["id"] for i in keep["images"]}
    for im in drop["images"]:
        # la misma foto repetida en otra página no aporta nada
        if (im["page"], im["id"]) in seen or im["id"] in ids:
            continue
        keep["images"].append(im)
    keep["pdf_text"] = f'{keep.get("pdf_text", "")} // {drop.get("pdf_text", "")}'
    if note:
        keep.setdefault("needs_review", []).append(note)
    prods.remove(drop)


def apply(prods, noprice):
    # 1. Galón para pegar G 144-24: el PDF lo repite en p. 618 y p. 633, mismo precio.
    a = _find(prods, sku="G 144-24", page=618)
    b = _find(prods, sku="G 144-24", page=633)
    if a and b:
        _merge(prods, a[0], b[0])

    # 2. Galón flor 19CR206: p. 477 y p. 581, mismo código y mismo precio ($ 88).
    a = _find(prods, sku="19CR206", page=581)
    b = _find(prods, sku="19CR206", page=477)
    if a and b:
        _merge(prods, a[0], b[0])

    # 3. Código 719: dos flecos de 5 cm con precios distintos. No se unen: se avisa.
    for p in _find(prods, sku="719"):
        p.setdefault("needs_review", []).append(
            "El código 719 aparece dos veces en el catálogo con precios distintos: $ 108 (p. 88) y $ 130 (p. 679)")

    # 4. Marroquí M3: la misma foto está rotulada 12/13/14 en p. 509 y 34/35/36 en p. 511.
    for p in _find(prods, name="Marroquí M3 5 cm"):
        if not any(i["page"] == 511 and i["id"] == "x3590" for i in p["images"]):
            src = next((i for i in p["images"] if i["id"] == "x3590"), None)
            if src:
                p["images"].append({"id": "x3590", "page": 511, "version": "etiquetada",
                                    "alt": "Cintas marroquí de 5 cm, modelos N 34, N 35 y N 36"})
                for v in p["variants"]:
                    if v["label"] in ("N 34", "N 35", "N 36"):
                        v["image"] = "x3590"; v["image_page"] = 511
                    elif v["label"] in ("N 12", "N 13", "N 14"):
                        v["image"] = "x3590"; v["image_page"] = 509

    return prods, noprice
