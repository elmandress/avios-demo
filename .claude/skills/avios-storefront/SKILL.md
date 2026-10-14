---
name: avios-storefront
description: >
  Sistema de diseño, convenciones de UX y reglas de rendimiento del sitio de
  Mercería Avíos (Next.js 16 + React 19). Usar al construir o editar cualquier
  UI de la tienda, la ficha de producto, el pedido o el panel, y al tocar
  imágenes, fuentes, SEO o precios.
---

# Mercería Avíos — storefront

Marca: **Mercería Avíos** (o **Avíos**). Dueña: **Alejandra**. Mercería con local
en San José 851 esq. Andes, Montevideo. Vende por mayor y por menor. Tono es-UY
con voseo, de mostrador: directo, concreto, sin jerga.

## Qué vende este sitio (y qué NO)

Quien entra acá **ya sabe qué necesita**: cinta de 15 mm, hilo encerado negro,
plantillas del 38. No viene a inspirarse. Todo lo que retrase encontrar el
artículo y su precio está de más.

El cliente que más factura es el **mayorista** (modistas, talleres, comparsas,
revendedoras). El argumento que lo trae es que el precio por mayor está
publicado y no hay que registrarse para verlo. No esconderlo nunca.

## Modelo de precios — leer antes de tocar nada de plata

```
Producto → Variante (ancho / color / medida) → Presentación (cómo sale del local)
```

Una **presentación** es "Por metro", "Pieza cerrada · 100 m", "Cono · 169 m",
"Unidad". Tiene `tier: 'menor' | 'mayor'`, `contentQty` (cuánto trae),
`priceUyu` (lo que se cobra) y `unitPriceUyu` (lo que compara).

- El precio por mayor cuelga de la **presentación**, no del cliente. Por eso no
  hace falta login de mayorista.
- `contentQty: null` + `priceUyu: null` = la medida de la pieza está a
  confirmar. Se muestra el precio por unidad y se dice que falta el dato. **No
  inventar la medida.**
- Todo cálculo sale de `src/lib/catalog/pricing.ts`. No escribir aritmética de
  precios en un componente.
- El "desde" de la grilla y el `lowPrice` del JSON-LD salen **sólo** de
  presentaciones `menor`. Meter ahí el precio por unidad de una pieza mayorista
  publica un precio al que nadie puede comprar.

## Tokens de diseño

Fuente de verdad: el objeto `avios` en **`src/components/ui/tokens.ts`** y las
variables de `src/app/globals.css` (están duplicadas a propósito: el CSS no
puede importar de TS; si cambia una, cambian las dos).

- Superficies: `white`, `paper50`, `paper100`, `paper200`.
- Tinta: `ink900` #16181C, `ink700`, `ink500`, `ink300`, `ink100`.
- Acento fucsia de la marca: `brand500` #CA1A4B (botones) y `brand600` #B91744
  (links, foco, estado activo). Sale del logo real.
- **Verde `saving600`/`saving700`: SÓLO ahorro por mayor.** Es el código de color
  del sitio: si ves verde, estás viendo plata que te queda. No usarlo de adorno.
- Rojo `sale` #B3282F: descuentos y alertas.
- Fuentes: Fraunces por `next/font`, en UN solo peso (400), para los títulos;
  el texto corrido usa la fuente del sistema (`--font-sans` en globals.css).
  Pasar de 115 KB a 18 KB de fuentes fue la mayor baja de peso del sitio: no
  agregar pesos ni familias sin medir. Nunca `@import` de Google Fonts en CSS.
- Reusar `Button`, `Chip`, `Badge`, `Eyebrow`, `SectionTitle`, `Icon`, `Field`,
  `TextInput` de Primitives en vez de rearmarlos.
- Los estilos van en línea, junto al markup. En `globals.css` va sólo lo que no
  se puede resolver así: variables, reset, media queries, pseudo-clases y
  layouts que cambian de forma.

## Dos trampas que ya costaron caro

1. **Los tokens viven en `ui/tokens.ts`, que NO lleva `'use client'`.** Si se
   mueven de vuelta a Primitives (que sí es de cliente), todo componente de
   SERVIDOR que los importe va a recibir `undefined` en silencio y el HTML va a
   salir con `border: 1px solid undefined`. Pasó, en ocho archivos y en todas
   las rutas. Para verificarlo: `grep -c "solid undefined" .next/server/app/*.html`
   después de un build tiene que dar 0.

2. **Contraste: medir, no estimar.** `ink-500` estuvo mucho tiempo en un gris
   que daba 4,06:1 (AA pide 4,5:1) y nadie lo notó a ojo. Cualquier color nuevo
   de texto se mide contra blanco, paper-50, paper-100 y paper-200 antes de
   entrar. `ink-300` y `gold-600` son ORNAMENTO: si aparecen como color de
   texto, están mal.

## Imágenes (Next 16 — importante)

- `priority` está **deprecado**. Para el LCP: `fetchPriority="high" loading="eager"`.
- Siempre pasar `sizes`. Usar `placeholder="blur" blurDataURL={BLUR_DATA_URL}`
  (de `src/lib/media.ts`).
- Calidades permitidas, declaradas en `next.config.ts`: 82 tarjetas, 90 ficha,
  100 lightbox. Otro valor da 400.
- Relación **1:1** en tarjetas y galería: las fotos del catálogo son cuadradas o
  apaisadas.
- Un producto sin foto usa `<ProductPlaceholder categorySlug>`, que dibuja la
  ilustración de su categoría. **Nunca la foto de otro producto**, y nunca una
  foto de stock que finja ser del local.

## Escala: el navegador NO recibe el catálogo entero

- El layout manda sólo categorías, descuentos y textos (`CatalogProvider`).
- Grilla, buscador y "mi lista": tarjetas livianas (`lib/catalog/tarjeta.ts`)
  desde `/indice.json`, que se baja sólo cuando hace falta (`useIndice`).
- Carrito: productos completos de a uno desde `/datos/<slug>` (`useProductos`).
- Una página nueva que necesite productos los recibe por props desde su
  `page.tsx` (servidor), nunca del marco.
- Enlaces: `<Enlace>` (precarga por intención), no `<Link>` a secas: cada
  precarga son 5–7 pedidos y en Netlify cada pedido cuesta créditos.
- Para medir con miles de artículos: `AVIOS_ESCALA=3000 npm run build`.

## Reglas de UX del rubro

- Las presentaciones son **tarjetas visibles**, nunca un desplegable: el
  desplegable esconde justo el argumento de venta.
- La cantidad SIEMPRE dice de qué es ("Cantidad · metros" vs "· piezas"). Un "2"
  mudo puede ser dos metros o dos piezas de cien.
- Antes del botón de agregar va el bloque "Vas a pedir…": cantidad, contenido
  total y precio. Es el recibo previo.
- Mínimo táctil 44 px. Foco visible en todo lo interactivo.
- En grids CSS usar `minmax(0, 1fr)`, **nunca `1fr` solo**: con `1fr` los hijos
  tienen `min-width: auto` y un contenido ancho desborda la página en mobile.
  Las tablas anchas van dentro de `.scroll-x`.
- Para medir desborde en mobile usar `document.body.scrollWidth`, **no**
  `document.documentElement.scrollWidth`: con `body { overflow-x: hidden }` este
  último reporta el contenido sin recortar y da falsos positivos por cualquier
  tabla que scrollea dentro de su contenedor.
- Estados vacíos con salida (un botón al catálogo), nunca un callejón.

## Señales comerciales

- `wholesaleUpgrade()` (pricing.ts) compara lo que el comprador lleva suelto
  contra la pieza cerrada. Se muestra en la ficha y en el carrito. **No tocar el
  corte de 1,4×**: por encima de eso el aviso empuja a gastar de más y quema la
  credibilidad de todos los demás.
- El verde sigue reservado al ahorro. El aviso de mayoreo es verde porque es
  exactamente eso.
- Una búsqueda sin resultado nunca termina en un callejón: se ofrece preguntarla
  por WhatsApp con el término, y se registra en `lib/search/log.ts`.
- Prueba social sólo si es real y está fresca. El número de seguidores vive en
  SETTINGS y el bloque se esconde solo si se vacía.

## Cómo NO parecer hecho a máquina

Los tres tells que este sitio tuvo y hay que evitar que vuelvan:

1. **Grids de íconos repetidos.** Si una sección es "ícono + título + frase" por
   tres o cuatro, y ya hay otra igual en la página, hay que cambiarla por
   información concreta.
2. **Simetría en todo.** Dos columnas iguales, tres pasos, cuatro tarjetas. Al
   menos una sección de la página tiene que romper el patrón (ver `.shop-strip`,
   que va 1,15fr / 0,85fr).
3. **Títulos sin contenido.** "Del catálogo" no dice nada; "Lo que más sale" sí.

## Contenido

- Los textos editables viven en `SETTINGS` (`src/lib/catalog/data.ts`) y se ven
  listados en `/panel/textos`. No hardcodear copy que la dueña debería controlar.
- El sitio muestra una parte del catálogo del local: cuando corresponda, decirlo
  ("en el local hay bastante más") en vez de fingir que está todo.

## Accesibilidad

- Nombre accesible en todo control de sólo ícono (`aria-label`).
- `aria-expanded` / `aria-controls` en desplegables y menús.
- `alt` con sentido, o `alt=""` si es decorativa. Respetar el orden de encabezados.
- Respetar `prefers-reduced-motion`.

## Panel (/panel)

- Todo el panel es de cliente y trabaja sobre `src/lib/admin/store.ts`, que
  guarda el catálogo ENTERO en localStorage la primera vez que alguien edita.
- Al guardar un producto se corre `checkCatalogIntegrity` — la misma verificación
  que el build. Si el panel deja guardar algo, el sitio lo acepta.
- Las tres cifras de una presentación (total, contenido, precio por unidad) se
  recalculan entre sí en el formulario: nunca se guarda una combinación que no
  cierre.
- Las fotos se comprimen a 900 px / JPEG 0.72 antes de guardarse. localStorage
  tiene ~5 MB en total: una foto de celular cruda lo llena sola.
- El login es de mentira y lo dice en pantalla. No agregar nada sensible al
  panel mientras siga así.

## No hacer

- No reintroducir datos de prueba ni "guardados" que no guardan nada.
- No agregar un email público (el contacto es WhatsApp + Instagram).
- No inventar precios, medidas, mínimos de compra ni plazos de envío.
