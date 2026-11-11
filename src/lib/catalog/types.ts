// Modelo de dominio del catálogo — Mercería Avíos
//
// El eje del negocio es que el MISMO artículo se vende de dos maneras: suelto
// (por menor) y en su presentación cerrada (por mayor). Eso NO es un talle, y
// modelarlo como talle fue el parche que arrastraba el clon: la etiqueta
// "4 mm (Nro 0) · mayorista, pieza x100m" era un string sin estructura, así que
// nada podía calcular el total real, el ahorro, ni el precio por metro.
//
// Acá se modela con dos ejes explícitos:
//
//   Producto
//    └── Variante        el atributo físico: ancho, color, medida, modelo
//         └── Presentación   cómo sale del local: por metro / pieza x100 m / unidad
//
// El precio mayorista queda colgado de la PRESENTACIÓN, no del cliente. Esa es
// la razón de fondo por la que esta tienda no necesita login de mayorista:
// el descuento depende de QUÉ comprás (la pieza cerrada), no de QUIÉN sos.

/** Unidad en la que se cuenta el contenido de una presentación. */
export type MeasureUnit = 'm' | 'yd' | 'u'

/** Cuántos metros equivale una unidad base. `u` no es longitud: no convierte. */
const METRES_PER_UNIT: Record<MeasureUnit, number | null> = {
  m: 1,
  yd: 0.9144,
  u: null,
}

/**
 * Convierte una cantidad a metros para poder comparar presentaciones que vienen
 * en unidades distintas (el hilo chino se vende por rollo de 10 m y por rollo de
 * 100 yardas). Devuelve null cuando la unidad no es de longitud.
 */
export function toMetres(qty: number, unit: MeasureUnit): number | null {
  const factor = METRES_PER_UNIT[unit]
  return factor === null ? null : qty * factor
}

/** Cómo nombrar la unidad en texto corrido: "el metro", "la yarda", "la unidad". */
export const UNIT_NOUN: Record<MeasureUnit, { singular: string; short: string; article: string }> = {
  m: { singular: 'metro', short: 'm', article: 'el' },
  yd: { singular: 'yarda', short: 'yd', article: 'la' },
  u: { singular: 'unidad', short: 'u', article: 'la' },
}

/** Por menor (suelto/fraccionado) o por mayor (presentación cerrada). */
export type PriceTier = 'menor' | 'mayor'

/**
 * Una forma concreta de comprar una variante.
 *
 * Los tres campos de plata son redundantes a propósito: `unitPriceUyu` es el que
 * compara, `priceUyu` es el que se cobra, y `contentQty` los une. Guardar los dos
 * precios en vez de derivar uno del otro evita inventar redondeos sobre los
 * números que pasó Alejandra. `assertCatalogIntegrity()` verifica que cierren.
 */
export interface SaleFormat {
  id: string
  tier: PriceTier
  /** Etiqueta visible: "Por metro", "Pieza cerrada · 100 m", "Unidad". */
  label: string
  unit: MeasureUnit
  /** Contenido de UNA presentación. `null` = la medida de la pieza está a confirmar. */
  contentQty: number | null
  /** Precio de UNA presentación. `null` cuando `contentQty` es null. */
  priceUyu: number | null
  /** Precio por unidad base. Siempre presente: es lo que hace comparable todo. */
  unitPriceUyu: number
  available: boolean
  /**
   * Mínimo de presentaciones por pedido. 1 en casi todo; sirve para un mayorista
   * que exija llevar 2 piezas. No inventa mínimos: por defecto es 1.
   */
  minQty: number
}

/** Eje por el que se distinguen las variantes de un producto. */
export type VariantAxis = 'ancho' | 'color' | 'medida' | 'modelo'

export interface Variant {
  id: string
  /** "4 mm (Nro 0)", "Tostado", "Chico". Vacío en productos de una sola variante. */
  label: string
  axis: VariantAxis | null
  available: boolean
  /** Ordenadas: primero `menor`, después `mayor`. */
  formats: SaleFormat[]
  /**
   * Qué foto de `media` muestra ESTA variante. En el catálogo de Avíos los
   * modelos numerados y los colores vienen rotulados sobre las fotos ("N 17",
   * "Bordó"): al elegir la variante, la galería salta a su foto.
   */
  mediaIndex?: number
  /** Tono aproximado de la variante cuando el eje es el color. Sólo para el punto de color. */
  hex?: string
}

export interface Category {
  id: string
  slug: string
  name: string
  /** Texto de cabecera de la categoría. Se indexa: escribirlo, no dejarlo null. */
  description: string | null
  sortOrder: number
}

export interface ProductMedia {
  url: string
  alt: string | null
  position: number
}

/** Color meramente informativo ("viene en estos tonos"), no seleccionable. */
export interface ColorTone {
  id: string
  name: string
  hex: string
}

export type ProductStatus = 'active' | 'soldout' | 'draft'

export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  categorySlug: string
  status: ProductStatus
  badge: string | null
  /** Código del catálogo en papel, cuando exista. El mayorista busca por código. */
  sku: string | null
  material: string | null
  media: ProductMedia[]
  /** Siempre al menos una. Un producto sin variantes reales trae una con label ''. */
  variants: Variant[]
  colors: ColorTone[]
  sortOrder: number
  createdAt: string
  /** Descuento porcentual propio del producto (0-90). */
  discountPercent: number
  discountActive: boolean
  /**
   * Marca los campos que fueron interpretados y NO vienen tal cual del catálogo
   * en papel (típicamente la unidad de venta). Se muestran con un aviso en el
   * panel para que Alejandra los confirme; nunca se muestran al comprador como
   * si fueran un dato cerrado.
   */
  needsReview: string[]
  /**
   * Lo que el catálogo dice del precio por mayor cuando NO alcanza para armar
   * una presentación con precio ("Consulte por mayor", "Pieza x 25 yardas").
   */
  wholesaleNote?: string | null
  /**
   * El catálogo lo trae sin precio ("consultar precios"). No se le inventa uno:
   * se publica con la foto y un botón para consultarlo por WhatsApp.
   */
  priceOnRequest?: boolean
  /** Páginas del PDF de las que salió. Para auditar contra el original. */
  sourcePages?: number[]
}

/** Regla de descuento por lote (toda la tienda o una categoría). */
export interface Discount {
  id: string
  label: string
  scope: 'all' | 'category'
  categorySlug: string | null
  percent: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
}

export interface Catalog {
  generatedAt: string
  categories: Category[]
  products: Product[]
  colors: ColorTone[]
  discounts: Discount[]
  settings: Record<string, string>
}

/** De dónde salieron los datos que se están sirviendo. */
export type CatalogSource = 'demo' | 'live' | 'snapshot'
