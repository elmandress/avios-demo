// Acceso al catálogo — un solo punto de entrada para todo el sitio.
//
// El clon heredado servía el catálogo local SOLO como plan B ante una caída de
// Supabase: cada página pegaba primero contra la base, esperaba el error, y
// recién ahí caía al archivo. Eso arrastraba tres problemas para una demo sin
// base: el sitio se anunciaba en "modo lectura", todo lo que no pasaba por acá
// (settings, carrito, favoritos, búsqueda) quedaba muerto, y dependía de que
// alguien levantara un servidor falso para que las páginas no tardaran 15 s.
//
// Acá el modo se elige explícitamente por entorno:
//
//   demo      → se sirve `DEMO_CATALOG`, sin red. Es el modo de la demo de venta.
//   live      → Supabase, con el catálogo local como fallback ante error de base
//               (la resiliencia original, intacta, para cuando exista el proyecto).
//
// El resultado siempre trae `source`, así la UI sabe si tiene que avisar algo.

import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { DEMO_CATALOG } from './data'
import { assertCatalogIntegrity } from './integrity'
import { escalar } from './escala'
import type { Catalog, CatalogSource, Category, Product } from './types'

export * from './types'
export * from './pricing'

/**
 * `NEXT_PUBLIC_DEMO_MODE=1` fuerza el catálogo local. Se lee por `NEXT_PUBLIC_`
 * para que cliente y servidor coincidan: si el servidor pinta precios del
 * archivo y el cliente cree que hay base, el carrito se hidrata distinto.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

// Se valida una sola vez, al cargar el módulo. En desarrollo tira; en producción
// avisa por consola y sigue (ver integrity.ts).
assertCatalogIntegrity(DEMO_CATALOG)

export interface CatalogResult extends Catalog {
  source: CatalogSource
}

// Prueba de escala (ver escala.ts): sólo en el servidor y sólo en modo demo.
const CATALOGO_LOCAL = escalar(DEMO_CATALOG, Number(process.env.AVIOS_ESCALA ?? 0))

function localCatalog(source: CatalogSource): CatalogResult {
  return { ...CATALOGO_LOCAL, source }
}

/** Filas de Supabase → dominio. Solo se usa en modo `live`. */
interface ProductRow {
  id: string
  slug: string
  name: string
  description: string | null
  status: Product['status']
  badge: string | null
  sku: string | null
  material: string | null
  sort_order: number
  created_at: string
  discount_percent: number | null
  discount_active: boolean | null
  category: { slug: string } | null
  media: Array<{ url: string; alt: string | null; position: number }> | null
  variants: Array<{
    id: string
    label: string
    axis: Product['variants'][number]['axis']
    available: boolean
    sort_order: number
    formats: Array<{
      id: string
      tier: 'menor' | 'mayor'
      label: string
      unit: 'm' | 'yd' | 'u'
      content_qty: number | null
      price_uyu: number | null
      unit_price_uyu: number
      available: boolean
      min_qty: number
      sort_order: number
    }> | null
  }> | null
  colors: Array<{ color: { id: string; name: string; hex: string } | null }> | null
}

const PRODUCT_SELECT = `
  *,
  category:categories(slug),
  media:product_media(url, alt, position),
  variants:product_variants(*, formats:product_formats(*)),
  colors:product_colors(color:colors(*))
`

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categorySlug: row.category?.slug ?? '',
    status: row.status,
    badge: row.badge,
    sku: row.sku,
    material: row.material,
    media: [...(row.media ?? [])].sort((a, b) => a.position - b.position),
    variants: [...(row.variants ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        label: v.label,
        axis: v.axis,
        available: v.available,
        formats: [...(v.formats ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((f) => ({
            id: f.id,
            tier: f.tier,
            label: f.label,
            unit: f.unit,
            contentQty: f.content_qty,
            priceUyu: f.price_uyu,
            unitPriceUyu: f.unit_price_uyu,
            available: f.available,
            minQty: f.min_qty,
          })),
      })),
    colors: (row.colors ?? []).map((c) => c.color).filter((c): c is NonNullable<typeof c> => !!c),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    discountPercent: row.discount_percent ?? 0,
    discountActive: row.discount_active ?? false,
    needsReview: [],
  }
}

/**
 * El catálogo completo. En modo demo no hace ni una request; en modo live pega
 * a Supabase y cae al catálogo local si la base contesta error (cuota agotada,
 * caída, migración a medias).
 */
/**
 * La etiqueta con la que se invalida el catálogo entero.
 *
 * Un webhook de Supabase (Database Webhooks → cualquier cambio en products,
 * categories, discounts o site_settings) pega a /api/revalidar y esto se marca
 * como vencido. Recién ahí se vuelve a leer la base.
 */
export const CATALOGO_TAG = 'catalogo'

/**
 * Lectura cruda del catálogo desde Supabase. NO se llama directo: se llama a
 * través de `getCatalog`, que la envuelve en caché.
 *
 * Crea su propio cliente en vez de recibirlo: `unstable_cache` serializa los
 * argumentos para armar la clave, y un cliente de Supabase no es serializable.
 */
async function leerDeSupabase(): Promise<CatalogResult> {
  const { createClient } = await import('@/lib/supabase/public')
  const supabase = createClient()
  if (!supabase) return localCatalog('demo')

  try {
    const [categoriesRes, productsRes, colorsRes, discountsRes, settingsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .in('status', ['active', 'soldout'])
        .order('sort_order', { ascending: true }),
      supabase.from('colors').select('*').order('sort_order', { ascending: true }),
      supabase.from('discounts').select('*').eq('active', true),
      supabase.from('site_settings').select('key, value'),
    ])

    // Si falla lo que sostiene la tienda, se LANZA en vez de devolver el
    // catálogo local acá adentro. Lo que devuelve esta función queda en la
    // caché, y la caché no vence por tiempo (revalidate: false): una caída de
    // cinco minutos —el proyecto pausado por inactividad, la cuota agotada—
    // dejaba el respaldo servido hasta el próximo webhook, que podía tardar
    // días. Lo que lanza no se cachea, así que la próxima regeneración vuelve a
    // intentar. Es la misma regla que Dahila aprendió en producción.
    if (productsRes.error || categoriesRes.error) {
      throw new Error('catálogo: la consulta principal devolvió error')
    }

    const settings = ((settingsRes.data ?? []) as Array<{ key: string; value: string }>).reduce<
      Record<string, string>
    >((acc, r) => ({ ...acc, [r.key]: String(r.value ?? '') }), {})

    return {
      generatedAt: new Date().toISOString(),
      categories: (categoriesRes.data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sort_order,
      })) as Category[],
      products: ((productsRes.data ?? []) as unknown as ProductRow[]).map(mapProduct),
      colors: (colorsRes.data ?? []) as Catalog['colors'],
      discounts: (discountsRes.data ?? []).map((d) => ({
        id: d.id,
        label: d.label,
        scope: d.scope,
        categorySlug: d.category_slug ?? null,
        percent: d.percent,
        active: d.active,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
      })),
      // Los valores del archivo son el piso: si la dueña todavía no cargó una
      // clave, la página sale con el texto por defecto en vez de vacía.
      settings: { ...DEMO_CATALOG.settings, ...settings },
      source: 'live',
    }
  } catch (e) {
    unstable_rethrow(e) // no tragar el bailout dinámico ni notFound de Next
    throw e // ver arriba: un error no puede quedar guardado en la caché
  }
}

/**
 * El catálogo, cacheado y compartido por TODAS las rutas.
 *
 * Por qué existe esta capa, que es la diferencia entre una cuenta gratuita de
 * Supabase y una factura:
 *
 * Sin ella, cada página que llama a `getCatalog()` dispara sus cinco queries.
 * El sitio tiene más de veinte rutas estáticas más una por producto, todas con
 * revalidación horaria: eso son miles de lecturas del catálogo COMPLETO por mes,
 * multiplicadas por el peso del catálogo. Con miles de artículos son decenas de
 * GB de egress al mes — el plan gratuito son 5 GB.
 *
 * Con la caché, todas las rutas de una misma regeneración comparten UNA lectura,
 * y el egress de Supabase deja de depender del tráfico: depende de cuántas veces
 * cambian los datos, que en una mercería son unas pocas por semana.
 *
 * `revalidate: false` es deliberado: no vence por tiempo. Se invalida cuando
 * los datos cambian de verdad, por el webhook. Un catálogo que se vuelve a leer
 * cada hora "por las dudas" es la forma más cara de no enterarse de nada.
 */
const getCatalogCacheado = unstable_cache(leerDeSupabase, ['catalogo-avios'], {
  tags: [CATALOGO_TAG],
  revalidate: false,
})

/**
 * El catálogo completo. En modo demo no hace ni una request; en modo live lee
 * de la caché compartida y sólo toca Supabase cuando está vencida.
 *
 * El parámetro `supabase` se mantiene por compatibilidad con los llamadores
 * existentes, pero ya no se usa para leer: la lectura arma su propio cliente
 * adentro de la caché. Pasarlo o no da lo mismo.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCatalog(_supabase?: SupabaseClient): Promise<CatalogResult> {
  if (DEMO_MODE) return localCatalog('demo')
  try {
    return await getCatalogCacheado()
  } catch (e) {
    unstable_rethrow(e)
    // Se sirve el catálogo local ENTERO —nunca un mix a medias, que confundiría
    // más que una caída limpia— y la próxima visita vuelve a probar la base.
    return localCatalog('snapshot')
  }
}

/**
 * Textos y datos de contacto del sitio. Antes cada página hacía su propia query
 * a `site_settings` y, cuando fallaba, caía a un literal hardcodeado — que en
 * este clon todavía era el teléfono de Dahila. Ahora hay un solo lugar del que
 * salen, y su fallback es el archivo de Avíos.
 */
export async function getSettings(supabase?: SupabaseClient): Promise<Record<string, string>> {
  const { settings } = await getCatalog(supabase)
  return settings
}

export function findProduct(catalog: Catalog, slug: string): Product | null {
  return catalog.products.find((p) => p.slug === slug) ?? null
}

export function findCategory(catalog: Catalog, slug: string): Category | null {
  return catalog.categories.find((c) => c.slug === slug) ?? null
}

/** Productos activos de una categoría, en el orden manual de la tienda. */
export function productsInCategory(catalog: Catalog, categorySlug: string): Product[] {
  return catalog.products
    .filter((p) => p.categorySlug === categorySlug && p.status !== 'draft')
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
