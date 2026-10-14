# AVIOS-PLAN — auditoría, mejoras, costos, precio y venta

Para Mati (SIAR). Fecha: 13/10/2026. Documento interno: **no se le muestra a
Alejandra**.

Convención de todo el documento:

- **HECHO** = lo vi en el código, en el historial de git, lo medí, o sale de una fuente citada.
- **SUPUESTO** = estimación mía. Va marcado con ⚠️ y dice de qué depende.
- Tipo de cambio usado en todo el documento: ⚠️ **USD 1 = UYU 40** (SUPUESTO: BROU publicaba 40,23 el 13/07/2026 según [datosuruguay.com](https://datosuruguay.com/dolar/calculadora); no encontré la cotización de octubre. Revisalo el día de la reunión).

---

## Resumen ejecutivo

- **La demo está bien hecha, pero no escala a miles de productos tal como está.** HECHO: el layout de la tienda le pasa el catálogo **entero** al navegador en **cada página** (lo medí: los 58 precios del catálogo viajan hasta en `/contacto`). Con 20 productos no se nota (~29 KB). Con 3.000 serían ⚠️ ~4,6 MB de datos dentro de cada página, un build de miles de páginas de varios MB cada una y un teléfono procesando todo eso para mostrar 24 tarjetas. **Es el único cambio grande imprescindible** antes de cargar el catálogo real (12–16 h). Está planteado en la Fase 4 y **no lo toqué**: espera tu OK.
- **Arquitectura recomendada: híbrida.** Supabase como fuente de verdad del panel (escrituras, login, planilla), el sitio público pre-generado en el CDN de Netlify y regenerado sólo cuando cambia algo (webhook), y **las fotos fuera de Supabase**. Es lo que Dahila terminó aprendiendo después de dos cortes por cuota.
- **Ya apliqué 6 arreglos chicos**, cada uno en su commit (detalle en Fase 4). El más importante para la reunión: **la demo mostraba un 10% de descuento "Lanzamiento" en todo el catálogo que no sale del catálogo de Alejandra**; ella iba a ver sus artículos a precios que nunca puso ($ 11,70 en vez de $ 13). Quedó apagado.
- **Tráfico esperable** ⚠️: 2.000 / 6.000 / 15.000 sesiones por mes (conservador / medio / optimista), con picos en temporada de carnaval. Calibrado con los datos reales de Dahila (4.114 seguidores → 1.340 sesiones en 28 días).
- **Costo real tuyo** (con la corrección de la Fase 4 aplicada): **~USD 11/mes (USD ~130/año) en los escenarios conservador y medio, USD 11–36/mes en el optimista**. Sin la corrección, el escenario optimista pasa a Netlify Pro con recargas.
- **Riesgo operativo que no podés ignorar**: HECHO, en Netlify Free, si el equipo se queda sin créditos **se pausan todos los sitios del equipo** con "Site not available" hasta el próximo ciclo ([Netlify, billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/)). Si Avíos vive en el mismo equipo que Dahila, un pico de carnaval de Avíos te baja Dahila. **Equipo propio por cliente y plan Personal (USD 9) para cualquier cliente que pague.**
- **Precio propuesto** (objetivo, para ~1.000 artículos): puesta en marcha USD 1.400 + carga USD 630 + USD 75/mes. Con 3.000 artículos la carga sube a USD 2.030 (total USD 3.430). Piso y techo en la Fase 5. ⚠️ Todo el precio de la carga depende de **si el PDF tiene texto seleccionable o es escaneado**: por eso el piloto.
- **Cómo venderlo**: demo de 5 minutos centrada en buscar y en la cuenta de la pieza, propuesta por WhatsApp en 48 h, y **un piloto pago de 150–300 artículos de carnaval** antes de comprometer el catálogo entero. El carnaval arranca a fines de enero ([Gobierno de Uruguay](https://www.gub.uy/presidencia/comunicacion/noticias/uruguay-prepara-su-fiesta-carnaval-compartida-miles-vecinos-visitantes); el desfile inaugural 2026 fue el 22/01 según [Montevideo Portal](https://www.montevideo.com.uy/Tiempo-libre/Se-realizo-el-desfile-inaugural-del-Carnaval-conoce-los-ganadores-de-cada-categoria-uc950657)), y Avíos ya publica que es su fuerte. Llegar a diciembre con el piloto andando es el argumento de calendario.
- **Lo que no sirve del plan original y hay que decirlo**: (1) el dominio .uy por menos de USD 20/año es cierto sólo vía revendedor y sin IVA; .com.uy anda por USD 45 + IVA. (2) Supabase Free no es "gratis para siempre" para vos: el límite de **2 proyectos gratis cuenta en todas tus organizaciones** y Dahila ya usa uno. El tercer cliente ya no entra.

---

## FASE 1 — Auditoría de Dahila (solo lectura)

Carpeta: `C:\Users\mati\Downloads\dahilia`. 115 commits. Leí el código de datos, la config, los SQL, las pruebas y los commits de egress. No toqué nada.

### 1.1 Cómo se consulta Supabase

- **HECHO — una sola lectura del catálogo, cacheada y compartida.** `src/lib/catalog.ts`: `getCatalog()` envuelve 6 consultas en paralelo (categorías, productos con joins, colores, descuentos activos, settings, colecciones) en `unstable_cache` con tag `catalog` y TTL de 3600 s. Lo usan home, tienda, categorías, fichas, layout y el buscador.
- **HECHO — el error no se cachea.** La función cacheada **lanza** si falla la consulta principal; el fallback al snapshot se resuelve afuera (`getCatalog` → `snapshotCatalog()`). Comentario explícito en el código: "lo que lanza NO se cachea".
- **HECHO — cliente sin cookies para lo público.** `src/lib/supabase/public.ts`: sin `cookies()`, para que las rutas públicas sean estáticas (ISR). El cliente con cookies (`server.ts`) queda para `/admin` y las APIs de sesión. Esto se descubrió tarde: commit `da30c72` (05/08/2026), "ninguna página pública quedaba como HTML pre-generado".
- **HECHO — selects**: `select('*')` con joins anidados (`'*, category:categories(*), media:product_media(*), sizes:product_sizes(*), colors:...'`). Trae todas las columnas. Con 32 productos no importa; con miles sí.
- **HECHO — paginación**: no hay. Se trae el catálogo entero (`.in('status', ['active','soldout'])`) y se filtra en memoria. Las colecciones con `.limit(12)`.
- **HECHO — índices**: `idx_products_status_sort`, `idx_product_media_product`, `idx_cart_items_cart`, `idx_discounts_active(active, scope)`, `idx_orders_created_at`, etc. (`database/schema-master.sql`, `schema.sql`, `schema-discounts.sql`…). Suficientes para su volumen.
- **HECHO — RLS**: 100 líneas de `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` en `database/`. Las primeras políticas eran `TO authenticated USING (true)` (cualquier usuario logueado era admin); `database/seguridad-2026-09.sql` las rehace con `public.is_admin()` y cierra Storage a sólo admin. `DECISIONES.md` deja escrita la regla y un pendiente crítico: **desactivar "Enable email signups" en Supabase Auth** (verificado abierto el 11/07/2026). ⚠️ No verifiqué contra la base de producción si ese SQL y ese ajuste se aplicaron.
- **HECHO — búsqueda**: `/api/search` busca sobre el catálogo cacheado, no consulta la base. Antes bajaba hasta 200 filas con joins **por tecla** (commit `678a4d5`).

### 1.2 Cómo se evita el egress

- **HECHO — imágenes (el 95% del problema)**:
  - Se guardan en **Supabase Storage** y se sirven vía el optimizador de Next en Netlify (`/_next/image`).
  - `next.config.ts`: `minimumCacheTTL: 31536000` (1 año), **solo WebP**, 5 anchos + 3 miniaturas (antes 8 + 5 y AVIF + WebP), calidades declaradas (82/90/95/100).
  - `src/lib/media.ts` → `prepareImageForUpload()`: reduce en el navegador a ≤1600 px, JPEG q82, antes de subir; `cacheControl` de 1 año; nombre con sufijo aleatorio y `upsert:false` (objetos inmutables: nunca hay que invalidar).
  - `botImageUrl()`: JSON-LD, sitemap de imágenes y tarjeta OG apuntan a `dahila.uy/_next/image`, no a `supabase.co`. Googlebot y los crawlers de WhatsApp/Meta ya no bajan originales.
  - `scripts/optimizar-storage.mjs`: recompresión única de lo ya subido.
  - Lazy loading: el de `next/image` por defecto; `fetchPriority="high" loading="eager"` sólo en la imagen LCP; `sizes` en todas.
- **HECHO — páginas estáticas**: ISR con `revalidate = 3600`, `generateStaticParams` en fichas y colecciones, invalidación desde el admin (`/api/seo/reindex` → `revalidateTag(CATALOG_TAG, { expire: 0 })` + `revalidatePath`).
- **HECHO — headers**: `netlify.toml` no define caché propio; lo maneja Next (`s-maxage` + `stale-while-revalidate` en ISR). La tarjeta OG y el feed de Merchant tienen `Cache-Control` explícito con `s-maxage`.
- **HECHO — resiliencia**: `catalog-snapshot.json` (catálogo real commiteado, generado con `scripts/snapshot-catalog.mjs`), modo "pedidos por WhatsApp" que se enciende solo si la base no responde, copias locales de las fotos principales en `public/fotos-respaldo/`.

### 1.3 Qué causó el consumo excesivo y cómo se arregló (historial de git)

Hubo **dos** cortes, no uno:

| Fecha | Qué pasó (HECHO, de los commits) | Causa | Arreglo |
|---|---|---|---|
| jul/2026 | 11,6 GB de egress con 150 MB almacenados; la org llegó a **293%** del Cached Egress y Supabase restringió todo con 402 hasta el 29/07 (`4ff38f3`, `c2ab631`) | (1) fotos de celular subidas crudas (2–8 MB); (2) `cacheControl` de 1 h en cada subida → el optimizador re-bajaba el original cada hora; (3) URLs crudas de Storage en JSON-LD/sitemap/OG → los bots bajaban originales; (4) ~80 variantes por foto (8 anchos × 5 miniaturas × 2 formatos) | `prepareImageForUpload`, `botImageUrl`, `minimumCacheTTL` 1 año (`b096f11`), snapshot + cartel de mantenimiento 503 |
| 31/08/2026 | (preventivo) | `/tienda` dinámica → 5 consultas por visita; layout con 4–5 consultas por página; `/api/search` con 200 filas por tecla | `unstable_cache` con tag + invalidación desde el CMS (`678a4d5`) |
| **20/09/2026** | Proyecto restringido (402) otra vez. 13 de 15 fotos rotas en el inicio; el carrito daba 500 y el botón decía "✓ Agregado" sin guardar (`9914ae1`) | **Tus propias pruebas**: cada build vacía `.next/cache/images`, y correr la suite e2e varias veces después de varios builds hizo ~17.000 descargas de originales | `tests/e2e/support/guard.ts` responde con un píxel a `/_next/image` y `supabase.co/storage`; regla escrita en la skill `quality-gate`; menos variantes (`7c40987`); modo WhatsApp (`90b7023`) |

- **Lección central**: el egress no lo generaron las clientas, lo generó **la combinación de fotos en Supabase + optimizador + caché que se vacía en cada deploy + pruebas automáticas**. Las clientas fueron 1.340 sesiones en 28 días (ver 1.5).

### 1.4 Estructura, calidad, SEO, rendimiento, accesibilidad, mobile, seguridad, errores

- **Estructura**: App Router, `src/lib` por dominio, SQL idempotente fechado en `database/`, decisiones en `DECISIONES.md`. HECHO.
- **Calidad**: TypeScript estricto, lint en 0 warnings como regla (`quality-gate`), Playwright + axe. Commits con el porqué. HECHO.
- **SEO**: sitemap con categorías y fotos, JSON-LD (Product, ItemList, BreadcrumbList, FAQ), IndexNow, 301 de netlify.app al dominio, OG en JPEG vía sharp (915 KB PNG → ~95 KB, porque WhatsApp descarta imágenes pesadas). HECHO.
- **Rendimiento**: `next/font` auto-hosteada, `fetchPriority` en LCP, `sizes`. HECHO.
- **Accesibilidad**: axe en las pruebas e2e. HECHO.
- **Mobile**: GA real dice 89% de los clics de Google desde celular (`research/estadisticas-2026-09-13.md`); la skill exige mirar a 390 px. HECHO.
- **Seguridad**: CSP armada por entorno, HSTS, `is_admin()` en RLS, rate limit por IP del borde de Netlify (`x-nf-client-connection-ip`). HECHO.
- **Errores**: `error.tsx` + `global-error.tsx`, snapshot, 503 con `Retry-After`, carrito honesto. HECHO.

### 1.5 Dato real de tráfico de Dahila (la base de la Fase 3)

HECHO (`research/mediciones/ga-2026-09-21.md`, GA4, 24/08–20/09/2026, 28 días):

- 1.180 usuarios · **1.340 sesiones** · 5.230 vistas → **3,9 páginas por sesión**.
- Organic Social 677 sesiones (51%), Direct 525, Organic Search 115.
- 834 de 1.180 usuarios en Montevideo.
- Instagram de Dahila: **4.114 seguidores** al 17/08/2026 (`research/instagram-audit.md`).
- Embudo: 1.125 `product_view` → 28 `add_to_cart` → 4 `order_sent`.

### ✅ Qué replicar tal cual en Avíos

1. `unstable_cache` con tag + **lanzar ante error** para no cachear la falla. *(Avíos tenía el tag pero cacheaba el error: lo arreglé, commit `fcef3a2`.)*
2. Cliente Supabase **sin cookies** para lo público. *(Ya está en `src/lib/supabase/public.ts`.)*
3. Config de imágenes: `minimumCacheTTL` 1 año, **un solo formato**, pocos anchos. *(Aplicado, commit `7c66d43`.)*
4. Subidas inmutables: redimensionar antes de subir, sufijo aleatorio, `upsert:false`, caché 1 año. *(Avíos tiene `compressImageToDataUrl` para localStorage; falta la versión para Storage.)*
5. `botImageUrl` para JSON-LD/sitemap/OG. *(Ya está en `src/lib/media.ts`.)*
6. **Snapshot real** generado por script desde la base y commiteado. *(Avíos cae al catálogo de la demo, de 20 artículos: con el catálogo real eso sería servir 20 de 3.000.)*
7. **Guardián de pruebas** que nunca pida fotos reales a Storage, y la regla "no encadenar builds". *(Avíos aún no tiene Storage; agregarlo el día que lo tenga.)*
8. Workflow programado de GitHub Actions que toque la base todos los días (en Dahila: `daily-summary.yml`, 09:00 UY). En Avíos sirve, además, para que **Supabase Free no se pause** a la semana sin actividad.
9. Políticas RLS con `is_admin()` y signups desactivados desde el día uno.
10. Modo "pedidos por WhatsApp" que se enciende solo si la base cae.
11. OG en JPEG liviano. *(La de Avíos es PNG de 68 KB: está bien así.)*
12. 301 del subdominio netlify.app al dominio propio. *(Ya está preparado y comentado en `netlify.toml`.)*

### Qué hizo bien Dahila / qué quedó flojo

**Bien**
- Cada incidente terminó en código + regla escrita + comentario con el número real. Es raro y vale oro.
- ISR + invalidación desde el admin: frescura inmediata sin releer la base por visita.
- Degradación elegante: la tienda sigue vendiendo por WhatsApp con la base caída.
- Medición real (GA4 + Search Console) antes de decidir.

**Flojo**
- **Fotos en Supabase Storage**: el diseño de fondo que causó los dos cortes. Todo lo demás fueron parches sobre eso.
- **Las pruebas leen la base de producción** (el guardián intercepta escrituras, no lecturas).
- `select('*')` del catálogo entero sin paginar: no escala.
- `src/proxy.ts` tiene la fecha de reinicio de cuota **fija** (`QUOTA_RESET = 29/07/2026`): para la próxima caída el `Retry-After` ya está mal.
- Rate limit en memoria por instancia (lo dice el propio comentario: no frena un ataque distribuido).
- `DECISIONES.md` dice "No instalar GA4" y el código tiene `GoogleAnalyticsScript.tsx` con GA4: la documentación quedó desfasada.
- `netlify.toml` con `NODE_VERSION = "20"`: Node 20 dejó de tener soporte el 30/04/2026. Igual en Avíos.
- El script de Indexing API se usó semanas sin efecto (la propia auditoría del 13/09 lo detectó).

---

## FASE 2 — Auditoría de la demo de Avíos

Medí contra el build de producción (`next build` + `next start`, Edge headless, 390 px, 4G lenta, CPU 4×).

### 2.1 Lo que consume de más / no escala a miles de productos

| # | Hallazgo (HECHO) | Por qué importa con miles | Severidad |
|---|---|---|---|
| 1 | `(tienda)/layout.tsx` pasa el catálogo **entero** a `CatalogProvider` (componente de cliente). Viaja serializado en el HTML **y** en el payload RSC de **cada** ruta. Medido: los 58 precios del catálogo están en `/contacto`, en el HTML y en el RSC. | 20 productos = 29 KB de JSON. Proyección: 1.000 → 1,2 MB; **3.000 → 3,7 MB de JSON, ~4,6 MB dentro del HTML** de cada página, más lo mismo en cada prefetch de enlace. Comprimido: ⚠️ entre 90 y 650 KB por página según cuánto se repitan los textos (los 20 artículos reales dan 216 B gzip por artículo). El teléfono igual tiene que parsear los 4,6 MB. | **Crítica** |
| 2 | `generateStaticParams` pre-genera **todas** las fichas en el build, y cada una lleva el punto 1 adentro. | 3.000 fichas × ~4,6 MB = ⚠️ ~14 GB de salida de build. No termina, o tarda una eternidad. | **Crítica** |
| 3 | La grilla, el buscador del header y `/mostrador` filtran **en el navegador** sobre el catálogo completo. | Es la razón por la que el punto 1 existe. Se resuelve con un índice liviano (abajo). | Alta |
| 4 | `/tienda` se pinta recién cuando baja el JS (`useSearchParams` sin HTML del servidor para la grilla). LCP medido: **2.956 ms** antes y **2.988 ms** después de mis cambios; el objetivo es ≤ 2.500. | Es la página más importante y la única en rojo de la auditoría. | Alta |
| 5 | Si Supabase fallaba, se cacheaba **para siempre** el catálogo de respaldo (20 artículos). | Con Supabase Free, que se pausa tras 1 semana sin actividad, era casi seguro que pasara. | **Crítica → arreglado** (`fcef3a2`) |
| 6 | Imágenes: AVIF + WebP × 15 anchos = hasta 30 versiones por foto. | El mecanismo exacto del corte de Dahila. | Alta → **arreglado** (`7c66d43`) |
| 7 | `/lista-de-precios` pinta todo el catálogo en una página. | Con miles de artículos, una página de cientos de KB. Tiene que ir por categoría. | Media |
| 8 | `sitemap.ts` pone `lastModified: now` a todo. | Google ignora un `lastmod` que siempre cambia. Con miles de URLs conviene que sea real (`updated_at`). | Baja |
| 9 | 42–61 requests por primera visita. | En Netlify, cada 10.000 requests cuestan 2 créditos: con tráfico, los requests pesan casi tanto como el ancho de banda (ver Fase 3). | Media |
| 10 | Fuentes: 114 KB en la primera visita (Fraunces + Inter). | ~25% del peso de una primera visita. | Baja |

### 2.2 Lo que se veía poco profesional (y qué hice)

- **10% "Lanzamiento" sobre todo el catálogo**, con la etiqueta "−10%" en cada tarjeta, encima de "Por mayor −70%". Precios que Alejandra nunca puso. → **apagado** (`6acc532`). Queda en `/panel/descuentos` para prenderlo en vivo en la demo.
- **Baldosas de categoría con texto encimado** en el teléfono ("Alfiletero pulser…" sobre "Herramientas de costura"). → **arreglado** (`6d0c252`).
- **Chips de categoría en 4 renglones** en el teléfono, empujando los artículos. → **una fila deslizable** (`cf737e9`).
- **"Sin registro ni mínimo de compra"** en la ficha: el mínimo por mayor no está confirmado (está en la lista de preguntas de `VENTA.md`). → **sacado** (`946489a`).
- Pendientes que **no** toqué porque son datos, no código (ver riesgos):
  - **Tres teléfonos en circulación**: el sitio usa 098 526 943; el flyer, 092 322 260 (comentario en `src/lib/env.ts`); [Guía Comercial](https://guiacomercial.uy/ficha/merceria-avios-montevideo-montevideo/) publica el fijo **2902 8106**.
  - El sitio dice "Efectivo y transferencia"; Guía Comercial dice que el local acepta crédito, débito y pago NFC.
  - Fotos: 12 de 20 artículos con foto; el resto con ilustración de categoría (correcto, pero en la demo se ve "a medio hacer").
- Detalle de documentación: la skill `avios-storefront` dice que el acento es petróleo `#14505E`; los tokens reales son fucsia (`brand600 #B91744`), que es el de la marca. La skill está desactualizada, el sitio está bien.

### 2.3 Lo que ya está bien (y no hay que tocar)

- Modelo producto → variante → presentación, y **un solo módulo de precios** (`pricing.ts`). Es lo mejor del proyecto.
- Buscador con vocabulario del rubro, filtros (por mayor, precio tope, ocultar agotados, orden), búsqueda en la URL, búsquedas sin resultado registradas, botón "Consultar por WhatsApp" en la ficha y botón flotante. **Lo que pedís en "botón de WhatsApp, buscador y filtros" ya existe**: lo que falta es que escale.
- Panel completo (precios masivos, planilla CSV de ida y vuelta, textos para publicar).
- Auditoría propia (`npm run audit`): **0 violaciones de accesibilidad en 25 rutas, 0 desbordes a 390 px, 70 enlaces sin romper** (corrido hoy, después de mis cambios).

### 2.4 ¿Estático, Supabase o híbrido?

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| **Estático puro** (catálogo en un archivo, se regenera con cada cambio) | Costo cero de base. Nada que se pause. | Cada cambio de precio = un deploy (15 créditos de Netlify cada uno). Alejandra no puede editar sin vos. Miles de artículos en un archivo del repo = edición frágil. | Sirve **sólo para el piloto** |
| **Supabase consultado en cada visita** | Siempre fresco | El egress crece con el tráfico. Es lo que le pasó a Dahila al principio. | Descartado |
| **Híbrido** ← recomendado | Supabase es la fuente de verdad del panel (login real, escrituras, planilla). El público se sirve **pre-generado desde el CDN** y se regenera sólo cuando cambia algo (webhook → `revalidateTag`). El navegador recibe **sólo lo que pinta** + un **índice de búsqueda liviano** (⚠️ ~30–100 KB comprimido para 3.000 artículos) que se baja una vez y queda en caché. **Fotos fuera de Supabase.** | Hay que hacer el cambio de la Fase 4 (12–16 h) y configurar el webhook una vez. | **Elegido** |

- **Dónde van las fotos**:
  - Piloto (≤300 artículos): en `public/` del repo. Las sirve Netlify, cero proveedores nuevos.
  - Catálogo completo: **Cloudflare R2**, egress **gratis**, 10 GB y 10 M de lecturas por mes en el plan gratuito ([Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)). ⚠️ 3.000 artículos × 2 tamaños × ~50 KB ≈ 300 MB. Las fotos se suben ya redimensionadas en WebP y se sirven sin el optimizador de Next: no hay variantes, ni caché que se vacíe en cada deploy, ni egress de Supabase.
  - ⚠️ SUPUESTO a verificar: para producción R2 necesita un dominio propio conectado a Cloudflare (el `r2.dev` no está pensado para producción).

---

## FASE 3 — Tráfico y costos

### 3.1 Peso real de una visita (HECHO, medido hoy)

Build de producción, 390 px, 4G lenta, caché vacía, bajando hasta el final de la página:

| Ruta | Fuentes | Imágenes | JS | CSS | Otros (prefetch RSC) | HTML | **Total** |
|---|---|---|---|---|---|---|---|
| `/` | 114 KB | 58 | 211 | 8 | 57 | 23 | **471 KB** |
| `/tienda` | 114 | 88 | 211 | 8 | 60 | 17 | **498 KB** |
| `/tienda/cinta-raso-doble-faz` | 114 | 51 | 211 | 8 | 45 | 24 | **451 KB** |
| `/contacto` | 114 | 23 | 194 | 8 | 36 | 17 | **391 KB** |

Navegación siguiente, con caché: **77–100 KB por página**.

- ⚠️ **Sesión tipo** (3,9 páginas, el dato real de Dahila): 470 + 3 × 90 ≈ **0,75 MB** con la arquitectura corregida.
- ⚠️ **Sin la corrección y con 3.000 artículos**: cada página suma el catálogo en el HTML y en los prefetch → ≈ **5 MB por sesión**.
- ⚠️ **Bots**: con miles de fichas, Google, Bing, Meta y los crawlers de IA piden decenas de miles de páginas por mes. Calculo 30.000 requests y ~1 GB por mes corregido; **~10 GB** sin corregir (cada ficha arrastraría el catálogo).

### 3.2 Supuesto de conversión seguidores → visitas

- HECHO: Avíos tiene **47,7 mil seguidores** ([Instagram](https://www.instagram.com/merceria_avios_montevideo/), consultado el 13/10/2026). Las 671 publicaciones no las pude verificar (Instagram no las muestra sin sesión).
- HECHO (calibración): Dahila, con 4.114 seguidores, tuvo 677 sesiones desde redes y 1.340 en total en 28 días → **0,165 sesiones de Instagram por seguidor por mes**.
- HECHO (referencia de mercado): el engagement por alcance en Instagram cayó de 3,7% a 3,2% entre ene/2025 y ago/2026 ([Socialinsider](https://www.socialinsider.io/blog/instagram-reach-rate/)). Los toques en el enlace de una historia andan en 1–5% de quienes la ven, según guías comerciales sin metodología publicada ([Storrito](https://storrito.com/resources/why-your-link-sticker-is-not-getting-clicks-and-how-to-fix-it/), [influencerfee](https://influencerfee.com/blog/instagram-stories-sponsorship-pricing/)).
- ⚠️ Por qué **no** escalo Dahila en línea recta: Dahila era una marca nueva con lanzamientos y vos empujando el link; las cuentas grandes tienen menos interacción por seguidor; y Avíos sigue a 1.163 cuentas, así que parte de sus seguidores puede ser de seguimiento mutuo. Además, en [Threads](https://www.threads.com/@merceria_avios_montevideo/post/DSoHDkyjvu7/video-san-jose-montevideo-en-merceria-avios-encontras-todo-lo-que-necesitas-en-un) una publicación de dic/2025 tuvo 59 vistas y 2 me gusta (Threads no es Instagram, pero sugiere poca interacción fuera de IG).
- ⚠️ Canal que puede pesar más que Instagram: **quien atiende el WhatsApp mandando links** de `/mostrador` y de las fichas. No sé cuántas consultas reciben por día: es la pregunta más importante de la reunión.

| Escenario ⚠️ | Sesiones IG por seguidor/mes | Sesiones IG | + otros canales (Google, WhatsApp, directo) | **Sesiones/mes** | Pico de carnaval (dic–feb) |
|---|---|---|---|---|---|
| Conservador | 0,03 | ~1.400 | +30% | **~2.000** | ×1,5 → 3.000 |
| Medio | 0,08 | ~3.800 | +55% | **~6.000** | ×1,5 → 9.000 |
| Optimista | 0,165 (igual a Dahila) | ~7.900 | +90% (mezcla de Dahila) | **~15.000** | ×2 → 30.000 |

### 3.3 Ancho de banda, créditos de Netlify y egress de Supabase

Precios HECHO:
- **Netlify** ([pricing](https://www.netlify.com/pricing/), [docs de créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)): Free USD 0 / 300 créditos con tope duro; Personal USD 9 / 1.000 créditos con recarga (500 créditos por USD 5); Pro USD 20 / 3.000. Consumo: **20 créditos por GB**, 2 por cada 10.000 requests, 10 por GB-hora de cómputo, **15 por deploy de producción**. Créditos compartidos por todo el equipo; en Free, al agotarse, **se pausan todos los sitios del equipo** ([billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/)).
- **Supabase** ([pricing](https://supabase.com/pricing)): Free USD 0, base de 500 MB, 5 GB de egress + 5 GB de egress cacheado, 1 GB de Storage, se pausa tras 1 semana sin actividad, 2 proyectos gratis. Pro desde USD 25: 250 GB de egress. El egress se cuenta **por organización**, y el límite de 2 proyectos gratis cuenta en **todas** las organizaciones donde sos dueño o admin ([Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase)).

⚠️ Supuestos del cálculo: 0,75 MB y ~90 requests por sesión (corregido); bots 1 GB + 30.000 requests; 4 deploys de código por mes (los cambios de catálogo NO necesitan deploy: van por webhook); 10–20 créditos de cómputo por las regeneraciones.

| | Conservador 2.000 | Medio 6.000 | Optimista 15.000 | Optimista pico 30.000 |
|---|---|---|---|---|
| Ancho de banda | 2,5 GB | 5,5 GB | 12,3 GB | 23,5 GB |
| Créditos por GB | 50 | 110 | 245 | 470 |
| Créditos por requests | 42 | 114 | 276 | 546 |
| Deploys + cómputo | 70 | 75 | 80 | 90 |
| **Créditos/mes** | **~160** | **~300** | **~600** | **~1.100** |
| Plan Netlify | Free alcanza (53%) | Free **en el límite** → Personal | Personal | Personal + 1 recarga, o Pro |
| **Sin corregir la Fase 2 (3.000 artículos)** | ~20 GB → ~510 cr. → Personal | ~40 GB → ~1.000 cr. → Personal al tope | ~85 GB → ~2.050 cr. → **Pro** | ~160 GB → ~3.800 cr. → **Pro + recargas** |

- **Supabase, egress** ⚠️: una lectura completa de 3.000 artículos ≈ 3,7 MB (calculo sin compresión, para cubrirme). 40 cambios por mes + 4 builds + el panel paginado ≈ **0,2–0,5 GB/mes**, contra 5 GB del plan Free: **margen de 10×, en los tres escenarios**, porque el tráfico no toca la base. Base: ⚠️ ~10 MB, contra 500 MB.
- **El punto donde Supabase se rompe no es el tráfico, es servirle las fotos.** Si las fotos van a Supabase Storage, ⚠️ ~100 KB de fotos por sesión × 15.000 sesiones = 1,5 GB, más bots, más la re-descarga después de cada deploy: en el optimista te acercás a los 5 GB, que es exactamente la historia de Dahila. Por eso, R2.
- **Cuándo pasar a pago**:
  - Netlify → **Personal desde el día uno** si es un cliente que paga (por el tope duro y la pausa de todo el equipo, no por el volumen). Pro recién arriba de ~1.000 créditos sostenidos (⚠️ ~25.000 sesiones/mes).
  - Supabase → Pro (USD 25) cuando: (a) sumes un tercer cliente con base propia, (b) quieras que no se pause nunca y tener backups, o (c) Avíos sirva fotos desde Storage (no lo recomiendo).

### 3.4 Tu costo real

Dominio: HECHO, .uy a USD 9,85–10 + IVA por año vía revendedores locales ([HostingMontevideo](https://www.hostingmontevideo.com/dominios-uruguay/), [RegistraTu.UY](https://www.registratu.uy/)); .com.uy a USD 45 + IVA (HostingMontevideo). Un artículo de Neolo lo pone en "aproximadamente $ 3.000 UYU" ([Neolo, abr/2026](https://www.neolo.com/blog/?p=16825)). ⚠️ Tomo USD 15/año para .uy con IVA y USD 55 para .com.uy.

| USD | Conservador | Medio | Optimista |
|---|---|---|---|
| Netlify | 9 (Personal, recomendado) · 0 si te arriesgás con Free en equipo propio | 9 | 9 + recargas en el pico (⚠️ ~USD 15/año) |
| Supabase | 0 (Free, en organización propia) | 0 | 0 – 25 (Pro si es el 3.er proyecto o no querés pausas) |
| Cloudflare R2 | 0 | 0 | 0 |
| Dominio .uy | 1,25/mes | 1,25 | 1,25 |
| **Mensual** | **~USD 10** (UYU ~420) | **~USD 10** | **USD 12 – 37** (UYU 470 – 1.470) |
| **Anual** | **~USD 125** (UYU ~5.000) | **~USD 125** | **USD 140 – 440** (UYU 5.600 – 17.600) |

- ⚠️ No incluí impuestos sobre servicios digitales del exterior: no lo verifiqué para tu caso (SIAR). Consultalo con tu contador.
- **El costo que de verdad pesa es tu tiempo**, no la infraestructura: ⚠️ 2–4 h/mes de soporte. A USD 20/h (ver Fase 5) son USD 40–80/mes, entre 4 y 8 veces la infraestructura.

### 3.5 Lo que encontré en internet sobre Avíos y su mercado

- HECHO: [Guía Comercial](https://guiacomercial.uy/ficha/merceria-avios-montevideo-montevideo/) (actualizada el 29/07/2026): **3,7/5 con 65 reseñas de Google Maps**; elogian la variedad y la atención; las quejas son por **entregar el artículo equivocado** (agujas de otro tipo, anillos de otra medida) cuando el local está lleno. Horario lun–vie 9–18:30, sáb 9–13:30. Fijo 2902 8106. Acepta tarjetas y NFC en el local.
- HECHO: bio de Instagram: "Ventas por mayor y menor · Envíos a todo el país". En Threads e Instagram empujan **insumos de carnaval** (pedrería, strass, galones, flecos) y se ubican "frente a la Casa de las Telas".
- HECHO: [Facebook](https://www.facebook.com/p/Merceria-Avios-Montevideo-100063768601386/) existe; no tiene sitio web propio. No encontré ventas declaradas, facturación ni prensa sobre Avíos: **no hay dato público de sus ventas**.
- HECHO, mercado: en Uruguay compra online el **70% de la población** (1.890.000 personas) según *Consumo Digital 2026*; el e-commerce superó los **$ 100.000 millones en 2025 (+32%)** y creció 35% interanual en el primer trimestre de 2026 (CEDU/Exante, vía [Ámbito](https://www.ambito.com/uruguay/el-comercio-electronico-supero-los-100000-millones-ventas-2025-y-crecio-32-el-ano-n6306222) y [Montevideo Portal](https://www.montevideo.com.uy/Noticias/El-comercio-electronico-crece-35-en-Uruguay-y-supera-los-US-800-millones-uc960929)).
- HECHO: no encontré una mercería mayorista de Montevideo con catálogo y precios publicados (búsqueda abierta, sin resultados). ⚠️ No es prueba de que no exista: es que no aparece en Google.
- ⚠️ Lectura: el problema de las reseñas ("me dieron otra medida") es justamente lo que resuelven `/mostrador` y el pedido escrito con la medida exacta. Sirve como argumento, **pero sin citarle las reseñas malas en la cara**.

---

## FASE 4 — Mejoras

### 4.1 Ya aplicadas (commits chicos, verificados)

Verificación: `npm run verify` (typecheck → lint → test → build) en verde y `npm run audit` en verde salvo el LCP de `/tienda`, que ya estaba en rojo antes (2.956 ms → 2.988 ms; lo resuelve el ítem A). Miré en pantalla `/` y `/tienda` a 390 px.

| Commit | Qué | Horas |
|---|---|---|
| `a9f07c1` | Estado original (la carpeta no era un repo git: lo inicialicé para poder separar cada cambio) | — |
| `6acc532` | 10% "Lanzamiento" apagado: no salía del catálogo en papel | 0,2 |
| `946489a` | Ficha: fuera el "ni mínimo de compra" no confirmado | 0,1 |
| `fcef3a2` | Un error de Supabase ya no queda guardado en la caché sin vencimiento | 0,5 |
| `7c66d43` | Imágenes: WebP solo, 6 anchos (de 30 versiones por foto a 6) | 0,3 |
| `6d0c252` | Inicio: baldosas sin texto encimado + "desde $ 13" sin cortarse | 0,7 |
| `cf737e9` | Catálogo: chips de categoría en una fila deslizable en el teléfono | 0,5 |

### 4.2 Propuestas, por prioridad — **esperan tu OK** (son cambios grandes)

| Prio | Mejora | Por qué | Esfuerzo ⚠️ |
|---|---|---|---|
| **A** | **Catálogo liviano en el navegador.** El layout manda sólo categorías + textos. La grilla de `/tienda` y de cada categoría se pinta en el servidor (las primeras 24, con HTML real). El buscador del header, los filtros y `/mostrador` usan un **índice compacto** (`slug, nombre, código, categoría, precio desde, ¿por mayor?, foto chica`) servido como archivo estático con caché larga, que se baja recién al tocar el buscador o entrar a `/tienda`. La ficha recibe sólo su producto. El panel conserva el catálogo completo sólo dentro de `/panel`. | Sin esto no se pueden cargar miles de artículos (2.1 #1–#4). Arregla además el LCP de `/tienda`. | 12–16 h |
| **B** | Fichas a demanda: pre-generar sólo las ~200 más vistas y el resto en la primera visita (ISR). `lastModified` real en el sitemap. | El build no puede generar 3.000 fichas en cada deploy. | 2–3 h |
| **C** | Categorías paginadas y rastreables (`/tienda/cintas?pagina=2`, chips como enlaces de verdad). | Google tiene que poder llegar a las 3.000 fichas sin JavaScript. | 3–4 h |
| **D** | `/lista-de-precios` por categoría (con "imprimir todo" aparte). | Una página con miles de filas no sirve ni para imprimir. | 2 h |
| **E** | **Login real** (Supabase Auth + `is_admin()` + signups apagados). | `admin/admin` no puede llegar a producción (lo dice `ESPECIFICACION.md`, R-5). Bloqueante. | 6–8 h |
| **F** | Conectar Supabase: esquema, script de snapshot real, webhook, cron diario (keep-alive), prueba de caída. | Lo que Dahila aprendió, desde el día uno. | 6–8 h |
| **G** | Fotos: subida redimensionada a WebP (2 tamaños) a R2; `public/` en el piloto. | Fuera de Supabase, sin variantes. | 4–6 h |
| **H** | Node 20 → 22 en `netlify.toml` y Next 16.2.6 → último parche 16.x. | Node 20 ya no tiene soporte. | 1 h |
| **I** | Fuentes: menos pesos de Fraunces/Inter o sistema para el cuerpo. | −50 a −70 KB en la primera visita (~12%). | 1–2 h |
| **J** | Menos prefetch automático en listados largos. | Baja requests y créditos de Netlify. | 1–2 h |

- **Total para producción con miles de artículos**: ⚠️ **38–52 h** (A–J). **Para el piloto alcanzan A, E, H y una parte de F**: ⚠️ ~22–28 h.
- **No lo apliqué**: cambia la arquitectura de datos de la tienda y del panel. Si me das el OK, lo hago en commits chicos, empezando por A.
- **Para la reunión, la demo actual sirve tal cual**: con 20 artículos el problema no se ve, y los arreglos visuales ya están.

---

## FASE 5 — Precio

### 5.1 Referencias de mercado (con fuente)

| Qué | Precio | Fuente |
|---|---|---|
| Diseño web profesional (freelance) | desde UYU 19.000 | [Neolo, abr/2026](https://www.neolo.com/blog/?p=16825) |
| Tienda online en Uruguay | USD 900 – 4.000+ | [Nibiru, feb/2026](https://nibiru.com.uy/cuanto-cuesta-una-pagina-web-en-uruguay-en-2026-precios-reales-y-que-incluyen) |
| Puesta en marcha en Tiendanube / Shopify / WooCommerce / a medida (Next.js) | USD 80–250 / 160–400 / 320–1.000 / **1.200–4.000** | [Neowyze, mar/2026](https://neowyze.tech/blog/cuanto-cuesta-un-ecommerce-en-uruguay) |
| Mantenimiento mensual | UYU 2.000 – 8.000 (USD 50–200) | Neowyze |
| E-commerce de estudio en Montevideo | desde USD 1.000 | [Lombriz Creativa](https://www.lombrizcreativa.com/diseno-tiendas-online/) (sin fecha visible) |
| Tienda online "pago anual" | UYU 18.000 + IVA | Ekweb (vía búsqueda; no pude abrir la página) |
| Shopify | Basic USD 25/mes (USD 19 pagando anual) + 2% si no usás Shopify Payments | [Shopify](https://www.shopify.com/pricing) |
| Tiendli (uruguaya) | Gratis hasta 50 productos; Básico UYU 495/mes; 1% si cobra online | [Tiendli](https://tiendli.com/) (vía búsqueda; la página dio 404 al abrirla) |
| Tiendanube en Uruguay | **No verificado**: precios oficiales en pesos argentinos y fuentes contradictorias sobre si opera en Uruguay | [comparativa firox.uy](https://firox.uy/blog/shopify-vs-tiendanube-cual-conviene-en-uruguay) |
| Hora de desarrollador freelance | USD 25–45 | Coderhouse (fuente comercial, poco sólida) |
| **Carga de productos por unidad** | **No encontré una referencia confiable.** `VENTA.md` dice "USD 10–15 por artículo": no lo pude verificar, no lo uses. | — |
| Catálogo de WhatsApp Business | tope de 500 productos | guías de terceros ([respond.io](https://respond.io/blog/whatsapp-catalog-whatsapp-shopping-catalog)); no encontré la doc oficial de Meta |

### 5.2 Cómo armé los números

- ⚠️ **Tu costo hora: USD 20.** Es apenas debajo del piso de la referencia (25–45) porque sos una persona sola sin estructura de agencia. Si tu número es otro, cambian los márgenes, no la estructura.
- ⚠️ **Puesta en marcha**: 36–46 h de trabajo que falta (Fase 4: A, B, C, D, E, F, H, más deploy, dominio y capacitación) → **costo USD 720–920**. Los márgenes de abajo usan 36 h; si se va a 46 h, el margen del objetivo baja de 49% a 34%. La demo ya hecha no la cuento como costo: está hundida y es tu ventaja.
- ⚠️ **Carga**: 1,5 min por artículo (con hasta ~10 variantes) **si el PDF tiene texto seleccionable** y se extrae con script + revisión humana → USD 0,50 por artículo. Si el PDF es escaneado (imagen + OCR + revisión): 3–5 min → USD 1–1,70. **Este número es el que tiene que salir del piloto.**
- Margen = (precio − horas × USD 20 − infraestructura) ÷ precio.
- Unidad de carga = **artículo** (ej.: "Cinta de raso doble faz" con 7 anchos y 2 presentaciones = 1 artículo). Evita la discusión de "¿una cinta en 7 anchos son 7 productos?".

### 5.3 Los tres paquetes

#### PISO — "Catálogo"

| | USD | UYU | Tu margen ⚠️ |
|---|---|---|---|
| Puesta en marcha | 900 | 36.000 | 20% |
| Carga | 150 artículos incluidos; resto **USD 0,70** por artículo (UYU 28) | | 29% (PDF con texto) |
| Mensual | **40** | 1.600 | 48% (infra 11 + 0,5 h) |
| Ejemplo 1.000 artículos | 900 + 595 = **1.495** + 40/mes | 59.800 + 1.600/mes | |

- **Incluye**: sitio público con buscador, filtros, carrito a WhatsApp y lista de precios; panel con login real; carga del catálogo desde el PDF; dominio .uy el primer año; 30 min de capacitación; hosting, base y dominio dentro de la cuota.
- **No incluye**: cambios cargados por vos (los hace ella en el panel o por planilla; los tuyos se cobran por hora); fotos (se usan las que haya); conexión con Google/Meta; `/mostrador`; ajustes de diseño posteriores.
- Es el **mínimo**: debajo de esto trabajás por debajo de tu costo hora.

#### OBJETIVO — "Catálogo + mostrador" ← el que proponés

| | USD | UYU | Tu margen ⚠️ |
|---|---|---|---|
| Puesta en marcha | **1.400** | 56.000 | 49% |
| Carga | 300 incluidos · 301–1.000: **USD 0,90** · 1.001–3.000: **USD 0,70** · 3.001+: **USD 0,55** | 36 / 28 / 22 por artículo | 44% / 29% / 9% (a 1,5 min); el último tramo sólo rinde si el script baja a ~1 min (39%) |
| Mensual | **75** | 3.000 | 32% (infra 11 + 2 h) |
| Ejemplo 1.000 artículos | 1.400 + 630 = **2.030** + 75/mes | 81.200 + 3.000/mes | 40% del proyecto |
| Ejemplo 3.000 artículos | 1.400 + 630 + 1.400 = **3.430** + 75/mes | 137.200 + 3.000/mes | 35% del proyecto |

- **Incluye** todo lo del piso, más: `/mostrador` para quien atiende; feed para el catálogo de WhatsApp/Instagram y Google; ficha de Google conectada; hasta **50 altas o cambios de artículos por mes cargados por vos**; soporte por WhatsApp en horario hábil; 1 h de capacitación para ella y quien atiende; respaldo mensual de la planilla.
- **No incluye**: fotografía; más de 50 cambios por mes (USD 0,90 por artículo extra); pago online; campañas pagas; redacción de descripciones largas.

#### TECHO — "Llave en mano"

| | USD | UYU | Tu margen ⚠️ |
|---|---|---|---|
| Puesta en marcha | **2.000** | 80.000 | 54% (incluye ~10 h extra) |
| Carga | 500 incluidos · 501–1.000: **USD 1,20** · 1.001–3.000: **USD 0,95** · 3.001+: **USD 0,80** | 48 / 38 / 32 | 44% / 30% / 16% (a 2 min por artículo, con recorte y fondo de fotos existentes) |
| Mensual | **150** | 6.000 | 29% (infra 36 con Supabase Pro + 3,5 h) |
| Ejemplo 3.000 artículos | 2.000 + 600 + 1.900 = **4.500** + 150/mes | 180.000 + 6.000/mes | 35% |

- **Incluye** todo lo del objetivo, más: edición de las fotos que ya tienen (recorte y fondo parejo); hasta 150 cambios por mes; Supabase Pro (sin pausas y con backups); informe mensual de "lo que buscaron y no encontraron"; textos para Instagram armados desde el panel cada semana; 2 capacitaciones.
- **No incluye**: sesión de fotos nueva; pago online; publicidad paga; atención del WhatsApp.

### 5.4 Reglas de cobro

- Puesta en marcha en 3 partes: **40% al empezar, 40% publicado con el catálogo cargado, 20% al mes de uso** (ya está en `VENTA.md` y lo sostengo).
- Carga: se factura por tramo terminado y contado en el panel. Si el PDF resulta escaneado, los precios de carga se recalculan **antes** de empezar el tramo 2, con el número del piloto.
- Primer mes de cuota sin cargo. 3 meses de permanencia mínima después.
- **Si hay que bajar, se baja alcance, nunca el número**: sin `/mostrador` → piso; o una sola categoría primero.
- ⚠️ Honestidad: un catálogo de 3.000 artículos en el objetivo suma **~USD 3.400**, en el techo de lo que el mercado cobra por una tienda a medida (USD 1.200–4.000). La diferencia que lo justifica es que **la carga está incluida**: en Shopify o Tiendli igual alguien tiene que cargar 3.000 artículos. Si a ella le parece mucho, el camino es que su equipo cargue por planilla y vos cobres sólo importación y control: ⚠️ USD 0,20 por artículo.

---

## FASE 6 — Cómo venderlo

### (a) Guion de 15 minutos (demo en 5)

**Antes**: tu novia te presenta en una frase ("es Mati, tiene una empresa de tecnología y te hizo algo, quería mostrártelo"). Después se corre y no vende ella. Teléfono con el sitio abierto en `/tienda` y la notebook con el panel. Wi-fi probado.

| Min | Qué | Qué decís / hacés |
|---|---|---|
| 0–1 | Romper el hielo | *"Te robo 15 minutos. Te traigo algo ya hecho con tus productos y tus precios. Si no te sirve, me lo decís y quedamos bien."* |
| 1–3 | **Descubrimiento corto** (preguntas 1–4 de abajo) | Escuchás. Anotás números. **No mostrás nada todavía.** |
| 3–8 | **Demo (5 min)** | **1 min** — En el teléfono: buscador, escribís "15 mm" o "gross". *"Esto es lo que hoy busca una clienta a las 11 de la noche en un PDF de 790 páginas."* **1,5 min** — `/tienda/cinta-raso-doble-faz`, 4 mm, cantidad 45 → aparece el aviso de la pieza. *"Venía a gastar $ 585, se lleva la pieza a $ 396 y el doble de metros."* **1 min** — Agregar → carrito → vista previa del WhatsApp. *"Esto te llega a vos, con medida, presentación y total. Sin seis mensajes antes."* **1 min** — `/mostrador`: buscar por código. *"Esto es para quien atiende: busca, copia y pega en el chat."* **0,5 min** — `/panel/precios` → Cintas +8% → vista previa. *"Un aumento de todo el catálogo en veinte segundos."* |
| 8–11 | **Descubrimiento profundo** (preguntas 5–12) | Ahora sí, porque ya vio de qué se trata. |
| 11–13 | Propuesta en una frase + piloto | *"Lo que te propongo es arrancar con lo de carnaval, unos 200 artículos, y ver en tres semanas cuánto se usa. Si sirve, seguimos con el resto."* **No digas el precio del proyecto entero acá** salvo que te lo pida: decí el del piloto. |
| 13–15 | Cierre y próximo paso concreto | *"Te mando la propuesta por WhatsApp el [día, 48 h]. ¿Me pasás el PDF y cuál es el número bueno para los pedidos?"* |

- Lo que **no** se dice: Next.js, Supabase, Netlify, "algoritmo", "vas a vender más", promesas de Google. Nada técnico (está bien explicado en `VENTA.md` §6).
- Lo que **sí** se dice aunque no convenga: la demo guarda en el navegador; el login es de mentira; sin que alguien cargue lo nuevo, en seis meses está viejo.

### (b) Preguntas de descubrimiento (en la reunión)

1. *"¿Cuántas veces por día te preguntan un precio por WhatsApp o por Instagram?"* → volumen de consultas (lo que el sitio ahorra).
2. *"¿Cómo te llegan los pedidos hoy? ¿WhatsApp, Instagram, teléfono, en el local?"*
3. *"¿Quién contesta los mensajes? ¿Vos, o alguien más?"* → quién usaría `/mostrador`.
4. *"Cuando alguien te pide el catálogo, ¿le mandás el PDF entero?"*
5. *"¿Cuántos artículos tenés más o menos? ¿El PDF está completo o hay cosas que no están?"* → **dato clave para la carga**.
6. *"¿El PDF lo armaste vos? ¿En qué programa? ¿Tenés el archivo original, una planilla, o sólo el PDF?"* → **define si la carga es 1,5 min o 5 min por artículo**.
7. *"¿Cada cuánto cambian los precios? ¿Suben todo junto o de a poco?"*
8. *"¿Cuántos artículos nuevos entran por mes? ¿Y cuántos dejás de traer?"*
9. *"¿Quién cargaría lo nuevo: vos, alguien del local, o preferís que lo haga yo?"*
10. *"¿Tenés un mínimo de compra para el precio por mayor?"*
11. *"¿Cuál es el número bueno para pedidos? Vi el 098, el 092 y el fijo 2902."*
12. *"¿Para envíos y pagos a distancia, cómo trabajan? ¿Aceptan tarjeta o Mercado Pago a distancia?"*
13. *"¿Qué parte del año es la más fuerte? ¿Carnaval?"* → calendario del piloto.
14. *"¿Tenés fotos de los artículos o las sacás para Instagram cada vez?"*

### (c) Objeciones

- **"Ya vendemos por Instagram."**
  - *"Y está buenísimo, 47 mil personas te siguen. Esto no reemplaza Instagram: lo que hace es que cuando alguien te pregunta '¿tenés cinta de 15 mm y cuánto sale?', le mandes un link con la respuesta en vez de escribirla de nuevo. Instagram trae a la gente; esto le contesta."*
  - Después, el dato: el catálogo de WhatsApp Business tiene un tope de 500 productos, y vos tenés bastante más.
- **"Es caro."**
  - *"¿Comparado con qué?"* Y callate.
  - Si lo compara con Tiendli o Shopify: *"Esas plataformas te cobran la cuota y la carga es tuya. Con [N] artículos, cargarlos es la parte cara en cualquier lado. Acá está incluida."*
  - Si sigue: bajás **alcance** (piloto de una categoría, o paquete piso), nunca el número.
- **"Lo tengo que pensar."**
  - *"Obvio. Para que lo pienses con algo concreto: te mando la propuesta el [día]. ¿Te parece que te llame el [día + 2] para ver qué te pareció?"*
  - Si hay duda de fondo: *"¿Qué es lo que más te hace dudar: la plata, el tiempo que te va a llevar, o si se va a usar?"* La respuesta te dice qué parte del piloto ajustar.
- **Otras** (de `VENTA.md`, siguen sirviendo): "mi sobrino me lo hace", "no sé usar la compu", "¿y si no te encuentro más?" (→ planilla descargable y cuentas a nombre de ella).

### (d) Mensaje de WhatsApp para después (propuesta en 48 h)

Para mandar **el mismo día** de la reunión:

> Hola Alejandra, gracias por el rato de hoy. Me quedé con lo que me contaste de [dato que dijo ella, ej.: "las consultas de precio de noche"].
> Como quedamos, el [día] te mando la propuesta con el piloto de carnaval. Si me podés pasar el PDF del catálogo (o el archivo original, si lo tenés), lo uso para calcular bien los tiempos.
> Un abrazo, Mati — SIAR

Para mandar **a las 48 h** con la propuesta:

> Hola Alejandra, te paso la propuesta: [link]
> En corto:
> • Arrancamos con un piloto de [N] artículos de carnaval, publicado en [dominio] antes del [fecha].
> • Precio del piloto: $ [monto] (USD [monto]). Si seguimos con el catálogo completo, ese monto se descuenta.
> • En 3 semanas medimos cuánto se usa y cuánto lleva cargar cada artículo, y con eso cerramos el precio del resto.
> El [día] te llamo para ver qué te pareció. Cualquier cosa, escribime antes.
> Mati — SIAR

### (e) El piloto: 100–300 artículos

- **Qué**: las categorías de **carnaval** (pedrería, strass, galones, flecos, lentejuelas, según lo que ella tenga) + las cintas que ya están en la demo. ⚠️ 150–300 artículos.
- **Por qué esas**: es lo que Avíos ya promociona, tiene fecha (el carnaval arranca a fines de enero) y tiene comprador mayorista (comparsas y talleres), que es el que más le sirve el precio por mayor publicado.
- **Plazo**: 3 semanas. Publicado **antes del 15/12/2026** para agarrar la preparación de trajes.
- **Precio**: **USD 300 (UYU 12.000)**, que se descuenta al 100% de la puesta en marcha si sigue. Primer mes de cuota gratis.
  - ⚠️ Tu costo: ~22–28 h de la Fase 4 (que igual tenés que hacer) + 300 × 1,5 min ≈ 7,5 h → **perdés plata en el piloto** si no sigue (USD 300 contra ~USD 600 de horas). Es a propósito: es el precio de sacarle el riesgo. Si no lo aceptás, piloto a USD 500.
- **Qué se mide** (y se le muestra al final):
  1. Minutos por artículo cargado (**define el precio de la carga**).
  2. % de artículos con algún dato faltante (precio, medida de la pieza).
  3. Visitas al sitio y a `/mostrador` por semana.
  4. Cuántos links del sitio mandó quien atiende por WhatsApp (pregunta directa, no hay forma de medirlo solo).
  5. Pedidos que llegaron por el botón del carrito (el mensaje sale con formato propio: se cuentan).
- **Criterio de éxito** (acordado antes): ⚠️ por ejemplo, que quien atiende lo use todos los días y que lleguen al menos 10 pedidos armados por el carrito en las 3 semanas. Si no se cumple, se corta sin cargo de cuota y ella se queda con el sitio del piloto.
- **Infraestructura del piloto**: catálogo con Supabase Free en organización propia, fotos en `public/`, Netlify en equipo propio (Personal), dominio a nombre de ella.

---

## Riesgos

| # | Riesgo | Impacto | Qué hacer |
|---|---|---|---|
| 1 | **El PDF es escaneado** (imagen, no texto) | La carga pasa de ~1,5 a 3–5 min por artículo: se triplica el costo | Pedir el PDF **antes** de mandar la propuesta. El piloto fija el número real |
| 2 | **Teléfono equivocado** (hay tres en circulación) | Los pedidos van a un número que nadie mira | Confirmar en la reunión. Primera pregunta de la lista de cierre |
| 3 | **Netlify Free compartido con Dahila** | Un pico de Avíos pausa Dahila (y al revés) | Equipo propio para Avíos + plan Personal |
| 4 | **Supabase: 2 proyectos gratis en total** | El tercer cliente no entra gratis; si ponés Avíos en la org de Dahila, comparten los 5 GB | Organización propia para Avíos; ⚠️ evaluar que la cuenta sea de ella (verificar si tu rol en esa org cuenta para tu límite) |
| 5 | Supabase Free se pausa tras 1 semana sin actividad | El panel deja de andar; el sitio público sigue (y ahora ya no se queda pegado en el respaldo) | Cron diario de GitHub Actions como en Dahila |
| 6 | **Se publica sin el cambio A** | Sitio lento en el teléfono y builds que no terminan con el catálogo real | A es requisito para pasar de ~300 artículos |
| 7 | `admin/admin` llega a producción | Cualquiera cambia precios | E es bloqueante (ya lo dice `ESPECIFICACION.md`) |
| 8 | Nadie carga lo nuevo | En 6 meses el sitio está tan viejo como el PDF | Cuota con cambios incluidos + decirlo de frente |
| 9 | Reseñas 3,7/5 por errores de medida | Si el sitio publica una medida mal, multiplica el error | Regla del repo: lo que falta queda `null` y en `needsReview`, nunca se completa |
| 10 | Datos sin confirmar en el sitio | Pagos ("efectivo y transferencia" vs. tarjetas y NFC en el local), envíos "por agencia", "sin registro" | Confirmar en la reunión antes de publicar |
| 11 | Presentarlo a través de tu novia | Si sale mal, mezcla lo personal con lo comercial | Que ella presente y se corra. Propuesta y seguimiento, tuyos |
| 12 | Tus horas reales | Los márgenes de la Fase 5 asumen USD 20/h y 1,5 min por artículo | Llevá registro de horas del piloto |
| 13 | Dahila y Avíos con Node 20 | Sin parches de seguridad desde abr/2026 | Ítem H, en los dos |

## Lo que te falta averiguar en la reunión

1. **Cantidad real de artículos** y si el PDF está completo. (El PDF tiene unas 790 páginas según vos; `AGENTS.md` dice ~720. Confirmar.)
2. **Formato del catálogo**: ¿PDF con texto, escaneado, o existe una planilla o archivo original?
3. **Número de WhatsApp correcto** para pedidos.
4. **Cuántas consultas de precio reciben por día** y quién las contesta.
5. **Frecuencia de cambios**: aumentos y artículos nuevos por mes.
6. **Quién cargaría lo nuevo** del lado de ellos.
7. **Mínimo de compra por mayor**, medios de pago a distancia y forma de envío.
8. **Fotos**: ¿hay de todos los artículos? ¿de quién son?
9. **Temporada fuerte** y fechas de carnaval para ellos.
10. **Quién decide y quién paga**: Alejandra sola, o hay socio o familia.
11. **Presupuesto o referencia**: si alguna vez pidieron precio por un sitio, y cuánto les dijeron.
12. **Ficha de Google Maps**: ¿la administran? (65 reseñas, 3,7/5.)
13. **Dominio**: ¿tienen alguno? ¿a nombre de quién?
