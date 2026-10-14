<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mapa del proyecto

- **Qué es**: sitio de **Mercería Avíos** — mercería con local en San José 851
  esquina Andes, Montevideo. Vende **por mayor y por menor**. Dueña: Alejandra
  Calvete. Next.js 16 + React 19 + Netlify. El checkout es por WhatsApp: no hay
  pasarela de pago ni tabla de pedidos.
- **Estado**: es una **demo de venta**. **No hay ningún Supabase conectado** —
  `.env.local` no tiene URL ni key, `hasSupabase` da `false` y `createClient()`
  devuelve `undefined`. Corre en modo demo (`NEXT_PUBLIC_DEMO_MODE=1`), sirviendo
  el catálogo desde `src/lib/catalog/data.ts` sin tocar la red. `npm run dev` y listo.
- **Panel** (`/panel`): funcional. Carga, edita y borra productos, categorías y
  descuentos, y edita los textos del sitio. Las ediciones se guardan en el
  navegador (`src/lib/admin/store.ts`) y la tienda las refleja al instante
  (`CatalogProvider`). El login es `admin`/`admin` y **no es seguridad**: leer
  la advertencia en `src/lib/admin/auth.ts` antes de poner un dato real detrás.
- **Origen**: el código salió de clonar el de otro cliente (Dahila Crochet, ropa
  tejida a mano). Lo que se sacó y por qué está en `AUDITORIA.md`; lo que se
  reconstruyó, en `REFORMA.md`. **Si aparece algo que huele a Dahila —tejido,
  talles, encargos a medida, colecciones, un teléfono que no sea el de Avíos—
  es un resto: sacalo, no lo adaptes.**

# El problema real

Avíos **ya tiene** su catálogo: un libro de papel en el mostrador y un PDF de
unas 720 páginas que mandan por WhatsApp cuando alguien lo pide. El problema no
es que les falte un catálogo — es que el que tienen **no se puede consultar**.

De ahí sale la arquitectura, y conviene tenerlo presente antes de agregar nada:

- **El buscador no es una función, es el producto.** Con este tamaño de
  catálogo, encontrar es todo.
- **El sitio no compite con WhatsApp: lo alimenta.** El catálogo de WhatsApp
  tiene un tope de 500 productos, así que el catálogo de Avíos no entra ahí. Lo
  que entra al chat es el RESULTADO de una búsqueda, no el catálogo.
- **`/mostrador` es para quien atiende, no para el comprador.** Es la respuesta
  directa al libro: buscar por código o medida y pegar la respuesta en el chat.

# La escala real

El catálogo de Avíos son **cientos de artículos**. Los ~20 que están en
`data.ts` son la primera página del catálogo en papel, cargada como muestra.

Eso decide cosas y conviene tenerlo presente antes de escribir nada:

- **Nada renderiza la lista completa de una.** `/tienda` pinta de a 24 con
  "ver más"; `/mayorista` muestra los 12 mayores ahorros y manda el resto a
  `/lista-de-precios`. Una grilla de cientos de tarjetas con sus imágenes es un
  LCP malo y memoria de más en un teléfono.
- **La carga masiva es por planilla**, no de a uno: `/panel/respaldo` baja el
  CSV y lo vuelve a subir (`src/lib/admin/importar.ts`). Cargar cientos de
  artículos por formulario no lo hace nadie.
- **Ojo con localStorage.** El store del panel copia el catálogo entero; con
  cientos de artículos y fotos en base64 se llega al tope de ~5 MB del
  navegador. `write()` avisa fuerte en vez de fallar en silencio, pero es un
  límite real de la demo, no del modelo.

# Lo que no se negocia

- **Precios**: acá **no se inventa un precio ni una medida**. Todo lo que está en
  `src/lib/catalog/data.ts` salió del catálogo en papel de Alejandra. Cuando un
  dato falta, se deja `null` y se anota en `needsReview` del producto — nunca se
  completa con algo verosímil. El panel muestra esos pendientes en `/panel`.
- **Modelo de precios**: producto → **variante** (ancho, color, medida) →
  **presentación** (por metro / pieza cerrada de 100 m / unidad). El precio por
  mayor cuelga de la PRESENTACIÓN, no del cliente: por eso esta tienda no
  necesita login de mayorista. No volver a meter el precio mayorista como si
  fuera un talle — ese era el parche que se vino a arreglar.
- **Un solo cálculo de plata**: todo lo que muestre precios sale de
  `src/lib/catalog/pricing.ts`. La ficha, el carrito y el mensaje de WhatsApp
  tienen que decir el mismo número, porque salen de la misma función.
- **Marca**: **Mercería Avíos**, o **Avíos** a secas. La dueña es **Alejandra**.
  Voz: es-UY con voseo, directa y de mostrador. Nada de jerga de marketing.
- **Contacto**: WhatsApp +598 98 526 943, Instagram @merceria_avios_montevideo.
  Está en `BRAND` (`src/lib/env.ts`) y en `SETTINGS` — no hardcodear en otro lado.

# Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Catálogo, categorías, textos del sitio | `src/lib/catalog/data.ts` |
| Tipos del dominio | `src/lib/catalog/types.ts` |
| Catálogo editable del panel | `src/lib/admin/store.ts` |
| Puerta del panel (demo) | `src/lib/admin/auth.ts` |
| Catálogo que ve el navegador | `src/components/CatalogProvider.tsx` |
| Transcripción del catálogo en papel | `database/catalogo-papel.json` |
| Toda la matemática de precios | `src/lib/catalog/pricing.ts` |
| Búsqueda: sinónimos del rubro y coincidencia | `src/lib/search/match.ts` |
| Lectura del catálogo (demo o Supabase) | `src/lib/catalog/index.ts` |
| Carrito (localStorage) | `src/lib/cart/`, `src/components/CartProvider.tsx` |
| Mensaje de WhatsApp | `src/lib/cart/whatsapp.ts` |
| Tokens de diseño (servidor y cliente) | `src/components/ui/tokens.ts` |
| Primitivas de interfaz | `src/components/ui/Primitives.tsx` |
| Identidad, dirección, horario | `src/lib/env.ts` (`BRAND`) |
| Texto para Instagram y Google | `src/lib/admin/publicacion.ts` |
| Respaldo: CSV y JSON | `src/lib/admin/respaldo.ts` |
| Importar catálogo desde planilla | `src/lib/admin/importar.ts` |
| Dejar la demo en cero | `src/lib/admin/reset.ts` |
| Feeds para Google y Meta | `src/lib/catalog/feed.ts` |
| Qué conectar y en qué orden | `src/app/panel/conexiones/` |
| Lista de precios imprimible | `src/app/(tienda)/lista-de-precios/` |
| Mostrador: búsqueda para atender | `src/app/mostrador/` |
| Auditorías del sitio | `scripts/audit/` (`npm run audit`) |
| Pruebas de lógica (sin navegador) | `scripts/test/*.mjs` (`npm test`) |
| Requisitos, casos de uso y arquitectura | `ESPECIFICACION.md` |
| Cómo se vende esto | `VENTA.md` |

# Skills del repo (usarlas, no re-derivar)

- `avios-storefront` — sistema de diseño, reglas de UX del rubro, Next 16.
  Leerla ANTES de tocar UI.
- `quality-gate` — `npm run verify` (typecheck → lint → test → build), en ese
  orden, antes de dar algo por terminado. Y `npm run audit` (accesibilidad,
  layout en móvil, enlaces, rendimiento) cuando el cambio es grande o toca
  estilos.

# Cómo se prueba

- `npm test` corre la lógica pura en segundos y sin navegador: la búsqueda y el
  respaldo. Node 24 ejecuta los .ts directo; el alias `@/` lo resuelve
  `scripts/test/lib/alias.mjs`. **Si tocás precios, búsqueda o el catálogo,
  esto es lo primero que hay que correr.**
- `npm run audit` y `npm run test:e2e` necesitan el sitio andando y un Edge
  headless. Son para lo que sólo se ve en pantalla.
- Al agregar una página, agregarla a `scripts/audit/lib/rutas.mjs`. Si no, la
  auditoría pasa en verde sin haberla mirado nunca.
