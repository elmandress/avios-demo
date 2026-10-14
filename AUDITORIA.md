# Auditoría del clon — Mercería Avíos

Relevamiento hecho antes de reescribir nada (27/08/2026). Página por página,
storefront y admin, con un solo criterio: **¿esto tiene sentido para una
mercería mayorista/minorista de San José 851, o es un resto de Dahila que
quedó pegado?**

El detalle de qué se hizo con cada hallazgo está en `REFORMA.md`.

---

## A. Hallazgos críticos (no son de estilo)

### A1 — Datos confidenciales de otro cliente dentro de la demo
`/admin/estrategia` son 2.200 líneas (`data.ts` + `page.tsx`) con la
**estrategia de negocio de Dahila**: su tabla de precios aprobada, sus
márgenes, su posicionamiento contra la competencia, bandas de mercado y
referencias de proveedores. Es material que se le iba a mostrar a Alejandra
Calvete en una reunión de venta.

También: los 24 `.sql` de `database/` son las migraciones de producción de
Dahila (incluido `whatsapp-2026-07.sql`, que contiene su número), y
`public/photos/` tiene fotos suyas (`atelier-tejiendo.jpg`,
`top-lace-parque.jpg`, `bufanda-verde.png`).

### A2 — La demo manda los pedidos al WhatsApp real de Dahila
El número `+598 99 850 073` está hardcodeado como *fallback* en 15 lugares.
No es teórico: como en modo demo no hay Supabase, **todas** las páginas que
leen el teléfono de `site_settings` fallan y caen exactamente a ese fallback.
`/carrito`, la ficha de producto, el botón flotante y el banner de mantenimiento
abrían chats contra el número de Dahila.

### A3 — El logo del header es el isotipo de Dahila
`public/isotype-color.png` es una dalia con un ovillo y una aguja de crochet.
Se renderiza al lado de la palabra "AVÍOS" en el header, y además es el
favicon, el `apple-touch-icon`, el `logo` del JSON-LD y la imagen de las
tarjetas OG. Es, literalmente, "Dahila con otro logo" — solo que ni siquiera
con otro logo.

### A4 — El carrito no funciona en la demo
`CartProvider` es 100% server-backed: cada acción va a `/api/cart` → Supabase.
Con el stub devolviendo 500, **agregar al carrito muestra un toast de error**.
El flujo de compra —lo único que la demo tiene que probar— estaba muerto.

Bonus, con base real también estaría roto: `/api/cart` hace
`String(body.size).slice(0, 16)` y las etiquetas actuales
("4 mm (Nro 0) · mayorista, pieza x100m") tienen 37 caracteres.

### A5 — El sitio se anuncia a sí mismo como caído
Como el catálogo se sirve del snapshot, `source === 'snapshot'` es siempre
verdadero, y la home y la tienda muestran el cartel
*"Estamos actualizando la tienda — por ahora los pedidos los tomamos por
WhatsApp"*. La demo le decía al cliente que el sitio está roto.

---

## B. El modelo de datos: el parche de fondo

Hoy el precio mayorista se guarda como **filas extra de talle** con la
condición pegada en el texto de la etiqueta:

| `size` | `price_uyu` |
|---|---|
| `4 mm (Nro 0) · por metro` | 13 |
| `4 mm (Nro 0) · mayorista, pieza x100m` | 3.96 |

Consecuencias medibles, no estéticas:

1. **El filtro "Talle" de `/tienda`** genera un chip por cada string. La tienda
   ofrece filtrar por *"4 mm (Nro 0) · mayorista, pieza x100m"*.
2. **El JSON-LD miente.** `AggregateOffer.lowPrice` sale del mínimo de las
   filas de talle → Google publica **"desde $3,96"** para una cinta que por
   menor cuesta $13 y por mayor sale $396 la pieza.
3. **El mensaje de WhatsApp miente.** Arma `Talle: 4 mm (Nro 0) · mayorista,
   pieza x100m` / `Cantidad: 2` / `Subtotal: $7,92` — cuando el cliente en
   realidad está pidiendo 2 piezas de 100 m, o sea $792. Dos órdenes de
   magnitud de diferencia, en el mensaje que cierra la venta.
4. **No hay concepto de contenido.** Nada sabe que la pieza trae 100 m, así
   que no se puede mostrar ni el ahorro ni el precio por metro.
5. **El precio "desde" de la tarjeta** toma la primera fila disponible, que
   puede ser la mayorista.

El modelo correcto —y el que usa el rubro— es de dos ejes:
**variante** (el atributo físico: ancho, color, medida) × **presentación**
(cómo sale del local: por metro, pieza cerrada de 100 m, unidad). El precio
mayorista es un *quantity break* por presentación, no un talle.

---

## C. Auditoría por ruta — storefront

| Ruta | Veredicto | Motivo |
|---|---|---|
| `/` | Reescribir | Hero es un cuadrado bordó con texto sin tildes. "Hecho a mano", proceso de encargo, teaser de drop, testimonios de prendas. |
| `/tienda` | Conservar + arreglar | Buena base. Filtro "Talle" inservible (ver B1), tarjetas 3:4 verticales para fotos cuadradas, sin señal de "tiene precio x mayor". |
| `/tienda/[slug]` (categoría) | Conservar + arreglar | El `title` se arma como `"${cat.name} de crochet, tejidos a mano"` → **"Cintas de crochet, tejidos a mano"**. |
| `/tienda/[slug]` (ficha) | Reescribir bloque de compra | Selector "Talle" + botón "A medida"; "Tejido a mano en Montevideo"; "no aceptamos cambios porque es a tu medida"; guía de talles corporales; "Completá el look"; `ShareButton` dice "Dahila Crochet"; Pinterest dice "tejido a mano". |
| `/carrito` | Reescribir mensaje | `"Hola Anush!"`; "Se teje al encargar"; nota de regalo; cupones contra una API muerta. |
| `/colecciones`, `/colecciones/[slug]` | **Borrar** | Concepto de *drops* por temporada de una marca de indumentaria. No hay dato de colecciones en el catálogo y la nav ya la oculta. Una sección vacía es peor que ninguna. |
| `/encargo`, `/encargo/estado` | **Borrar** | Formulario de prenda a medida con busto/cintura/largo y seguimiento de producción. No existe en una mercería de stock. |
| `/tejedoras` | **Borrar** | Reclutamiento de la red de tejedoras de Dahila. |
| `/atelier` | Renombrar a `/nosotros` | El contenido ya es de Avíos; "atelier" es la palabra de un taller de diseño de autor, no de una mercería. |
| `/ofertas` | Conservar | Sirve; hoy vive de un descuento "Lanzamiento del sitio" del 10 %. |
| `/favoritos` | Conservar | Útil para un comprador que arma una lista de compra. Hoy depende de una API muerta. |
| `/ig` | Conservar y priorizar | Con 47.100 seguidores, el link de la bio **es** el canal. Estaba bien pensado y funcionando a medias. |
| `/contacto` | Conservar | Ya tiene dirección, horario y mapa reales. |
| `/info`, `/terminos` | Reescribir | Adaptados a mano a último momento. La política de cambios sigue razonando sobre prendas a medida. |
| `/llms.txt`, `/merchant-feed.xml`, `/sitemap`, `/robots`, `/og` | Arreglar | Arrastran textos y el teléfono de Dahila. |

### Faltante estructural (no es un resto de Dahila: es un hueco)
No hay **ninguna página de mayorista**. Avíos vende por mayor, y la
bibliografía del rubro coincide en que es lo primero que un comprador
mayorista busca: a quién le venden, mínimo de compra, cómo se pide, formas de
pago y envío. Ver `REFORMA.md` §Investigación.

---

## D. Auditoría del admin

15 secciones. En modo demo **ninguna** funciona (todas hacen `createClient()`
del navegador contra Supabase, y el login es Supabase Auth).

| Sección | Veredicto |
|---|---|
| Estrategia | **Borrar** — datos confidenciales de Dahila (A1). |
| Tejedoras | **Borrar** — red de tejedoras. |
| Encargos | **Borrar** — encargos a medida. |
| Colecciones | **Borrar** — drops. |
| Lista VIP / Suscriptores | **Borrar** — lanzamientos por temporada. |
| Testimonios | **Borrar** — testimonios de prendas; no hay dato real. |
| Cupones | **Borrar del alcance de la demo** — 523 líneas contra una tabla que no existe. |
| Carritos | **Borrar** — dependía de carritos persistidos en base. |
| Pedidos | **Borrar** — log de mensajes de WhatsApp enviados; sin base, no hay nada que loguear. |
| Descuentos, Colores | Borrar de la demo — se pliegan dentro de Productos/Configuración. |
| Inicio, Productos, Categorías, Configuración | **Conservar**, reescritos en modo demo de solo lectura. |

---

## E. Higiene del repo

- `package.json` → `"name": "dahilia-app"`.
- `AGENTS.md` describe el proyecto de Dahila (incluida la regla de precios que
  apunta a `/admin/estrategia`).
- `README.md` (14 KB) es el de Dahila.
- 7 volcados HTML en la raíz (`home.html`, `home3.html`, `home4.html`,
  `home5.html`, `prod.html`, `tienda.html`, `tienda2.html`, `atelier.html`,
  `contacto.html`) ≈ 1,5 MB de depuración de una sesión anterior.
- `dev.log`, `stub.log`.
- `src/images/` — PNG originales sin comprimir, ya duplicados en `public/images/`.
- `src/lib/env.ts` → `SITE_URL` cae a `https://dahila.uy`.
- El token de diseño se llama `dahila` y se importa en ~40 archivos.
- `src/lib/*`: `description-draft.ts`, `complements.ts` ("Completá el look"),
  `addons.ts`, `subscribe.ts`, `email/*` (Brevo, plantillas de encargo),
  `indexnow.ts`, `seo-notify.ts` — todos escritos para el flujo de Dahila.
- `<meta name="p:domain_verify">` es la verificación de Pinterest de Dahila.
- `openingHours: 'Mo-Fr 09:00-18:00'` en el JSON-LD, contra el horario real
  L-V 9:00-18:30 / Sáb 9:00-13:30.
- `"Mercería de mercería en Montevideo"` en el JSON-LD de `Organization`
  (resto de un reemplazo automático).

---

## F. Arquitectura de la demo

El "modo snapshot" reusa el mecanismo de *resiliencia ante caída de base* de
Dahila para servir el catálogo local. Funciona, pero tiene tres costos que
para una demo son caros:

1. Todo lo que **no** pasa por `getCatalog()` sigue muerto: `site_settings`
   (el layout raíz, `/contacto`, `/info`, `/terminos`, `/carrito`, `/ig`,
   `/nosotros`), el carrito, favoritos y la búsqueda del header.
2. El sitio se declara en modo lectura (A5).
3. Depende de que alguien se acuerde de levantar `demo-stub-server.js`; si no,
   cada página tarda ~15 s.

Un snapshot que es *plan B* no puede sostener una demo. Tiene que ser una
**fuente de datos de primera clase**, elegida explícitamente por entorno.
