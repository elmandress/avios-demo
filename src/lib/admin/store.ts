// Catálogo editable del panel.
//
// El sitio no tiene base de datos todavía (ver src/lib/catalog/index.ts). Para
// que el panel se pueda USAR de verdad en la demo —cargar un producto, cambiar
// un precio, crear una categoría— las ediciones se guardan en el navegador.
//
// Decisión: no se guarda un "diff" contra el catálogo base sino el CATÁLOGO
// ENTERO, copiado la primera vez que alguien edita algo. Un diff obliga a
// inventar semántica de parches (¿qué significa borrar un producto que existe en
// la base?) y a resolver conflictos cuando el archivo base cambia. Copiar el
// catálogo entero son ~30 KB en un almacenamiento de 5 MB, y "Restaurar" vuelve
// a null en una línea.
//
// Consecuencia honesta, que el panel dice en pantalla: las ediciones viven en
// ESE navegador. No se publican para el visitante, no se sincronizan entre
// dispositivos y se van si se borran los datos del sitio. Con la base conectada,
// estas mismas pantallas escriben en Supabase y el cambio sale publicado.

import type {
  Catalog,
  Category,
  Discount,
  Product,
  Variant,
} from '@/lib/catalog/types'

const STORAGE_KEY = 'avios.panel.catalogo.v1'

export interface AdminSnapshot {
  /** Las ediciones guardadas, o null si el catálogo está sin tocar. */
  editedCatalog: Catalog | null
  /** true cuando hay ediciones guardadas encima del catálogo base. */
  edited: boolean
  /** false hasta leer localStorage — evita parpadeo en la primera pintada. */
  hydrated: boolean
}

const BASE: AdminSnapshot = { editedCatalog: null, edited: false, hydrated: false }

/**
 * El catálogo del archivo, aportado por quien renderiza.
 *
 * NO se importa `DEMO_CATALOG` acá a propósito: este módulo lo consume el
 * CatalogProvider, que es de cliente, así que importarlo metía las 56 KB del
 * catálogo dentro del JavaScript de todas las rutas de la tienda — encima de
 * venir ya en el HTML del servidor.
 *
 * Lo registran los layouts (de servidor, que ya lo leyeron para pre-renderizar)
 * antes de que se pueda mutar nada.
 */
let baseCatalog: Catalog | null = null

export function registerBaseCatalog(catalog: Catalog): void {
  baseCatalog = catalog
}

/** El catálogo sobre el que se aplica la próxima edición. */
function currentCatalog(): Catalog {
  const c = snapshot.editedCatalog ?? baseCatalog
  if (!c) {
    throw new Error(
      'No hay catálogo base registrado: falta llamar a registerBaseCatalog() desde el layout.'
    )
  }
  return c
}

// `useSyncExternalStore` compara por identidad: el snapshot se guarda y sólo se
// reemplaza cuando cambia de verdad.
let snapshot: AdminSnapshot = BASE
const listeners = new Set<() => void>()

function read(): Catalog | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // Validación mínima: si el guardado quedó de una versión anterior del
    // formato, se descarta y se vuelve al catálogo del archivo. Es preferible
    // perder ediciones de demo a renderizar un catálogo a medias.
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Catalog).products) ||
      !Array.isArray((parsed as Catalog).categories)
    ) {
      return null
    }
    return parsed as Catalog
  } catch {
    return null
  }
}

function write(catalog: Catalog | null) {
  try {
    if (catalog === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
  } catch (e) {
    // Cuota llena (típicamente por fotos en base64) o storage bloqueado.
    // Se avisa fuerte: si no, el usuario cree que guardó y no guardó.
    console.error('No se pudo guardar el catálogo del panel', e)
    throw new Error(
      'No se pudo guardar. Puede que el navegador esté sin espacio: probá con fotos más chicas o restaurá el catálogo de la demo.'
    )
  }
}

function publish(catalog: Catalog | null) {
  snapshot = {
    editedCatalog: catalog,
    edited: catalog !== null,
    hydrated: true,
  }
  for (const l of listeners) l()
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) publish(read())
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    try {
      publish(read())
    } catch {
      publish(null)
    }
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function getSnapshot(): AdminSnapshot {
  return snapshot
}

/** En el servidor siempre el catálogo del archivo: es lo que se pre-renderiza. */
export function getServerSnapshot(): AdminSnapshot {
  return BASE
}

/** Punto único de escritura. Persiste y avisa a todos los suscriptores. */
export function mutate(fn: (catalog: Catalog) => Catalog): void {
  // `generatedAt` se sella en cada edición: deja de ser la fecha en que se
  // escribió el archivo y pasa a ser "cuándo se tocaron estos precios por
  // última vez". De ahí sale el "Precios al …" de /lista-de-precios, que es
  // el dato que un cliente mira antes de confiar en una lista impresa.
  const next = { ...fn(currentCatalog()), generatedAt: new Date().toISOString() }
  write(next)
  publish(next)
}

/** Vuelve al catálogo del archivo, descartando todas las ediciones. */
export function resetCatalog(): void {
  write(null)
  publish(null)
}

/**
 * Reemplaza el catálogo entero por uno de un respaldo.
 *
 * No pasa por `mutate` a propósito: `mutate` sella `generatedAt` con la fecha de
 * hoy, y un respaldo tiene que conservar la suya. Si al restaurar se pisara esa
 * fecha, la lista de precios diría "precios al día de hoy" sobre precios que
 * pueden ser de hace tres meses.
 */
export function replaceCatalog(catalog: Catalog): void {
  write(catalog)
  publish(catalog)
}

// ─── Operaciones ─────────────────────────────────────────────────────────────
//
// Cada una devuelve un catálogo nuevo (nunca muta el anterior), para que React
// vea el cambio por identidad.

export function upsertProduct(product: Product): void {
  mutate((c) => {
    const i = c.products.findIndex((p) => p.id === product.id)
    const products = i >= 0 ? c.products.map((p) => (p.id === product.id ? product : p)) : [...c.products, product]
    return { ...c, products }
  })
}

export function deleteProduct(id: string): void {
  mutate((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) }))
}

/** Mueve un producto en el orden manual de la tienda. */
export function moveProduct(id: string, direction: -1 | 1): void {
  mutate((c) => {
    const sorted = [...c.products].sort((a, b) => a.sortOrder - b.sortOrder)
    const i = sorted.findIndex((p) => p.id === id)
    const j = i + direction
    if (i < 0 || j < 0 || j >= sorted.length) return c
    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
    // Se reescriben TODOS los sortOrder: si sólo se intercambian los dos
    // valores, dos productos con el mismo número quedan en orden indefinido.
    const renumbered = sorted.map((p, n) => ({ ...p, sortOrder: n + 1 }))
    return { ...c, products: renumbered }
  })
}

export function upsertCategory(category: Category): void {
  mutate((c) => {
    const i = c.categories.findIndex((x) => x.id === category.id)
    const categories =
      i >= 0 ? c.categories.map((x) => (x.id === category.id ? category : x)) : [...c.categories, category]
    return { ...c, categories }
  })
}

/**
 * Borra una categoría. Los productos que colgaban de ella NO se borran: quedan
 * sin categoría y el panel los marca. Borrar en cascada haría desaparecer
 * mercadería real por tocar el botón equivocado.
 */
export function deleteCategory(id: string): void {
  mutate((c) => {
    const cat = c.categories.find((x) => x.id === id)
    if (!cat) return c
    return {
      ...c,
      categories: c.categories.filter((x) => x.id !== id),
      products: c.products.map((p) => (p.categorySlug === cat.slug ? { ...p, categorySlug: '' } : p)),
    }
  })
}

export function upsertDiscount(discount: Discount): void {
  mutate((c) => {
    const i = c.discounts.findIndex((d) => d.id === discount.id)
    const discounts =
      i >= 0 ? c.discounts.map((d) => (d.id === discount.id ? discount : d)) : [...c.discounts, discount]
    return { ...c, discounts }
  })
}

export function deleteDiscount(id: string): void {
  mutate((c) => ({ ...c, discounts: c.discounts.filter((d) => d.id !== id) }))
}

export function updateSettings(patch: Record<string, string>): void {
  mutate((c) => ({ ...c, settings: { ...c.settings, ...patch } }))
}

// ─── Ayudas para crear entidades nuevas ──────────────────────────────────────

/** Id único y legible. `crypto.randomUUID` no existe en contextos no seguros. */
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}

export function emptyVariant(label = ''): Variant {
  return {
    id: newId('v'),
    label,
    axis: null,
    available: true,
    formats: [
      {
        id: newId('f'),
        tier: 'menor',
        label: 'Unidad',
        unit: 'u',
        contentQty: 1,
        priceUyu: 0,
        unitPriceUyu: 0,
        available: true,
        minQty: 1,
      },
    ],
  }
}

export function emptyProduct(categorySlug: string, sortOrder: number): Product {
  return {
    id: newId('p'),
    slug: '',
    name: '',
    description: null,
    categorySlug,
    status: 'draft',
    badge: null,
    sku: null,
    material: null,
    media: [],
    variants: [emptyVariant()],
    colors: [],
    sortOrder,
    createdAt: new Date().toISOString(),
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  }
}

// ─── Ajuste masivo de precios ────────────────────────────────────────────────
//
// En Uruguay los precios se mueven, y este catálogo tiene 20 productos con 42
// variantes y 58 presentaciones. Subir todo un 8% a mano es una tarde de
// trabajo y una garantía de erratas. Acá es un formulario con vista previa.
//
// Dos cuidados que hacen la diferencia entre útil y peligroso:
//
//   1. Las tres cifras de una presentación tienen que seguir cerrando. Se ajusta
//      el TOTAL, se redondea, y el precio por unidad se deriva de ahí. Al revés
//      (ajustar el unitario y multiplicar) el total queda con centésimos que
//      nadie cobra.
//   2. El redondeo es parte del trabajo, no un adorno: nadie vende la cinta a
//      $ 13,52 el metro, la vende a $ 14. Sin redondeo, un ajuste del 4% deja el
//      catálogo lleno de precios que después hay que corregir uno por uno.

export type PriceScope = 'todo' | 'categoria' | 'producto'
export type PriceRounding = 'ninguno' | '1' | '5' | '10'

export interface PriceAdjustment {
  scope: PriceScope
  categorySlug?: string
  productId?: string
  /** Positivo sube, negativo baja. */
  percent: number
  rounding: PriceRounding
  /** Dejar afuera las presentaciones por mayor (a veces se ajusta sólo menor). */
  onlyTier?: 'menor' | 'mayor' | null
}

export interface PriceChange {
  productId: string
  productName: string
  variantLabel: string
  formatId: string
  formatLabel: string
  /** null cuando la presentación no tiene total publicado. */
  fromUyu: number | null
  toUyu: number | null
  fromUnitUyu: number
  toUnitUyu: number
}

function roundTo(value: number, rounding: PriceRounding): number {
  if (rounding === 'ninguno') return Math.round(value * 100) / 100
  const step = Number(rounding)
  return Math.max(step, Math.round(value / step) * step)
}

function inScope(product: Product, adj: PriceAdjustment): boolean {
  if (adj.scope === 'todo') return true
  if (adj.scope === 'categoria') return product.categorySlug === adj.categorySlug
  return product.id === adj.productId
}

/**
 * Calcula el ajuste SIN aplicarlo. La pantalla muestra esto antes de tocar nada:
 * un cambio de precios masivo que no se puede revisar antes es una forma cara de
 * romper un catálogo.
 */
export function previewPriceAdjustment(
  catalog: Catalog,
  adj: PriceAdjustment
): PriceChange[] {
  if (!Number.isFinite(adj.percent) || adj.percent === 0) return []
  const factor = 1 + adj.percent / 100
  if (factor <= 0) return []

  const changes: PriceChange[] = []

  for (const product of catalog.products) {
    if (!inScope(product, adj)) continue

    for (const variant of product.variants) {
      for (const format of variant.formats) {
        if (adj.onlyTier && format.tier !== adj.onlyTier) continue

        if (format.priceUyu !== null && format.contentQty) {
          const toUyu = roundTo(format.priceUyu * factor, adj.rounding)
          const toUnitUyu = Math.round((toUyu / format.contentQty) * 10000) / 10000
          if (toUyu === format.priceUyu) continue
          changes.push({
            productId: product.id,
            productName: product.name,
            variantLabel: variant.label,
            formatId: format.id,
            formatLabel: format.label,
            fromUyu: format.priceUyu,
            toUyu,
            fromUnitUyu: format.unitPriceUyu,
            toUnitUyu,
          })
        } else {
          // Sin total publicado (medida de la pieza a confirmar): se ajusta el
          // precio por unidad, que es el único dato que hay.
          const toUnitUyu = roundTo(format.unitPriceUyu * factor, adj.rounding)
          if (toUnitUyu === format.unitPriceUyu) continue
          changes.push({
            productId: product.id,
            productName: product.name,
            variantLabel: variant.label,
            formatId: format.id,
            formatLabel: format.label,
            fromUyu: null,
            toUyu: null,
            fromUnitUyu: format.unitPriceUyu,
            toUnitUyu,
          })
        }
      }
    }
  }

  return changes
}

/** Aplica exactamente los cambios que devolvió la vista previa. */
export function applyPriceAdjustment(changes: readonly PriceChange[]): void {
  if (changes.length === 0) return
  const byFormat = new Map(changes.map((c) => [c.formatId, c]))

  mutate((catalog) => ({
    ...catalog,
    products: catalog.products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        formats: variant.formats.map((format) => {
          const change = byFormat.get(format.id)
          if (!change) return format
          return {
            ...format,
            priceUyu: change.toUyu,
            unitPriceUyu: change.toUnitUyu,
          }
        }),
      })),
    })),
  }))
}
