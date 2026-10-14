# La reforma — qué se hizo y por qué

Documento hermano de `AUDITORIA.md`, que releva **qué estaba mal**. Acá va **qué
se hizo con eso**. Escrito para que dentro de tres meses se entienda por qué el
código está como está.

---

## 1. El problema de fondo: el precio mayorista no era un talle

Era el parche que sostenía todo lo demás. El precio por mayor se guardaba como
**filas extra de talle**, con la condición pegada al texto de la etiqueta:

| `size` | `price_uyu` |
|---|---|
| `4 mm (Nro 0) · por metro` | 13 |
| `4 mm (Nro 0) · mayorista, pieza x100m` | 3.96 |

De ahí salían cuatro consecuencias, todas medibles:

1. **El mensaje de WhatsApp cobraba mal.** Dos piezas de 100 m se enviaban como
   `Cantidad: 2 · Subtotal: UYU 7,92`. El pedido real eran **$ 792**.
2. **Google publicaba un precio que nadie podía pagar**: `AggregateOffer.lowPrice`
   salía del mínimo de las filas, o sea **$ 3,96** — el precio por metro *dentro*
   de una pieza de 100 m.
3. **El filtro "Talle" de la tienda** ofrecía filtrar por
   *"4 mm (Nro 0) · mayorista, pieza x100m"*.
4. **Nada sabía que la pieza trae 100 metros**, así que no se podía calcular ni
   mostrar el ahorro.

### El modelo nuevo

```
Producto
 └── Variante        el atributo físico: ancho, color, medida, modelo
      └── Presentación   cómo sale del local: por metro / pieza x100 m / unidad
```

Cada presentación (`SaleFormat`) guarda `tier` (`menor` | `mayor`), `contentQty`
(cuánto trae), `priceUyu` (lo que se cobra) y `unitPriceUyu` (lo que compara).

**La decisión que ordena todo: el precio por mayor cuelga de la PRESENTACIÓN, no
del cliente.** De ahí sale la respuesta a la pregunta del encargo — ver §3.

Los tres campos de plata son redundantes a propósito: los dos precios vienen del
catálogo en papel y guardarlos ambos evita inventar redondeos. `integrity.ts`
verifica que cierren y **tira el build en desarrollo** si no.

Archivos: `src/lib/catalog/types.ts`, `pricing.ts`, `data.ts`, `integrity.ts`.

---

## 2. El flujo de compra, de punta a punta

Antes: **el carrito no funcionaba**. Era 100 % server-backed contra Supabase, y
sin base cada "Agregar" mostraba un toast de error. El flujo que la demo tenía
que probar estaba muerto.

Ahora, y en este orden:

| Paso | Qué muestra |
|---|---|
| Grilla | `desde $ 11,70 el metro` + `Por mayor −70%` |
| Ficha → variante | chips visibles con los 7 anchos |
| Ficha → presentación | dos tarjetas: `Por menor · Por metro · $ 11,70` y `Por mayor · Pieza cerrada · 100 m · $ 356,40 · $ 3,56 el metro · Ahorrás 70%` |
| Cantidad | `Cantidad · piezas` (no un "2" mudo) |
| **Antes de agregar** | `Vas a pedir 2 piezas · 200 m en total · $ 3,56 el metro` → **$ 712,80** |
| Carrito | mismo renglón, con el contenido total |
| WhatsApp | ver abajo |

```
1. Cinta de raso doble faz — 4 mm (Nro 0)
   Pieza cerrada · 100 m × 2 — $ 712,80
   Total: 200 m · $ 3,56 el metro
   (con 10% de descuento sobre $ 792)
   https://…/tienda/cinta-raso-doble-faz
```

**Verificado corriendo el código real**, no a ojo: aritmética de cada renglón,
total, y descarte de líneas huérfanas.

La regla que lo sostiene: la ficha, el carrito y el mensaje **salen de la misma
función** (`resolveCart` → `buildOrderMessage`). Cuando eso se duplica, es
cuestión de tiempo que uno quede desfasado.

El carrito pasó a **localStorage** (`useSyncExternalStore`). Para una tienda que
cobra por WhatsApp el servidor no compraba nada: no hay tabla de órdenes, el
pedido se cierra en el chat, y nadie necesita su carrito en otro dispositivo.
De yapa desaparece la tabla `cart_items` que **no se podía proteger con RLS**
(un visitante anónimo no tiene sesión que scopear; el clon lo tapaba con una
ruta de servicio). Se guarda sólo la elección: **un precio nunca queda viejo
dentro de un carrito**.

---

## 3. ¿Hace falta login de mayorista? No — y esto es por qué

**No hace falta, y ponerlo sería un error.**

El descuento de Avíos depende de **qué comprás** (la pieza cerrada), no de
**quién sos**. Eso es un *quantity break*, y se resuelve entero sin autenticación.

Lo confirma el rubro: [Mercería La Paloma](https://www.mercerialapaloma.com.ar/),
mayorista pura, **publica todos sus precios sin login** y usa un mínimo de compra
como filtro. La [checklist de B2Bwave para 2026](https://www.b2bwave.com/p/the-2026-wholesale-website-checklist-what-modern-b2b-buyers-expect-from-your-online-store)
pone "transparencia de precios, cantidades por bulto y mínimos" entre los
imprescindibles, y deja "precios diferenciados tras login" entre los *nice to
have* — porque sirve para **precios negociados por cliente**, que no es el caso.

**El trade-off, explícito:** un login recién se justifica el día que Alejandra
quiera precios distintos *para clientes distintos* (una modista con cuenta
corriente paga menos que una revendedora ocasional). Ese día hace falta cuentas,
listas por cliente y probablemente condiciones de pago. Hoy no existe ese
requisito, y meterlo ahora **costaría ventas**: cada registro entre el comprador y
el precio es fricción, y el mayorista que entra desde Instagram se va antes de
crear una cuenta. El modelo de datos ya lo soporta el día que haga falta: alcanza
con agregar `tier` nuevos o precios por cliente sobre `product_formats`.

---

## 4. Lo que se sacó, con el criterio

### Grave — datos de otro cliente adentro de la demo

- **`/admin/estrategia`** (2.200 líneas): la estrategia de negocio de Dahila —
  su tabla de precios aprobada, márgenes, posicionamiento y bandas de mercado.
  Se le iba a mostrar a Alejandra en una reunión. **Borrado.**
- **`database/*.sql`** (24 archivos): migraciones de producción de Dahila,
  incluido `whatsapp-2026-07.sql` con su teléfono. **Borradas**, reemplazadas por
  un `database/schema.sql` escrito para el modelo nuevo.
- **`public/photos/`**: fotos de Dahila. **Borradas.**
- **El teléfono `+598 99 850 073`** estaba hardcodeado como *fallback* en 15
  lugares. No era teórico: sin base, **todas** las páginas caían a ese fallback,
  así que la demo abría chats contra el WhatsApp real de Dahila. **Purgado**; hoy
  hay una sola fuente (`BRAND` en `src/lib/env.ts`).
- **El isotipo de Dahila** (una dalia con ovillo y aguja de crochet) se
  renderizaba como logo de Avíos en el header, el favicon, el `apple-touch-icon`
  y el JSON-LD. **Reemplazado por el logo real de Avíos** (ver §6).

### Rutas — qué se borró y por qué

| Ruta | Decisión |
|---|---|
| `/encargo`, `/encargo/estado` | **Borrada.** Formulario de prenda a medida con busto/cintura/largo y seguimiento de producción. No existe en una mercería de stock. |
| `/tejedoras` | **Borrada.** Reclutamiento para la red de tejedoras de Dahila. |
| `/colecciones` | **Borrada.** Concepto de *drops* por temporada. No hay dato de colecciones y la nav ya la ocultaba: una sección vacía es peor que ninguna. |
| `/atelier` | **Renombrada a `/nosotros`.** "Atelier" es la palabra de un taller de autor; una mercería del Centro tiene local. |
| `/ofertas` | **Borrada.** Se plegó dentro de la tienda: con un solo descuento vigente, un ítem permanente en la nav prometía más de lo que hay. |
| `/favoritos` | **Renombrada a `/mi-lista`.** Acá no es una wishlist de deseo: es la lista de compra de un proyecto. |
| **`/mayorista`** | **NUEVA.** Ver §5. |

Del admin se borraron diez secciones (Tejedoras, Encargos, Colecciones, Lista
VIP, Testimonios, Cupones, Carritos, Pedidos, Colores, Estrategia). Quedan cinco,
reescritas y funcionales: Resumen, Productos, Categorías, Descuentos y Textos del
sitio — ver §10.

### Conceptos, no sólo textos

Se fueron la guía de talles corporales, "Completá el look", los plazos de tejido
("Se teje al encargar — lista el 22 de julio"), la lista de espera, los cupos de
encargo, los testimonios de prendas, la política de cambios que razonaba sobre
ropa a medida, y `"Hola Anush!"` como encabezado del pedido.

---

## 5. El hueco que la auditoría dejó a la vista: `/mayorista`

No es una adaptación de nada: **Avíos vende por mayor y el sitio no lo decía en
ningún lado**. Es el cliente que más factura y no tenía puerta de entrada.

La página sale de lo que la bibliografía del rubro coincide en pedir: a quién le
venden, mínimo, cómo se pide, cómo se paga, cómo llega. Incluye una **tabla de
ahorros** que compara, por unidad, comprar suelto contra llevar la pieza — que es
literalmente lo que un mayorista quiere ver de una.

Además, en la tienda: filtro **"Sólo con precio por mayor"**, y en cada tarjeta
la señal `Por mayor −70%` con el porcentaje **calculado**, no escrito a mano.

---

## 6. Identidad visual

La primera versión de esta reforma usó una paleta petróleo inventada y un
isotipo dibujado a mano (un botón de cuatro agujeros). Con el logo real a la
vista, se rehizo entero:

- **Paleta muestreada del logo**, no elegida a ojo: crema `#FEFAF1`, fucsia
  `#CA1A4B` (la cara del botón), burdeos `#8E1038` (el aro), marrón `#36231D` (la
  tipografía del anillo), dorado `#C79A3E` (el cordón).
- **Semántica de color**, que es lo que hace que el sistema sostenga:
  crema y marrón son papel y tinta (la mercadería *es* color, la interfaz no
  compite); el fucsia marca lo accionable y las ofertas; el dorado es ornamento y
  nunca información; y **el verde está reservado a una sola cosa: el ahorro por
  mayor**. Es el único color ajeno a la marca, y por eso funciona como señal.
- **Favicons** de RealFaviconGenerator instalados (`favicon.svg`, `.ico`, 96×96,
  apple-touch, 192/512 y manifest), con el manifest reescrito en es-UY.
- El **logo real** se usa en el header, el pie, `/ig` y el JSON-LD.
- La **tarjeta social** (`opengraph-image.tsx`) se redibujó con el botón y el
  cordón dorado en vectorial, para que Satori la genere sin cargar el PNG.

Las **ilustraciones de categoría** se mantienen: 13 de los 20 artículos no tienen
foto, y antes eran JPEG de ~25 KB con un cuadrado marrón y el nombre escrito
encima. Ahora se dibuja el tipo de artículo (cinta, cono, cordón, tijera…) en
SVG, a cero bytes de red. Es deliberadamente un dibujo y no una foto falsa.

---

## 7. Arquitectura: el modo demo dejó de ser un plan B

El clon servía el catálogo local **sólo como emergencia** ante una caída de
Supabase: cada página pegaba a la base, esperaba el error y recién ahí caía al
archivo. Costos: el sitio se anunciaba *"Estamos actualizando la tienda"*, todo lo
que no pasaba por ahí quedaba muerto (settings, carrito, favoritos, búsqueda), y
dependía de levantar un servidor falso o cada página tardaba 15 s.

Ahora el modo se elige por entorno (`NEXT_PUBLIC_DEMO_MODE=1`): en demo se sirve
el catálogo local **sin tocar la red**; en producción, Supabase con el archivo
como respaldo. La resiliencia original queda intacta para cuando exista la base.

Se borró `demo-stub-server.js`: **alcanza con `npm run dev`.**

Otros cambios estructurales:
- **Grupo de rutas `(tienda)`**: el marco de la tienda (header, pie, carrito)
  salió del layout raíz. Sin eso, el panel heredaba la barra de promo de la
  tienda arriba, que se lee como un error.
- El **buscador** filtra en el cliente sobre el catálogo ya cargado, en vez de
  pegarle a `/api/search` por cada tecla. Con 20 artículos es más rápido y
  funciona sin base. Busca también por variante: "15 mm" encuentra la cinta.
- Las **categorías de la navegación** vienen del catálogo. Antes estaban escritas
  a mano *y* en la base: agregar una en el panel no la hacía aparecer en la nav.
- **69 rutas, todas estáticas.** El sitio entero lo sirve el CDN.

---

## 8. SEO y datos estructurados

- `Store` + `LocalBusiness` con `geo` y `openingHoursSpecification` reales — el
  clon publicaba un `Organization` genérico, con `Mo-Fr 09:00-18:00` (mal) y la
  descripción *"Mercería de mercería en Montevideo"*.
- `Product` con `AggregateOffer` sobre **precios por menor solamente**.
- Feed de Merchant Center: **una fila por presentación por menor**, con
  `unit_pricing_measure` para que el precio por metro se compare bien. Las
  presentaciones por mayor quedan afuera a propósito: son una condición de
  compra, no un producto distinto.
- `/llms.txt` regenerado con dirección, horario y la explicación del mayoreo.
- Títulos de categoría arreglados: decían *"Cintas de crochet, tejidos a mano"*.

---

## 9. Calidad

- `npm run typecheck` · `npm run lint` · `npm run build` — **los tres en verde**,
  0 warnings. Sin `any`, sin `@ts-ignore`.
- Los cuatro errores de `react-hooks/set-state-in-effect` se arreglaron de raíz,
  no silenciando la regla: localStorage pasó a `useSyncExternalStore`, y los
  reinicios de estado por cambio de prop se hacen en el render.
- **Desborde horizontal en mobile**: se midió con CDP (`scrollWidth` vs
  `clientWidth`) en las 12 rutas a 390 px, y se corrigieron 16 grids que usaban
  `1fr` en vez de `minmax(0, 1fr)`. Las tablas anchas hacen scroll propio, con
  sombras que avisan que siguen.
- Verificado en navegador real (Edge por CDP) a 1280 px y 390 px.

---

---

## 10. Segunda vuelta — panel de administración

### El panel ahora edita de verdad

`/panel` pasó de ser una vista de sólo lectura a un panel funcional:

| Sección | Qué hace |
|---|---|
| Resumen | Métricas del catálogo y la lista de pendientes para repasar con Alejandra |
| Productos | Alta, edición, borrado, reordenamiento, publicar/despublicar, búsqueda y filtro |
| Ficha de producto | Datos, fotos, y el editor de **variantes y presentaciones** con el ahorro calculado en vivo |
| Categorías | Alta, edición, borrado y orden |
| Descuentos | Reglas por tienda o categoría, con vigencia por fechas y encendido/apagado |
| Textos del sitio | Los ~25 textos editables, agrupados por dónde se ven |

Entrada: **`admin` / `admin`**.

### Dónde se guardan las ediciones (y por qué)

No hay base de datos, así que se guardan **en el navegador**. Dos decisiones:

1. **Se copia el catálogo entero**, no un diff. Un diff obliga a inventar
   semántica de parches ("¿qué significa borrar un producto que existe en el
   archivo base?") y a resolver conflictos cuando el archivo cambia. El catálogo
   entero son ~30 KB sobre 5 MB disponibles, y "Restaurar" es volver a `null`.

2. **La tienda lee esas ediciones** (`CatalogProvider`). Es lo que hace que la
   demo se sienta real: cambiás un precio en el panel, abrís la ficha, y el
   precio cambió. Sin eso el panel sería una maqueta que no mueve nada.

   Funciona sin romper el pre-renderizado: el servidor sigue generando el HTML
   con el catálogo del archivo (Google ve el sitio completo) y el navegador lo
   reemplaza después, con `getServerSnapshot` garantizando que la primera
   pintada coincida y no rompa la hidratación.

Verificado de punta a punta manejando el navegador: entrar → editar un precio →
guardar → la ficha, la grilla **y el carrito** muestran el precio nuevo → al
restaurar vuelve el original. Todo verde.

### ⚠️ El login no es seguridad

Las credenciales están en el código, así que viajan al navegador de cualquiera;
el "candado" es una variable de `sessionStorage` que se cambia desde la consola
en cinco segundos; y no hay servidor validando nada. **La propia pantalla de
login lo dice**, en rojo, para que no se confunda con protección.

Hoy no expone nada: el panel sirve el mismo catálogo público que la tienda y sus
ediciones no salen de ese navegador. Antes de que exista **un** dato real detrás
hacen falta las tres cosas: auth de verdad (Supabase Auth), sesión en cookie
httpOnly verificada en el servidor, y Row Level Security en la base — la puerta
del navegador no alcanza, porque quien conozca la URL de la API entra por ahí.

### Sobre el catálogo en papel que pasaste

El primer JSON estaba corrupto: tres volcados concatenados donde cada uno
arrancaba dentro de un string del anterior. De 37 registros quedaban 9 únicos, y
decía que la pieza de cinta gross era de **100 m**. Sobre ese dato malo estuve a
punto de cambiar el catálogo; la edición quedó frenada y el segundo export
—limpio— confirmó **10 m** en los cinco anchos, que es lo que ya estaba cargado.

El export bueno quedó guardado en `database/catalogo-papel.json`. Lo que aporta:
confirma los 25 artículos ya cargados (precios, medidas de pieza, el código
FCS-1 de las reglas) y **no agrega ninguno nuevo** — llega hasta la posición 30
del catálogo, o sea páginas 1 y 2. Lo que sigue sin resolver es lo mismo de
antes: la unidad de venta de cinta reflectiva y los dos tules, los metros de la
pieza de cordón de algodón, y si cordones y plantillas van por par o por unidad.

---

## 11. Tercera vuelta — sacarle el aire de plantilla y hacerlo vender

### Lo que se veía "hecho a máquina", y por qué

Las siete categorías de la portada eran íconos de línea dentro de cajitas
idénticas. Dos problemas: a ese tamaño cinco de los siete dibujos eran
indistinguibles, y una grilla de íconos repetida es de las señales más citadas de
sitio generado — junto con el degradado violeta y el hero oscuro, que este sitio
no tiene. Peor: la ilustración de "Cintas" se repetía como respaldo del producto
Cinta reflectiva, así que se veía el truco.

Ahora la baldosa **dice algo en vez de decorar**: cuántos artículos hay adentro,
desde qué precio, y —en las tres categorías que tienen— una foto real de fondo.
Las cuatro que no tienen foto listan los primeros artículos: "Alfiletero pulsera,
Alfiletero de mesa, Pinza para tela" contesta la pregunta que trae al visitante
mejor que cualquier dibujo.

También se sacó el tercer grid de íconos seguido —los tres círculos numerados de
"Cómo se compra"— que explicaba lo que la ficha y el carrito ya dicen mejor en su
contexto. En su lugar va **la prueba del local**: dirección, horario, envíos y
pago, en una tira de dos columnas asimétricas que rompe el ritmo de la página.

### La señal de venta que sólo este modelo de datos permite

Con el precio mayorista atado a la **presentación**, se puede hacer una cuenta
que ninguna tienda que trate el mayoreo como tipo de cliente puede hacer:
comparar lo que el comprador está por llevar suelto contra la pieza cerrada.

Con la cinta de raso el cruce cae en **31 metros**: de ahí para arriba, la pieza
entera de 100 m cuesta *menos* que los metros sueltos. Pidiendo 45 m, el sitio
avisa: «Llevando la pieza de 100 m pagás $ 170,10 menos y te llevás 55 m más».

Vive en `wholesaleUpgrade()` (pricing.ts), aparece en la ficha y en cada renglón
del carrito, y **no se muestra si el salto queda lejos** (corte en 1,4× el gasto
actual): un cartel que empuja a gastar el triple quema la confianza en el resto.

### La búsqueda sin resultado dejó de ser un callejón

Antes: "no encontramos nada" y un botón para limpiar. Ahora ofrece preguntarlo
por WhatsApp con el término ya escrito, propone categorías, y **registra la
búsqueda** para que la dueña vea qué le piden y no tiene. En una mercería, "no
está en la vitrina" nunca significó "no lo tenemos".

### Instagram, que era el activo desaprovechado

Toda la venta de Avíos entra por ahí y el sitio no lo decía en ningún lado. Se
agregó una tira con el usuario y el número de seguidores — prueba social real,
editable desde el panel, y que **desaparece si se vacía el número**, porque un
conteo desactualizado juega en contra.

### El panel, dos herramientas nuevas

- **Ajustar precios**: sube o baja un porcentaje sobre todo el catálogo, una
  categoría o un producto, con redondeo al peso / a 5 / a 10 y **vista previa
  obligatoria** de los 58 precios antes de tocar nada. El precio por unidad se
  deriva del total, así que la verificación de integridad sigue pasando — se
  comprobó en los tres modos de redondeo. Mover precios a mano en este catálogo
  es una tarde de trabajo y una errata asegurada.
- **Qué buscan**: los términos sin resultado, con acceso directo a cargar el
  artículo o abrir WhatsApp. La pantalla aclara que en la demo el registro es por
  navegador.

### Un error de conteo que estaba a la vista

El carrito exponía un solo número —la suma de cantidades— y se usaba para dos
cosas distintas. Pidiendo 45 metros de una cinta, el pedido decía **"45
renglones"** y el globito del header mostraba **45**. Ahora hay `lineCount`
(artículos distintos, que es lo que una persona espera leer) e `itemCount`
(unidades totales, que va a las métricas).

---

## 12. Cuarta vuelta — auditar en serio lo que venía dando por bueno

Hasta acá venía afirmando cosas sobre accesibilidad, rendimiento y "esto
funciona" sin medirlas. Esta vuelta fue medirlas. Aparecieron cuatro problemas
reales, dos de ellos introducidos por mí en las vueltas anteriores.

### 12.1 · El bug que más se veía y que nadie había mirado

Los tokens de diseño vivían dentro de `Primitives.tsx`, que es un módulo
`'use client'`. **Cuando un componente de servidor importa un valor de un
módulo de cliente, Next no le entrega el objeto: le entrega una referencia.** El
resultado era que `avios.brand600` valía `undefined` en todo componente de
servidor, y el HTML salía literalmente así:

```html
background: linear-gradient(160deg, undefined 0%, undefined 100%)
border: 1px solid undefined
```

Medido en el HTML servido antes del arreglo: **7 casos en la portada, 18 en /ig,
19 en /info, 21 en /terminos**, y también en /mayorista, /nosotros y /tienda.
Ocho archivos afectados.

Lo que se veía: las ilustraciones de los productos sin foto salían invisibles en
/ig (el degradado no existía y el trazo no tenía color), los separadores de
sección de /terminos e /info no se dibujaban, y varios bordes de tarjeta
faltaban.

Arreglo: los tokens se mudaron a `src/components/ui/tokens.ts`, **sin
directiva**, y Primitives los reexporta para no tocar los treinta imports que ya
existían. Verificado contra el HTML pre-renderizado del build: **0 ocurrencias**
en las siete rutas.

### 12.2 · 204 violaciones de contraste

Corriendo axe-core sobre once rutas aparecieron **204 violaciones**, todas de la
misma regla. Los números, medidos:

| token | sobre blanco | sobre paper-200 | AA pide |
|---|---|---|---|
| `ink-500` `#8E7A70` | 4,06:1 | 2,91:1 | 4,5:1 |
| `gold-600` `#B0822C` | 3,46:1 | 2,48:1 | 4,5:1 |
| `ink-300` como texto | 1,94:1 | 1,39:1 | 4,5:1 |

`ink-500` es el gris de todo el texto secundario del sitio: metadatos de
tarjeta, migas de pan, ayudas de formulario. Pasó a `#6E5A50` — 6,48:1 sobre
blanco y 4,64:1 sobre el fondo más oscuro del sistema.

Y una autocrítica: la skill del repo dice **"el dorado es ornamento, nunca
información"**, y yo mismo lo había puesto como color de las rúbricas. Volvieron
a `brand-600`. El dorado quedó donde el contraste de texto no aplica: filetes,
bordes y fondos suaves.

Resultado tras el arreglo: **cero violaciones** en las once rutas de la tienda y
en las ocho del panel.

### 12.3 · Más de la mitad de las peticiones eran prefetch

Next prefetchea cada `<Link>` que entra en pantalla. En la portada eso eran
**32 peticiones de 58**, con destinos repetidos hasta siete veces, porque el
mismo enlace aparece en la baldosa, en el pie y en el menú. En 4G con 150 ms de
latencia esas conexiones compiten con el contenido.

Se desactivó el prefetch en el pie y en las utilidades; se mantiene donde hay
intención real de navegar. Medido contra el build de producción, con red 4G lenta
y CPU 4× más lenta:

| | antes | después |
|---|---|---|
| LCP portada | 2316 ms | **1552 ms** |
| CLS portada | 0,0246 | **0** |
| peticiones | 58 | **23** |
| transferido | 505 KB | **413 KB** |

Las cinco rutas medidas quedan holgadas bajo los 2500 ms de objetivo.

*No* se recortaron las fuentes (114 KB, el 28% del peso): ya están en subset
latin con un solo eje variable extra, y achicarlas más costaría el ajuste óptico
de Fraunces por ~250 ms que no hacen falta.

### 12.4 · /ig contradecía su propio comentario

La página de la bio de Instagram tenía escrito, en su propio encabezado:
*"sin header ni footer del sitio compitiendo por el pulgar"*. Y salía con el
header completo y el pie de veinte enlaces, porque vivía dentro del grupo de
rutas `(tienda)`.

Se mudó a `src/app/ig/` con su propio layout mínimo. Además: la grilla de "lo
último" desalineaba las tarjetas (nombres de una y dos líneas) y mostraba el
dominio `localhost:3000` al pie.

### 12.5 · Un test que pasaba sin probar nada

El test del selector de cantidad decía `check(qty1 !== qty0 || true, ...)`. Ese
`|| true` lo hacía verde siempre. Reemplazado por uno que comprueba sumar,
restar y el tope mínimo — y que ahora sí puede fallar.

### 12.6 · Y un error de conteo corregido

El carrito exponía un solo número (la suma de cantidades) usado para dos cosas
distintas: pidiendo 45 metros de una cinta, el pedido decía **"45 renglones"** y
el globo del header mostraba **45**. Ahora `lineCount` (artículos, lo que una
persona espera leer) e `itemCount` (unidades, para métricas).

---

## 13. Quinta vuelta — optimizar de verdad y dejar la verificación en el repo

### 13.1 · El catálogo entero viajaba dos veces

Buscando qué había dentro de los chunks apareció esto: **las 56 KB del catálogo
completo estaban bundleadas en el JavaScript de todas las rutas de la tienda**,
además de venir ya resueltas en el HTML del servidor. Se enviaba dos veces.

La causa: `admin/store.ts` importaba `DEMO_CATALOG`, y ese store lo consume
`CatalogProvider`, que es de cliente. Como `'use client'` es contagioso, todo
lo que el store importa termina en el navegador.

El arreglo: el store guarda **sólo las ediciones**. El catálogo base lo aporta
quien renderiza —el layout de la tienda y el del panel, ambos de servidor, que ya
lo leyeron para pre-renderizar— vía `registerBaseCatalog()` y un contexto.
Verificado: `grep` sobre los chunks ya no encuentra ningún slug de producto.

### 13.2 · Rendimiento, medido punta a punta

Contra el build de producción, con 4G lenta y CPU 4× más lenta:

| | al empezar la sesión | ahora |
|---|---|---|
| LCP portada | 2316 ms | **920 ms** |
| CLS portada | 0,0246 | **0** |
| peticiones | 58 | **23** |
| transferido | 505 KB | **360 KB** |

Las cinco rutas medidas quedan entre 692 y 1076 ms, con CLS 0 en todas.

### 13.3 · Una suposición mía que la documentación desmintió

Al acotar el prefetch di por sentado que `prefetch={false}` seguía prefetcheando
al pasar el mouse. **La documentación de Next 16 dice lo contrario**: con
`false` no prefetchea ni en viewport ni en hover.

Eso cambió la decisión: se desactiva en el pie (destinos duplicados que nadie
toca con urgencia) y se **mantiene** en las baldosas de categoría, que son el
camino de navegación principal. Medido: con el prefetch de las baldosas activo, el
LCP de la portada no sufre.

### 13.4 · La verificación dejó de ser artesanal

Todo lo que veníamos comprobando con scripts sueltos —que se perdían al cerrar la
sesión— ahora vive en el repo:

    npm run audit

Cuatro comprobaciones, con navegador real y sin una sola dependencia nueva:

| | qué mira | por qué existe |
|---|---|---|
| **tokens** | valores sin resolver en el HTML del build | ya hubo `border: 1px solid undefined` en ocho archivos |
| **a11y** | axe-core, WCAG 2.1 AA, 20 rutas | ya hubo 204 fallos de contraste |
| **layout** | desborde horizontal a 390 px | un sitio que se corre para el costado se siente roto |
| **enlaces** | los 64 destinos internos responden | una categoría renombrada deja enlaces muertos |
| **vitals** | LCP y CLS en 4G, CPU 4× | sin throttling la medición no dice nada |

Devuelve código distinto de cero si algo falla, así sirve en integración continua.
Acepta `--solo=a11y` para correr una sola y `--url=` para apuntar a otro lado.

Cada script lleva escrito **por qué existe y qué error concreto atrapó**, para
que dentro de seis meses nadie lo borre por parecer ceremonia.

### 13.5 · Si algo se rompe, ya no es pantalla en blanco

No había `error.tsx`. Un fallo de JavaScript en el cliente dejaba la pantalla
vacía: el visitante no ve nada, no entiende y se va. Para una tienda que vive de
Instagram eso es una venta perdida y alguien que no vuelve.

Ahora el peor caso conserva la navegación y ofrece dos salidas: reintentar y
escribir por WhatsApp. Una mercería vendía por WhatsApp mucho antes de tener
sitio; si el sitio falla, el camino viejo sigue abierto. Probado provocando un
fallo real después de la hidratación.

---

## 14. Sexta vuelta — lo que hace que lo quieran

Esta vuelta no salió de auditar: salió de mirar contra quién compite esto de
verdad en Uruguay. Los competidores no son otras agencias, son **Pedix,
Tiendli, Vercatálogo y el catálogo de WhatsApp Business** — plataformas de
catálogo con cuota mensual, todas más baratas.

Dos hallazgos ordenaron el trabajo:

1. ~~Ninguna puede representar el modelo de precios de Avíos.~~ **Esto que
   escribí acá era falso, y queda escrito que lo era.** Es el tipo de
   afirmación que suena bien en una reunión y se cae en la primera repregunta:
   el modelo producto → variante → presentación se representa sin problema en
   Shopify, en Tiendanube o en Tiendli, con dos variantes y dos precios
   (`"4 mm · por metro"` y `"4 mm · pieza de 100 m"`). Es una decisión de
   modelado, no un foso.

   Lo que sí es cierto y alcanza: ninguna de esas plataformas **hace la
   cuenta** de si al cliente le conviene la pieza, ninguna arma la **lista
   imprimible**, y ninguna escribe el **texto del posteo con los precios**.
   Son tres cosas chicas. Dichas como tres cosas chicas suenan verdaderas;
   dichas como una revolución, suenan a vendedor.
2. **La prensa del rubro nombra un solo diferenciador real:** si la plataforma
   actualiza los precios sola o hay que editarlos uno por uno. Eso ya existía
   (`/panel/precios`), y esta vuelta se apoyó en él en vez de agregar cosas al
   costado.

De ahí salieron cuatro piezas, todas contestando "qué hace este sitio que el
negocio hoy hace a mano".

### 14.1 `/lista-de-precios` — el catálogo en papel, vivo

**El dato que decide:** el catálogo de Avíos EXISTE en papel. De ahí salieron
los 58 precios de `data.ts`. Alejandra ya tiene el hábito y sus clientas ya
tienen el reflejo de pedir «pasame la lista». Lo que no tiene es una lista que
se actualice sola.

La página arma la lista completa —por categoría, con variante, presentación,
precio y precio por unidad— y la deja lista para imprimir en A4 o guardar en
PDF. Sale del **mismo** catálogo que la tienda, así que no puede haber una lista
impresa que diga una cosa y una ficha que diga otra. Ese desfasaje es el
problema real.

Detalles que la hacen usable y no un adorno:

- **Fecha en el encabezado.** `mutate()` ahora sella `generatedAt` en cada
  edición del panel: dejó de ser "cuándo se escribió el archivo" y pasó a ser
  "cuándo se tocaron estos precios". Una lista de precios sin fecha no se puede
  auditar. Se formatea en UTC a propósito: la fecha se guarda a medianoche UTC
  y Montevideo está tres horas atrás, así que formatearla en hora local la
  corría un día para atrás.
- **Nada depende del color.** La fila por mayor se distingue por un filete a la
  izquierda y una etiqueta con recuadro, no por un fondo verde. Esto se va a
  fotocopiar.
- **El encabezado de la tabla se repite en cada hoja** (`display:
  table-header-group`). Sin eso, a partir de la página dos nadie sabe qué
  columna es el precio por unidad.
- **La presentación no repite la medida.** Concatenar a ciegas la etiqueta y el
  contenido producía «Pieza cerrada · 100 m · 100 m» y «Por metro · 1 m». Ahora
  el contenido se agrega sólo cuando dice algo que la etiqueta no dice ya.
- Es el primer `@media print` del sitio.

### 14.2 La búsqueda aprendió el vocabulario del rubro

`src/lib/search/match.ts`, compartido por el buscador del header y la grilla —
que es donde el comentario de `media.ts` ya advertía que divergir sale caro.

Dos problemas, los dos costaban ventas:

- **Exigía la frase entera y pegada.** «cinta gross 15» no encontraba nada,
  porque esas tres palabras no están seguidas en ese orden en ningún texto. Y
  así es exactamente como se pide en el mostrador. Ahora se parte en palabras:
  hay que cumplir todas (Y), y cada una se cumple con cualquiera de sus
  sinónimos (O).
- **No sabía cómo se llama esto en la calle.** Al cordón fino se le dice
  *piolín*, al moño de etiqueta *humita*, a la cinta gross *grosgrain*, y quien
  viene de tutoriales escribe *satén* por raso. Todas esas búsquedas morían
  sobre mercadería que está en el mostrador.

**La regla del diccionario, que importa más que el diccionario:** cada sinónimo
apunta a algo que Avíos efectivamente vende. `cierre` y `cremallera` NO están
mapeados, aunque sean la búsqueda más obvia de una mercería, porque acá no hay
cierres. Falsear ese match hace que alguien cruce la ciudad al pedo y además
tapa el dato: hoy esa búsqueda queda registrada en `/panel`.

**Un hallazgo que cambió el diseño:** la primera versión buscaba también dentro
de la descripción, y «cierre» devolvía el moño formal — cuya descripción dice
«con cierre regulable». No es culpa del diccionario: es que la grilla estaba
tratando la prosa como si fuera un dato. La descripción salió del texto que
filtra y quedó sólo para ordenar las sugerencias del header, donde una
coincidencia débil va última en vez de aparecer como si fuera igual de buena.
Eso arregló «cierre» y de paso dos falsos positivos más.

### 14.3 `/panel/publicar` — Instagram

Instagram es **por dónde vende** Avíos. Todo el resto del panel administra el
sitio; esto administra el canal, y es la pantalla que se usa varias veces por
semana mientras que «Categorías» se toca una vez por año.

Genera el texto de una publicación o de una historia con el precio por menor,
el de la pieza, cuánto se ahorra, los anchos, la dirección, el horario y el
WhatsApp. Queda **editable**: la voz es de Alejandra, no del sitio. Lo que
aporta el panel son los datos que hay que ir a buscar y que se equivocan justo
cuando se escriben apurado.

Avisa antes de publicar cuando el artículo no tiene foto, está sin stock, en
borrador, no tiene precio por mayor publicable, o tiene datos a confirmar.

No publica solo, y es a propósito.

### 14.4 `/panel/respaldo` — el catálogo es de ella

La sección que nadie pide en la reunión y contesta la pregunta que sí se hacen:
*«esto que estoy cargando, ¿es mío?»*. La respuesta tiene que ser un botón, no
una promesa.

- **CSV** con BOM, para que Excel en Windows no muestre «MolderÃ­a». Una fila por
  precio. Es el catálogo en una planilla que se puede revisar con cualquiera.
- **JSON** que vuelve a entrar acá y deja todo como estaba.

`replaceCatalog()` no pasa por `mutate()` a propósito: `mutate` sella
`generatedAt` con hoy, y un respaldo tiene que conservar su fecha. Si al
restaurar se pisara, la lista diría «precios al día de hoy» sobre precios de
hace tres meses.

### 14.5 Verificación de lógica sin navegador

Toda la verificación pasaba por CDP y un Edge headless. Eso sirve para lo que
sólo se ve en pantalla (contraste, desborde, LCP), pero para comprobar que
«cinta gross 15» encuentra la cinta gross es una infraestructura enorme para
una pregunta chica — y tan lenta que termina no corriéndose.

Node 24 ejecuta TypeScript directo. Lo único que le faltaba era entender el
alias `@/`, que son quince líneas (`scripts/test/lib/alias.mjs`). Con eso:

```
npm test        # busqueda.mjs + respaldo.mjs, en segundos, sin navegador
npm run verify  # typecheck → lint → test → build
```

`busqueda.mjs` prueba 33 búsquedas del rubro y —tan importante— 7 que TIENEN
que seguir sin resultado. `respaldo.mjs` prueba la ida y vuelta del JSON, los
cinco archivos que debe rechazar, y la forma del CSV.

**Las dos pruebas encontraron cosas reales en la primera corrida**, que es la
única prueba de que las pruebas sirven: el falso positivo de «cierre», y que
«hilo encerado cono» fallaba porque «cono» vive en la etiqueta de la
presentación y no en la de la variante.

Y un caso donde **la prueba estaba mal y el código bien**: «tela por metro»
devolvía los dos tules y yo lo había puesto en la lista de los que no deben
devolver nada. El tul *es* una tela y se vende por metro. Se movió de lista.

### 14.6 Cuatro bugs que aparecieron de paso

1. **El botón flotante de WhatsApp mandaba el nombre de otro negocio.** El
   mensaje precargado decía «Hola! Estoy en el sitio de **Dahila Crochet** y
   tengo una consulta 🧶». Es el botón más visible del sitio, presente en todas
   las páginas públicas. Sobrevivió a todas las pasadas anteriores porque el
   texto estaba dentro de un `encodeURIComponent()` y no en una constante.
2. **`robots.ts` bloqueaba `/admin`**, que es la ruta del clon. Desde que el
   panel se mudó a `/panel`, esa regla no protegía nada y el panel quedó
   indexable. También bloqueaba páginas que mandan `noindex`, que es
   contraproducente: para leer el `noindex` el crawler tiene que poder entrar.
3. **`.panel input:not([type="checkbox"])` alcanzaba a los radios.** Les daba
   `width: 100%`, borde y padding. La pantalla de publicar es la primera del
   panel con radios: salieron como un punto gigante centrado que empujaba su
   etiqueta fuera de la columna. Arreglado en la regla base, no en el
   componente, para que no vuelva a pasar.
4. **El catálogo del cliente no exponía `generatedAt`.** Sin eso la lista de
   precios no tenía de dónde sacar la fecha.

### 14.7 `VENTA.md`

El material de venta, aparte: cómo se presenta esto, en qué orden, con qué
números, y qué contestar a cada objeción. Está en el repo porque es tan parte
del trabajo como el código, y porque el guión depende de datos concretos del
catálogo que cambian.

**No tiene ningún precio escrito, y es deliberado.**

---

## 15. Séptima vuelta — el catálogo son cientos, no veinte

Esta vuelta arrancó con una corrección del cliente que invalidó parte del
análisis anterior: **Avíos tiene cientos de artículos.** Los ~20 de `data.ts`
son la primera página del catálogo en papel, cargada como muestra para poder
mostrar algo rápido.

Cambia el cuadro competitivo entero y, sobre todo, cambia qué hay que construir.

### 15.1 Qué cambia con el volumen

Con veinte productos, Avíos entra en el **plan gratis de Tiendli** (tope 50) y
gran parte de lo que hace este sitio se puede conseguir sin pagar nada. Con
cientos, no entra — y aparece el costo que ninguna plataforma resuelve:
**alguien tiene que cargarlos**. La referencia de mercado para carga de catálogo
ronda los diez a quince dólares por artículo; con cientos de artículos eso solo
supera el proyecto entero.

O sea: el valor no está en el software, está en que el catálogo exista y se
mantenga. Eso reordenó las prioridades de esta vuelta.

### 15.2 Tres lugares donde el sitio se rompía a esa escala

Los encontré revisando qué pasa si `data.ts` tuviera 400 productos en vez de 20:

1. **`/tienda` pintaba todos los productos de una.** Cientos de tarjetas con sus
   imágenes en el primer render: LCP malo y memoria de más en un teléfono para
   ver los seis primeros. Ahora pinta de a 24 con «Ver más artículos».

   Es «ver más» y no scroll infinito a propósito: el scroll infinito deja el pie
   inalcanzable, y ahí viven la dirección, el horario y el teléfono, que en una
   mercería de barrio es a dónde va mucha gente.

2. **`/mayorista` renderizaba una fila por cada producto con precio por mayor.**
   Una tabla de cientos de filas deja de ser un argumento y pasa a ser un muro.
   Ahora muestra los 12 mayores ahorros y manda el resto a `/lista-de-precios`,
   que para eso está organizada por categoría e impresa.

3. **`/lista-de-precios` no tenía por dónde entrar.** Con el catálogo completo
   son varias hojas y decenas de bloques. Se agregó un índice de categorías que
   en pantalla salta y en papel funciona como tabla de contenidos.

### 15.3 `/panel/respaldo` → importar desde planilla

Es la pieza que decide si el proyecto es viable, y la más valiosa de esta vuelta.

La planilla ya existía del otro lado: el respaldo la exporta. Ahora se lee de
vuelta, así que el camino es de ida y de vuelta con el mismo archivo. Se baja, se
completa en Excel con el catálogo en papel al lado —o se le manda a alguien para
que la complete— y se sube.

Tres reglas que la hacen usable de verdad:

- **Nunca se aplica a medias.** Si una fila está mal, no entra ninguna. Un
  catálogo importado a la mitad es peor que no haber importado, porque nadie
  sabe qué quedó adentro.
- **Se muestra qué va a pasar antes de que pase:** cuántos se crean, cuántos se
  actualizan, cuántos quedan intactos, y el detalle de cada error con su número
  de fila tal como lo numera Excel.
- **No borra por omisión.** Lo que la planilla no menciona queda como está.
  Borrar por omisión sería la forma más rápida de que alguien pierda medio
  catálogo por subir el archivo equivocado.

Dos detalles que parecen menores y no lo son: acepta separador coma **y** punto
y coma, porque Excel en español exporta con punto y coma según la configuración
regional y esa es la causa número uno de «no me anda el archivo»; y lee números
en los dos formatos (`1.234,56` y `1,234.56`), porque leer mal uno convierte
`$ 1.234` en `$ 1,234` y nadie lo nota hasta que alguien cobra de menos.

`scripts/test/importar.mjs` comprueba la ida y vuelta completa contra el
catálogo real: se exporta, se importa contra un catálogo vacío, y se compara
precio por precio. Los 58 vuelven idénticos.

### 15.4 Conexiones: dónde más tiene que estar el catálogo

Un sitio que no está conectado a nada es una isla, y para un local a la calle la
mayor parte de la gente nueva no llega escribiendo la dirección del sitio.

**`/panel/conexiones`** ordena qué conectar **por lo que más gente trae a este
local**, no por lo que es más fácil ni por lo que suena mejor:

| | Por qué en ese lugar |
|---|---|
| **Ficha de Google del local** | Para un negocio con local a la calle es la puerta más ancha. En la búsqueda local pesan sobre todo la cercanía y las señales de la propia ficha; el sitio pesa mucho menos |
| **Catálogo de WhatsApp e Instagram** | Es donde Avíos ya vende, y con cientos de artículos cargarlo a mano desde el teléfono no se hace |
| **Enlace de la bio de Instagram** | El único enlace clickeable que Instagram regala |
| **Search Console** | Acelera que Google conozca el sitio |
| **Merchant Center** | Último, y con la expectativa dicha de frente — ver abajo |

**Lo de Merchant Center hay que decirlo.** Uruguay está admitido en Merchant
Center y el peso uruguayo también, pero **la pestaña Shopping no está habilitada
para usuarios uruguayos**. O sea que el feed sirve para que Google conozca los
productos, no para aparecer en un comparador que acá todavía no existe. Está
escrito así en la propia pantalla del panel, con esas palabras.

Decir vos mismo que algo no sirve todavía compra más confianza que las seis
pantallas anteriores juntas — y es, además, lo único honesto.

### 15.5 Un feed, tres catálogos

`/catalogo-meta.csv` alimenta **Meta Commerce Manager**, que es de donde salen a
la vez el catálogo de WhatsApp Business, la tienda de Instagram y la de
Facebook. Meta lo lee de una URL programada: se configura una vez y se mantiene
solo.

Para Avíos esta es la integración que más rinde, porque WhatsApp es donde ya
vende. Un catálogo de WhatsApp cargado a mano con cientos de artículos no se
termina nunca, y lo que se cargue queda viejo a la primera lista de precios
nueva.

Las reglas de qué entra y qué no se mudaron a `src/lib/catalog/feed.ts`,
compartidas con el feed de Google: dos catálogos externos que digan precios
distintos del mismo artículo es peor que tener uno solo.

### 15.6 Publicar también para la ficha de Google

`/panel/publicar` pasó de ser «Instagram» a alimentar los dos canales. El texto
para Google **no es el de Instagram con otro largo**: va sin etiquetas (en Google
no hacen nada), más corto porque se lee dentro de un recuadro del mapa, nombrando
la calle porque la relevancia local es geográfica, y terminando en una acción
concreta.

El aviso que aparece al elegirlo dice lo que la ficha necesita: publicar dos
veces por semana, porque un perfil que se queda quieto un mes pierde visibilidad
de forma medible.

### 15.7 Errores que aparecieron revisando

1. **`/mayorista` renderizaba todas las filas** — ver 15.2.
2. **`Filters.category` era una rama muerta.** El tipo tenía un campo `category`
   que siempre valía `'todo'`, y `matches()` evaluaba una condición que nunca se
   cumplía: el filtrado por categoría se hace antes, al armar `products`, porque
   viene de la URL y no de un control de la pantalla.
3. **Un `sort` redundante** en `/mayorista`: `bestWholesaleRows()` ya devuelve
   ordenado por ahorro.
4. **`AGENTS.md` no mencionaba cinco archivos nuevos** ni el dato de escala, que
   es el que decide la arquitectura.
5. **La sección 14 de este mismo documento afirmaba algo falso** sobre lo que las
   plataformas pueden representar. Está corregida arriba, tachada y explicada, en
   vez de borrada.

### 15.8 Sobre la investigación de venta

Dos cosas de esta vuelta valen más que cualquier función:

- **Para un vendedor desconocido, la palanca no es la promesa: es sacar el
  riesgo.** En la ecuación de valor lo que falta no es lo que ofrecés sino la
  probabilidad percibida de que salga bien, y la conclusión práctica de la
  bibliografía es que invertir en reversión de riesgo rinde más que mejorar el
  producto un poco más.
- **La guía de cultura de negocios uruguaya** coincide en que la negociación es
  distendida hasta que se habla de plata, y que prometer de más y no cumplir
  plazos es lo que peor cae. Eso descarta el tono de venta enfática.

Las dos cosas están volcadas en `VENTA.md`, que se reescribió entero.

---

## 16. Octava vuelta — el libro y el PDF de 720 páginas

El cliente aportó el dato que da vuelta el planteo entero:

> Cuando alguien entra al local y pregunta por un artículo, se saca un catálogo
> de papel enorme y se busca a mano. Y si alguien pide el catálogo por WhatsApp,
> se le puede llegar a mandar **un PDF de unas 720 páginas**.

Eso no es «les falta una página web». Es otra cosa, y bastante más interesante:

> **El catálogo ya existe. El problema es que no se puede consultar.**

Todo lo que sigue salió de investigar ese problema en vez de investigar tiendas
online.

### 16.1 Los cinco datos que cambiaron decisiones

1. **El catálogo de WhatsApp tiene un tope duro de 500 productos**, uno solo por
   cuenta, y un mensaje multiproducto muestra 30 como máximo. Con un catálogo de
   720 páginas, **el catálogo de Avíos no entra en WhatsApp**. Eso descarta de
   entrada la solución que parecía obvia.

2. **Pero el 64% de los compradores latinoamericanos prefiere ver el catálogo
   dentro del chat** antes que en un sitio externo, y la conversión en chat es
   varias veces la de un formulario web. En LATAM el 72% ya compró por mensaje.

   Las dos cosas juntas dan la arquitectura: **el sitio no compite con el chat,
   lo alimenta**. El catálogo vive en el sitio porque no cabe en otro lado, y lo
   que entra al chat es el resultado de una búsqueda, no el catálogo.

3. **Quien busca compra.** Los visitantes que usan el buscador convierten entre
   1,8 y 3 veces más que el resto (en Amazon 6×, en Walmart 2,4×), y el 92% de
   las búsquedas exitosas terminan en la compra de lo buscado. Con cientos de
   artículos, **el buscador no es una función del catálogo: es el catálogo**.

4. **La categoría existe y tiene nombre: *clienteling*.** Las cadenas grandes le
   dan a quien atiende una app para buscar el producto y mandarle la ficha al
   cliente. El libro gigante del mostrador es exactamente eso, en papel.

5. **El PDF de 720 páginas no es una carga: es el activo.** Extraer datos de
   producto de un PDF con modelos de visión es una técnica madura, con errores
   reales — lo que exige un paso humano de revisión. Es decir: exactamente el
   flujo `extraer → revisar en planilla → importar con validación` que ya existe
   en `/panel/respaldo`.

### 16.2 `/mostrador` — la respuesta directa al libro

Es la pieza nueva de esta vuelta y la que contesta el problema tal como fue
planteado.

Una pantalla sola: un buscador grande y pegado arriba, y resultados **por
variante**, no por producto. Cada fila trae el precio grande, el precio por
unidad, el código, y dos botones: copiar para pegar en el chat, y sumar a una
lista.

Tres decisiones de diseño, todas del mismo lado:

- **El usuario no es el comprador, es quien atiende.** Tiene a alguien enfrente
  esperando. La respuesta que necesita es «sí, $ 13 el metro», no una ficha con
  fotos. Por eso vive fuera del grupo `(tienda)`: sin header, sin pie, sin
  carrito, sin barra de promo.
- **Los resultados son por variante.** La pregunta nunca es «¿tenés cinta de
  raso?», es «¿tenés la de 4 mm?».
- **La acción principal es copiar, no comprar.** Quien atiende ya está adentro de
  una conversación de WhatsApp: lo que necesita es pegar la respuesta ahí.

Y la lista convierte varias consultas sueltas en un presupuesto, que es el
recorrido real de un cliente mayorista: *consulta → lista → pedido*, sin pasar
por un checkout que nadie pidió.

### 16.3 Dos errores que encontró probar el mostrador

Los dos aparecieron escribiendo en la pantalla lo que se pregunta en el local:

1. **«4 mm» devolvía 24 resultados y «gross 15» empezaba por la de 7 mm.** La
   coincidencia se evaluaba contra el texto del producto ENTERO, que junta todas
   sus variantes. Para la grilla está bien —buscar «4 mm» tiene que traer la
   cinta y después uno elige el ancho— pero en el mostrador es lo contrario.
   Se agregó `textoDeFila()`, que compara contra esa fila y no contra el
   producto.

2. **«4 mm» traía la cinta de 40 mm**, porque `"4"` es subcadena de `"40"`. En
   una mercería donde los anchos son 4, 7, 10, 15, 22 y 40, eso convierte cada
   búsqueda por medida en la lista equivocada. Ahora los números se comparan como
   palabra entera (`(?<!\d)4(?!\d)`), y las palabras siguen comparándose como
   subcadena para que «cordon» encuentre «cordones». Hay pruebas de las dos
   cosas en `scripts/test/busqueda.mjs`.

Ninguno de los dos se veía leyendo el código.

### 16.4 Lo que la investigación dice del cuadro competitivo

El competidor directo del rubro que sí tiene tienda online —Avíos LP, en
Tiendanube— tiene **60 a 80 productos y ni siquiera buscador**. Ese es el estado
del arte del sector.

O sea que el tamaño del catálogo de Avíos, que hoy es su problema, es lo que
puede volverse su diferencia: nadie más en el rubro tiene con qué mostrar un
catálogo de ese tamaño, y una vez que se puede consultar, deja de ser una carga.

### 16.5 Sobre el «monthly fee», que resultó ser un malentendido

Dato local que ordena la discusión: **la facturación electrónica es obligatoria
en Uruguay**, así que cualquier comercio formal ya paga una mensualidad de
software. Un plan con control de stock ronda los $ 2.000 pesos por mes, y eso lo
paga sin discutir.

Al mismo tiempo, las agencias web uruguayas publicitan «sin mensualidades
eternas» como si fuera una ventaja.

La conclusión no es sobre el precio, es sobre la categoría: **si esto se presenta
como “una página web”, la mensualidad se resiste; si se presenta como un sistema
—como el de facturación— la mensualidad es lo normal.** Es la misma plata y el
mismo trabajo; cambia contra qué lo comparan.

---

## 17. Lo que queda pendiente de Alejandra

Todo esto está listado en `/panel`, para poder repasarlo con ella en la reunión.

1. **⚠️ Hay dos teléfonos en circulación.** El sitio usa **+598 98 526 943** (el
   del relevamiento). El flyer de la mercería anuncia **092 322 260**. Todos los
   botones de WhatsApp apuntan al primero. **Es lo primero a confirmar**: un
   número equivocado manda los pedidos a la nada.
2. **⚠️ El catálogo completo.** Lo cargado son ~20 artículos: la primera
   página del catálogo en papel. El real son cientos. Sin eso no hay proyecto,
   y es la mitad del trabajo que falta. Se carga por planilla desde
   `/panel/respaldo` — en el formato que ella lo tenga (papel, foto, planilla o
   mensajes de WhatsApp), alguien lo pasa a la planilla una vez.
3. **Acceso a la ficha de Google del local**, o que la reclame ella. Es la
   integración que más gente nueva puede traer (ver `/panel/conexiones`).
4. **Mínimo de compra por mayor.** No se inventó: la página dice que no hay
   mínimo publicado e invita a preguntarlo.
5. **Totales de las piezas cerradas de cintas.** Alejandra pasó el precio *por
   metro* mayorista; el total de la pieza es esa cifra × los metros. Si ella
   redondea a un número cerrado, manda el suyo.
6. **Unidad de venta de tres artículos** (cinta reflectiva, tul liso, tul con
   glitter): se asumió "por metro" por coherencia con su categoría. Marcados.
7. **Si el precio es por par o por unidad** en cordones de calzado y plantillas.
8. **Cuántos metros trae la pieza de cordón de algodón** — sin ese dato no se
   publica un total, sólo el precio por metro.
9. **13 artículos sin foto.** Mientras tanto va la ilustración de la categoría.
10. **Foto del local.** La que circula está dentro de un flyer con texto encima.
   Una foto limpia del mostrador y las paredes de cintas mejoraría mucho la
   portada y la tarjeta social.
11. **Dominio.** No hay uno comprado; `SITE_URL` usa un placeholder.
12. **`/terminos` no pasó por revisión legal** — lo dice la propia página, arriba
    y en rojo.
