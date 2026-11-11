# Cómo se cargó el catálogo desde el PDF

El catálogo del sitio (`src/lib/catalog/catalogo-pdf.json` y las fotos de
`public/catalogo/`) se generó a partir del PDF de 718 páginas que Avíos manda
por WhatsApp. Esta carpeta guarda el proceso para poder repetirlo cuando llegue
un PDF nuevo, y para auditar cualquier dato contra el original.

## Qué hay

- `lotes/batch-NN.json` — la extracción, en 20 tramos de páginas. Es la fuente
  de verdad intermedia: cada producto guarda el texto literal del PDF
  (`pdf_text`), las páginas (`pages`) y, por cada precio, el número tal cual
  estaba impreso (`printed`).
- `fixes.py` — correcciones al unir los lotes (artículos que el PDF repite en
  dos páginas, códigos repetidos con precios distintos).
- `BRIEF.md` — las reglas con las que se interpretó cada página: cuándo es un
  producto y cuándo varios, cómo se modela cada forma de precio, categorías.
- `tools/` — los scripts (Python + PyMuPDF + Pillow):
  - `extract.py` saca el texto con posición, las fotos y un render por página.
  - `geom.py` calcula la zona VISIBLE de cada foto (el PDF las trae recortadas).
  - `crops.py` recorta cada foto como se ve en la página, con o sin el texto
    que tiene encima (los rótulos "N 17" o "Bordó").
  - `validate.py` verifica un lote: todo precio cargado tiene que estar en el
    texto de su página, todo precio del PDF tiene que estar usado, toda foto
    asignada, y `precio por unidad × contenido = precio`.
  - `build.py` une los lotes y escribe el JSON del sitio y las fotos en WebP.

## Cómo repetirlo

Los scripts esperan esta disposición (la carpeta `extraccion/` es esta misma,
con los lotes en `out/` y los scripts en `tools/`):

    trabajo/
      extraccion/   ← tools/, out/, BRIEF.md, fixes.py
      avios-demo/   ← este repo

y la ruta del PDF en la constante `PDF` de `extract.py`, `geom.py` y `crops.py`.

    python extraccion/tools/extract.py extraccion   # texto, fotos y renders
    python extraccion/tools/geom.py                 # zonas visibles
    python extraccion/tools/prepare2.py             # entrada de cada lote
    # … extracción de cada lote siguiendo BRIEF.md …
    python extraccion/tools/validate.py 7           # tiene que dar ERRORES: 0
    python extraccion/tools/build.py                # JSON + fotos del sitio

## Qué NO hace

No inventa nada. Lo que el PDF no dice queda `null` o anotado en `needsReview`
del producto (unidad de venta asumida, pieza sin metraje, precio "desde"), y
sale como pendiente en `/panel` para que Alejandra lo confirme.
