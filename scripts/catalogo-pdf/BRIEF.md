# Extracción del catálogo PDF de Mercería Avíos → JSON estructurado

Mercería Avíos (Montevideo, Uruguay) manda por WhatsApp un PDF de 718 páginas con todo
su catálogo. Lo estamos pasando a un sitio web. Tu trabajo: convertir UN TRAMO de páginas
en productos estructurados, mirando cada página. Otros agentes hacen los otros tramos.

Regla dura del proyecto: **no se inventa ningún precio, medida, código ni material.**
Todo sale del PDF. Lo que no está, va `null` y se anota en `needs_review`.

## Qué tenés

Todo está en la carpeta `extraccion/` (rutas relativas a esa carpeta):

- `in/batch-NN.txt` — tu tramo. Por página: las líneas de texto EXACTAS del PDF
  (`T [x0,y0,x1,y1] texto`) y las fotos (`IMG x123 zona=[x0,y0,x1,y1] original=WxHpx`).
  Coordenadas en un lienzo de 960×540 con origen arriba a la izquierda.
- `p960/pNNN.jpg` — la página renderizada a 960×540 (mismas coordenadas que el txt).
  **Tenés que mirar TODAS las páginas de tu tramo** (leé varias por turno, en paralelo).
- `pages/pNNN.jpg` — la misma página a 1440×810, por si algo no se lee bien.
- `tools/validate.py` — validador. Tu salida tiene que pasarlo sin errores.

Los precios y textos tomalos del `.txt` (es el texto real del PDF, sin errores de lectura).
Las imágenes sirven para entender QUÉ es cada cosa, qué foto corresponde a qué producto,
qué etiqueta (número de modelo / nombre de color) está sobre qué foto, y de qué color es.

Ojo: el texto de una página viene partido en líneas y a veces desordenado
("$ | 14", "N | 5"). Reconstruilo mirando la página. Los textos encimados a una foto
(números "N 3", nombres de color) identifican lo que se ve en ESA foto.

## Qué entregás

Un archivo `out/batch-NN.json` (UTF-8) con esta forma:

```json
{
  "batch": 2,
  "products": [ { ...producto... } ],
  "no_price_products": [ { "name": "...", "pages": [244], "category": "manualidades", "description": "...", "pdf_text": "...", "images": [ ... ] } ],
  "skipped_pages": [ { "page": 1, "reason": "portada" } ],
  "skipped_images": [ { "page": 1, "id": "x5", "reason": "logo decorativo" } ],
  "unused_prices": [ { "page": 113, "value": 241, "reason": "precio 'antes' de una oferta" } ]
}
```

### Producto

```json
{
  "name": "Cinta pampa",
  "pdf_text": "CINTA PAMPA 1,2 CMS. $ 64 / 1,8 CMS. $ 75 / 3,2 CMS. $ 91",
  "pages": [38, 39],
  "category": "cintas",
  "sku": null,
  "material": null,
  "badge": null,
  "description": "Cinta pampa con guarda criolla tejida, en tres anchos y doce diseños numerados. Se corta por metro.",
  "variant_axis": "modelo",
  "variants": [
    { "label": "N 1 · 1,2 cm", "hex": null, "image": "x272",
      "formats": [ { "tier": "menor", "label": "Por metro", "unit": "m", "content_qty": 1, "price": 64, "unit_price": 64, "printed": 64 } ] }
  ],
  "colors": [],
  "images": [
    { "id": "x272", "page": 38, "version": "etiquetada", "alt": "Rollos de cinta pampa negra con guarda beige, modelo N 1" }
  ],
  "wholesale_note": null,
  "needs_review": ["Unidad de venta: se asumió por metro, como el resto de las cintas"]
}
```

Campos:

- `name`: nombre prolijo en español rioplatense, en "Mayúscula inicial" (no TODO MAYÚSCULAS),
  con tildes corregidas (ALGODON → algodón, MOÑO, CORDON → cordón). Medidas como "2,5 cm",
  "4 mm". Códigos tal cual ("G 144-12"). Sin precio. Si dos productos distintos comparten
  nombre base, que el nombre los distinga (medida, código, color).
- `pdf_text`: el texto literal del PDF del que sale el producto (para auditar).
- `pages`: todas las páginas del PDF donde aparece.
- `category`: uno de los slugs de la lista de abajo.
- `sku`: código del catálogo si lo trae ("COD 0713-49" → "0713-49", "G 144-12", "TC-128",
  "A 295", "B 8004", "M2"). Si no trae, `null`.
- `material`: sólo si el PDF lo dice (algodón, poliéster, nylon, metal, madera, plástico,
  bambú, silicona…). Si no, `null`.
- `badge`: "Oferta" si el PDF lo marca como oferta; si no, `null`.
- `description`: 1 o 2 oraciones, directas, voz de mostrador (es-UY). Qué es, qué se ve en
  la foto (colores, diseño) y cómo se vende según el PDF (por metro, pieza de 25 yardas,
  variedad de colores…). No inventes medidas, materiales ni usos rebuscados. Si el PDF trae
  un texto de marketing largo (estilo AliExpress), resumilo en limpio.
- `variant_axis`: `"ancho"`, `"medida"`, `"color"`, `"modelo"` o `null` (una sola variante).
- `variants`: SIEMPRE al menos una. Con una sola: `label: ""` y `variant_axis: null`.
  - `label`: "4 mm (Nro 0)", "N 7", "Bordó", "Chico"… Únicos dentro del producto.
  - `hex`: color aproximado `#rrggbb` mirando la foto, SÓLO cuando el eje es `color`. Si no, `null`.
  - `image`: id de la foto donde se ve ESA variante (si se puede saber). Si no, `null`.
  - `formats`: cómo se vende (ver abajo). Al menos uno.
- `colors`: colores con nombre que el PDF menciona o etiqueta, cuando el producto ya varía
  por otro eje (ancho/medida) y por eso los colores no pueden ser variantes:
  `[{ "name": "Verde inglés", "hex": "#2f6b4f" }]`. Si los colores ya son las variantes, `[]`.
- `images`: fotos del producto, la mejor foto de tapa primero.
  - `id` y `page`: del `.txt`.
  - `version`: `"etiquetada"` si el texto encimado identifica modelos, colores o medidas que el
    comprador necesita para elegir (N 3, BORDÓ, 17/18/19); `"limpia"` en cualquier otro caso
    (la foto se recorta SIN el texto de encima; usala también cuando lo que la pisa es un
    título o un precio).
  - `alt`: qué se ve, corto, en español ("Rollos de cinta de raso en varios colores").
- `wholesale_note`: frases como "Consulte por mayor", "Consultar precios por mayor",
  "Pieza x 25 yardas" cuando NO alcanzan para armar una presentación por mayor con precio.
- `needs_review`: lista de cosas que interpretaste y la dueña debería confirmar. Vacía si
  no hay dudas.

### Presentaciones (`formats`)

Cada presentación: `tier` ("menor" = suelto / "mayor" = presentación cerrada o precio por
mayor), `label`, `unit` ("m", "yd" o "u"), `content_qty` (cuánto trae UNA presentación),
`price` (precio de UNA presentación), `unit_price` (precio por unidad base), `printed`.

- Tiene que cerrar: `unit_price × content_qty = price`.
- `printed` = el número TAL CUAL está impreso en el PDF en el que se apoya esa presentación
  (el validador lo busca en el texto de la página). Si el precio es derivado (un "20 % menos"),
  `printed: null` y agregá `"derived_from": "20 % menos sobre $ 22"`.

Casos (usá exactamente estos patrones):

| En el PDF | Presentación |
|---|---|
| `$ 64` de algo que se corta (cinta, galón, puntilla, elástico, fleco, cordón…) / `$ 64 EL METRO` | `{"tier":"menor","label":"Por metro","unit":"m","content_qty":1,"price":64,"unit_price":64,"printed":64}` |
| `$13 EL METRO X PIEZA DE 100 METROS $ 3,96` (el 2º número es el precio POR METRO llevando la pieza) | la de arriba con 13, MÁS `{"tier":"mayor","label":"Pieza cerrada · 100 m","unit":"m","content_qty":100,"price":396,"unit_price":3.96,"printed":3.96}` |
| `$ 108 EL METRO / $ 430 LA PIEZA DE 5 METROS` (total de la pieza) | `{"tier":"mayor","label":"Pieza cerrada · 5 m","unit":"m","content_qty":5,"price":430,"unit_price":86,"printed":430}` |
| `$ 31` y `por pieza $ 17,60` sin decir cuántos metros trae | `{"tier":"mayor","label":"Pieza cerrada","unit":"m","content_qty":null,"price":null,"unit_price":17.6,"printed":17.6}` + needs_review |
| `$ 17` el metro y `$ 123 la pieza` sin metraje | `{"tier":"mayor","label":"Pieza cerrada","unit":"u","content_qty":1,"price":123,"unit_price":123,"printed":123}` + needs_review "metraje de la pieza" |
| `PIEZA x 50 METROS 20 % menos` sobre $ 22 | `{"tier":"mayor","label":"Pieza cerrada · 50 m","unit":"m","content_qty":50,"price":880,"unit_price":17.6,"printed":null,"derived_from":"20 % menos sobre $ 22"}` |
| `por mayor 20 % menos` sin tamaño de pieza | `{"tier":"mayor","label":"Por mayor","unit":"m","content_qty":null,"price":null,"unit_price":38.4,"printed":null,"derived_from":"20 % menos sobre $ 48"}` + needs_review |
| `1 CM $ 14 y 9,60 por mayor` (+ "PIEZA X 25 YRDS") | menor por metro 14, MÁS `{"tier":"mayor","label":"Por mayor","unit":"m","content_qty":null,"price":null,"unit_price":9.6,"printed":9.6}`; lo de las 25 yardas va en `wholesale_note` |
| Algo que se vende de a uno: `$ 398` | `{"tier":"menor","label":"Unidad","unit":"u","content_qty":1,"price":398,"unit_price":398,"printed":398}` |
| `CADA UNA $ 35 / PAQUETE X 10 $ 251` | Unidad 35, MÁS `{"tier":"mayor","label":"Paquete x 10","unit":"u","content_qty":10,"price":251,"unit_price":25.1,"printed":251}` |
| Sólo `PAQUETE X 10 $ 182` / `BLISTER X 24 $ 108` / `X 100 PCS $ 130` | `{"tier":"menor","label":"Paquete x 10","unit":"u","content_qty":10,"price":182,"unit_price":18.2,"printed":182}` |
| `$ 14 LA DOCENA` | `{"tier":"menor","label":"Docena","unit":"u","content_qty":12,"price":14,"unit_price":1.1667,"printed":14}` |
| `$ 10 el par` / `el juego` / `el ramo` / `el set` | `{"tier":"menor","label":"Par","unit":"u","content_qty":1,"price":10,"unit_price":10,"printed":10}` (label "Juego", "Ramo", "Set") |
| `$ 9 C/U · POR MAYOR $ 6` (por unidad) | Unidad 9, MÁS `{"tier":"mayor","label":"Por mayor","unit":"u","content_qty":null,"price":null,"unit_price":6,"printed":6}` + needs_review "cantidad mínima por mayor" |
| Rollo/cono/ovillo que ES el artículo (`CONO 5000 YRDS $ 119`, `2 MM x 100 METROS $ 319`) | `{"tier":"menor","label":"Cono · 5000 yd","unit":"u","content_qty":1,"price":119,"unit_price":119,"printed":119}` |
| El mismo hilo en dos largos (`CONO DE 169 METROS $ 273` y `ROLLITO DE 10 METROS $ 43`) | `{"tier":"menor","label":"Rollito · 10 m","unit":"m","content_qty":10,"price":43,"unit_price":4.3,"printed":43}` y `{"tier":"mayor","label":"Cono · 169 m","unit":"m","content_qty":169,"price":273,"unit_price":1.6154,"printed":273}` |
| `$ 9 EL METRO` y `ROLLO 110 YRDS $ 550` | Por metro 9, MÁS `{"tier":"mayor","label":"Rollo · 110 yd","unit":"yd","content_qty":110,"price":550,"unit_price":5,"printed":550}` |
| `$ 43 C-U · CAJA X 12` (sin precio de caja) | Unidad 43; "Caja x 12" va en `wholesale_note` |
| `ANTES $ 241 AHORA $ 195` | precio 195, `badge: "Oferta"`, y 241 va a `unused_prices` |
| `DESDE $ 20 · CONSULTAR MODELOS` | `{"tier":"menor","label":"Unidad (desde)","unit":"u","content_qty":1,"price":20,"unit_price":20,"printed":20}` + needs_review "precio 'desde': cada modelo se consulta" |
| `N 1 $ 1,6 - $ 0.70` (dos precios sin aclarar) | Unidad 1.6 MÁS "Por mayor" 0.7 (unit "u", content_qty null) + needs_review |
| Sin ningún precio (`CONSULTAR PRECIOS`) | va a `no_price_products`, no a `products` |

Si un artículo de corte no dice "el metro" pero es claramente algo que se vende por metro
(cinta, galón, puntilla, fleco, elástico, sesgo, cordón, tul angosto), usá "Por metro" y
anotá en needs_review: "Unidad de venta: se asumió por metro". Si es claramente una unidad
(tijera, alfiletero, aplique, flor, broche), usá "Unidad" sin anotar nada.

Precios con coma decimal: `$ 17,60` → `17.6`.

### Cuándo es UN producto y cuándo son varios

- Mismo título en páginas seguidas, o páginas sin título que sólo traen más fotos, más
  colores o más modelos numerados → **UN producto** con todas esas páginas y fotos
  (ej.: "CORDÓN ALGODÓN" en p. 10 y sus colores en p. 11–13; "TUL 15 CMS" p. 18–24).
- Lista de medidas con precio bajo un mismo título → **UN producto** con variantes
  (`ancho` para cintas/elásticos, `medida` para el resto).
- Modelos numerados (N 1, N 2… o 17, 18, 19… encima de las fotos) → **UN producto** con una
  variante por modelo (`variant_axis: "modelo"`, label "N 17"), cada una con su `image`.
  Si un número no se ve en ninguna foto pero la secuencia lo implica, no lo inventes.
- Si los modelos numerados siguen de corrido a través de varias medidas (Cinta pampa:
  N 1–4 en 1,2 cm, N 5–8 en 1,8 cm, N 9–12 en 3,2 cm) → un producto, labels "N 5 · 1,8 cm".
  Si cada medida/código arranca su propia numeración (Marroquí M0, M1, M2, M3) → un
  producto por medida/código.
- Colores con nombre (etiquetados en las fotos o listados en el texto):
  - si el producto NO tiene otro eje → variantes por color (`variant_axis: "color"`),
    una por color, todas con las mismas presentaciones, con `hex` y su `image`;
  - si ya varía por ancho/medida → variantes por ancho/medida y los colores en `colors`.
  - "VARIEDAD DE COLORES" / "colores surtidos" sin nombres → no es variante: va en la descripción.
- Artículos con código propio o nombre propio (GALÓN PEGAR COD G 144-12, G 144-13…;
  BORLA B 8004, B 8001) → **un producto por código**, aunque compartan página, cada uno con
  SU foto.
- Dos títulos distintos en una página → dos productos; cada foto va con el producto que
  muestra (por cercanía y por lo que se ve).
- Variantes del mismo artículo que cambian precio (CHICO $ 199 / GRANDE $ 242; FINAS $ 16 /
  GRUESAS $ 20; BLANCA / NEGRA Y CRUDA) → un producto con variantes.

Ante la duda entre separar o juntar: lo que un cliente pediría con un nombre distinto es un
producto distinto.

Aclaraciones (salieron de la prueba piloto):

- **Dos títulos que sólo difieren en un atributo** (color, tamaño, material: "CINTA
  REFLECTIVA FLÚOR $ 69" / "CINTA REFLECTIVA GRIS $ 64"; "MOÑO CHICO" / "MOÑO GRANDE") →
  UN producto con variantes. "Dos títulos → dos productos" es para artículos distintos.
- **Un título que nombra dos artículos con un solo precio** ("ESCUDO NACIONAL Y PEÑAROL
  $ 78") → un producto con variantes de `modelo`, cada una con su foto.
- **Colores sin nombre pero con una foto por color** (cada foto muestra claramente UN color
  del mismo artículo, ej. un rollo de tul por foto) → variantes por `color`, con el nombre
  básico del color que se ve (Rojo, Azul Francia, Verde agua, Fucsia flúo…), `hex`, su
  `image`, y en needs_review: "Nombres de color puestos a partir de las fotos". Si una foto
  muestra muchos colores mezclados, NO hagas variantes: describilos en la descripción.
- **Etiqueta de color/modelo al lado de la foto, no encimada** → la variante igual apunta a
  esa foto con `image`, y la foto va en versión `"limpia"`.
- **Artículos que suelen ir de a par** (cordones, plantillas, breteles, hombreras) sin que
  el PDF diga "el par" → "Unidad" + needs_review "No aclara si el precio es por par".
- **Caja, set o kit con varias piezas a un precio** → una presentación con label "Set",
  "Caja" o "Kit" (unit "u", content_qty 1). El patrón "Paquete x N" con precio unitario es
  sólo para N piezas iguales.
- **Dos largos en unidades distintas** (rollo de 10 metros y rollo de 100 yardas) → cada
  presentación en SU unidad ("m" y "yd"), tal cual el PDF.
- **Datos que sólo se leen dentro de la foto** (talles en un envase, marca en una caja) →
  no son dato del catálogo: no van a `name`, `sku`, `material` ni a las variantes. Podés
  mencionarlos en la descripción como "según el envase".
- **Variante sin foto identificable** → `image: null`. Sólo poné `image` si esa foto muestra
  de verdad esa variante (si una única foto muestra todas las medidas, repetirla está bien).
- **`needs_review` es para lo que afecta precio, unidad de venta o identidad del producto**
  (unidad asumida, precio ambiguo, pieza sin metraje, título cortado, foto dudosa). No
  anotes ausencias normales ("el PDF no dice el material", "no indica el grosor").
- **Varios códigos con UN precio y UNA foto por código** → un producto por código.
  **Varios códigos listados juntos sobre una misma foto** sin poder distinguirlos → un
  producto con variantes de `modelo` por código.
- **La misma foto (mismo id) en dos páginas con rótulos distintos** → ponela dos veces en
  `images` (una por página; lo que no se puede repetir es el par página+id) y en la variante
  agregá `"image_page": 511` para decir cuál de las dos es.
- **Dibujos o clip-art que ilustran el producto** (un lazo, una bandera chica) → van a
  `skipped_images` como decorativos, salvo que sean la única imagen del producto.
- El `label` de variante para modelos numerados es "N 17" (con N), aunque en la foto diga
  sólo "17". Si el PDF usa otro prefijo propio ("B 8004"), respetalo.

### Fotos

- Toda foto visible de tu tramo tiene que quedar asignada a un producto (o a
  `no_price_products`) o listada en `skipped_images` con el motivo (logo, decoración,
  ícono, foto repetida, tapada por otra).
- Una foto puede ir en más de un producto si de verdad muestra los dos.
- La misma foto no se repite dentro de un producto.

### Páginas y precios sin usar

- Toda página de tu tramo tiene que aparecer en algún `pages` o en `skipped_pages`
  (portada, cierre, página vacía).
- Todo número precedido por `$` en el texto tiene que ser el `printed` de alguna
  presentación de esa página, o estar en `unused_prices` con el motivo.

## Categorías (usá el slug)

- `cintas` — raso, gross, organza, pampa, hilera, de algodón o nylon para bolso y mochila, patrias, lunares, cuadrillé, rústicas, reflectiva, marroquí, cintas con código.
- `galones-flecos-y-borlas` — galones (bordados, con strass, para pegar, de pompón, de plumas), flecos, festón, pasacinta, borlas, cadenas decorativas, marabú, boas, vivos decorativos dorados/plateados.
- `puntillas-y-encajes` — puntillas de nylon, de algodón, elastizadas, broderie, tul bordado.
- `elasticos` — elásticos comunes, de lencería, "ELAS nn", elástico partido / sesgo elastizado.
- `sesgos` — sesgo acrocel, de raso, lúrex, fantasía.
- `hilos-y-lanas` — hilos de coser, conos, bobinas de hilo, encerado, chino, macramé, de bordar, ovillos, lanas, rafia, sisal, tanza, hilo elástico, hilo para souvenirs.
- `cordones-y-tientos` — cordón de algodón, cordones de calzado, cordón trenzado, colita de ratón, tiento.
- `broches-herrajes-y-velcro` — mosquetones, aros y medio aros de metal, hebillas, pasadores, pinzas de tirador, broches de presión / de gancho / imantados, ojalillos, argollas de llavero, alfileres de gancho, bases de broche, ventosas, velcro.
- `lenceria-y-corseteria` — copas, extensores de soutien, ganchos y broches de lencería, breteles, ballenas, hombreras, aros y pasadores de soutien.
- `agujas-y-alfileres` — agujas de mano, de máquina, colchoneras, de lana; alfileres; enhebradores; dedales.
- `tijeras-y-corte` — tijeras, tijerines, cortador rotatorio, sacabocados, abre ojales.
- `herramientas-de-costura` — alfileteros, reglas, centímetros, tizas, lápices y bolígrafos borrables, ruletas, costureros, kits y sets de costura, pinzas para tela, canastas, aplicadores de bies.
- `maquina-de-coser` — bobinas/canillas, porta bobinas, pedales, motores, pies de máquina, aceite, correas, cepillos de limpieza.
- `tejido-y-bordado` — agujas de tejer, de crochet, circulares, punto ruso, de fieltro; bastidores; kits de bordado; separadores y marcadores de punto.
- `telas-y-entretelas` — tul, TNT, fieltro, entretelas, cinta araña.
- `lentejuelas-strass-y-perlas` — lentejuelas, strass, cristales, perlas, mostacillas, caireles, hilo de perlas, tachas, apliques de strass termoadhesivos, piedras.
- `apliques-y-escudos` — apliques bordados, de perlas, infantiles; escudos; cuellos bordados; charreteras; prendedores; hebillas de strass decorativas; flores de cuero o tela para aplicar.
- `manualidades` — silicona y pistolas, telgopor, chenil, pompones, ojitos, palillos, alambre, brillantina, pintura para tela, anilina, aros de madera y de manualidades, cuentas de madera, cascabeles, stickers, plumas sueltas, hojitas, florcitas, porta chupetes, rollo mosaico espejado.
- `flores-artificiales` — flores en ramo o sueltas, ramos de novia.
- `accesorios-para-el-cabello` — tiaras, tocados, ondulines, colitas.
- `cortineria` — cinta ruflet, ganchos de cortina, sujeta cortinas, cinta ojal, entretela de cortina.
- `accesorios-de-vestimenta` — moños, tiradores, adhesivo corporal, rodilleras, guantes, moña escolar, plantillas, accesorios de danza árabe.
- `otros` — sólo si de verdad no entra en ninguna; agregá `"category_suggestion": "..."`.

## Cómo trabajar

1. Leé `in/batch-NN.txt` entero.
2. Mirá todas las páginas `p960/pNNN.jpg` de tu tramo (varias por turno). Si algo no se
   distingue, abrí `pages/pNNN.jpg`.
3. Escribí `out/batch-NN.json`. Si es largo, podés generarlo con un script de Python que
   arme la lista (ojo: nada de inventar; los números salen del txt).
4. Corré el validador desde la carpeta que contiene `extraccion/`:
   `.venv/Scripts/python extraccion/tools/validate.py NN`
   Corregí hasta que dé `ERRORES: 0`. Los avisos (WARN) revisalos uno por uno: o los
   arreglás o son esperables.
5. Respondé con un informe corto: cuántos productos, cuántos sin precio, y las dudas o
   rarezas concretas que encontraste (páginas confusas, precios ambiguos, fotos que no
   supiste a qué producto asignar). No pegues el JSON en la respuesta.

No toques nada fuera de `extraccion/out/batch-NN.json` (y scripts temporales tuyos en
`extraccion/tmp/`). No modifiques el validador ni los archivos de entrada.
