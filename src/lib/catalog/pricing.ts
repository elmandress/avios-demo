// Precios — única fuente de verdad para toda la tienda.
//
// Todo lo que muestre plata (tarjeta, ficha, carrito, mensaje de WhatsApp,
// JSON-LD, feed de Merchant) sale de acá. La regla que se rompía en el clon era
// simple: el número que ve el comprador y el número que viaja en el mensaje de
// WhatsApp tienen que salir de la MISMA función.

import type {
  Discount,
  MeasureUnit,
  Product,
  SaleFormat,
  Variant,
} from './types'
import { UNIT_NOUN, toMetres } from './types'

// ─── Formato de moneda ───────────────────────────────────────────────────────

/**
 * Pesos uruguayos con la convención local: punto de miles, coma decimal.
 * Los decimales aparecen SOLO cuando existen — "$ 396" y "$ 3,96", nunca
 * "$ 396,00". En una mercería el precio por metro tiene centésimos de verdad
 * (una cinta a $ 3,96 el metro) y redondearlos falsea el ahorro.
 */
export function formatUYU(value: number): string {
  const rounded = Math.round(value * 100) / 100
  const decimals = Number.isInteger(rounded) ? 0 : 2
  return `$ ${rounded.toLocaleString('es-UY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/** "$ 3,96 el metro" / "$ 198 la unidad". */
export function formatUnitPrice(value: number, unit: MeasureUnit): string {
  const noun = UNIT_NOUN[unit]
  return `${formatUYU(value)} ${noun.article} ${noun.singular}`
}

/** "100 m" / "100 yd" / "1 u". */
export function formatContent(qty: number, unit: MeasureUnit): string {
  return `${qty.toLocaleString('es-UY')} ${UNIT_NOUN[unit].short}`
}

// ─── Descuentos ──────────────────────────────────────────────────────────────

/**
 * Porcentaje de descuento vigente para un producto: el mejor entre el propio del
 * producto y cualquier regla de lote activa y en fecha. `now` se pasa desde
 * afuera para que las funciones sigan siendo puras y el render del servidor sea
 * reproducible.
 */
export function resolveDiscountPercent(
  product: Product,
  discounts: readonly Discount[] = [],
  now: number = Date.now()
): number {
  let pct = product.discountActive ? product.discountPercent : 0

  for (const d of discounts) {
    if (!d.active || d.percent <= 0) continue
    if (d.startsAt && new Date(d.startsAt).getTime() > now) continue
    if (d.endsAt && new Date(d.endsAt).getTime() < now) continue
    const applies =
      d.scope === 'all' || (d.scope === 'category' && d.categorySlug === product.categorySlug)
    if (applies) pct = Math.max(pct, d.percent)
  }

  return Math.min(90, Math.max(0, pct))
}

/** Aplica un porcentaje sin arrastrar ruido de coma flotante. */
export function applyDiscount(value: number, percent: number): number {
  if (percent <= 0) return value
  return Math.round(value * (100 - percent)) / 100
}

// ─── Precio de una presentación ──────────────────────────────────────────────

/** Lo que se cobra por UNA presentación, ya con el descuento aplicado. */
export interface FormatPrice {
  /** Precio de lista de una presentación (null si la medida está a confirmar). */
  listUyu: number | null
  /** Precio final de una presentación. */
  finalUyu: number | null
  /** Precio de lista por unidad base. */
  listUnitUyu: number
  /** Precio final por unidad base. */
  finalUnitUyu: number
  discountPercent: number
}

export function priceFormat(
  format: SaleFormat,
  discountPercent: number
): FormatPrice {
  return {
    listUyu: format.priceUyu,
    finalUyu: format.priceUyu === null ? null : applyDiscount(format.priceUyu, discountPercent),
    listUnitUyu: format.unitPriceUyu,
    finalUnitUyu: applyDiscount(format.unitPriceUyu, discountPercent),
    discountPercent,
  }
}

// ─── Ahorro por mayor ────────────────────────────────────────────────────────

/**
 * La presentación de referencia de una variante: contra ella se mide el ahorro.
 * Es la más chica por menor; si no hay ninguna por menor, la de menor contenido.
 * Sin referencia no se anuncia ahorro — es preferible no decir nada a inventar
 * un porcentaje contra un precio que nadie paga.
 */
export function referenceFormat(variant: Variant): SaleFormat | null {
  const menor = variant.formats.filter((f) => f.tier === 'menor')
  const pool = menor.length > 0 ? menor : variant.formats
  if (pool.length === 0) return null
  return pool.reduce((best, f) =>
    (f.contentQty ?? Infinity) < (best.contentQty ?? Infinity) ? f : best
  )
}

/**
 * Cuánto se ahorra por unidad comprando `format` en lugar de la referencia.
 * Devuelve null cuando no hay con qué comparar o cuando las unidades no son
 * convertibles entre sí (metros vs. unidades sueltas).
 */
export function savingsPercent(format: SaleFormat, variant: Variant): number | null {
  const ref = referenceFormat(variant)
  if (!ref || ref.id === format.id) return null

  // Normalizar a metros permite comparar el rollo de 10 m contra el de 100 yardas.
  const refPerMetre = normalisedUnitPrice(ref)
  const thisPerMetre = normalisedUnitPrice(format)
  if (refPerMetre === null || thisPerMetre === null) {
    // Sin conversión posible: solo comparable si comparten unidad.
    if (ref.unit !== format.unit) return null
    if (ref.unitPriceUyu <= 0) return null
    const pct = Math.round((1 - format.unitPriceUyu / ref.unitPriceUyu) * 100)
    return pct > 0 ? pct : null
  }

  if (refPerMetre <= 0) return null
  const pct = Math.round((1 - thisPerMetre / refPerMetre) * 100)
  return pct > 0 ? pct : null
}

/** Precio por metro de una presentación, o null si su unidad no es de longitud. */
function normalisedUnitPrice(format: SaleFormat): number | null {
  const metres = toMetres(1, format.unit)
  if (metres === null || metres === 0) return null
  return format.unitPriceUyu / metres
}

// ─── Resúmenes a nivel producto ──────────────────────────────────────────────

export interface ProductPriceSummary {
  /** Precio final más bajo entre las presentaciones POR MENOR: el "desde". */
  fromUyu: number
  /** Precio de lista correspondiente a `fromUyu`, para el tachado. */
  fromListUyu: number
  /** Unidad del "desde", para escribir "desde $ 13 el metro". */
  fromUnit: MeasureUnit
  /** La presentación por menor tiene contenido 1 → el precio es por unidad. */
  fromIsPerUnit: boolean
  /** Hay al menos una presentación por mayor comprable. */
  hasWholesale: boolean
  /** Mejor ahorro por mayor del producto entero, para la señal de la grilla. */
  bestSavingsPercent: number | null
  discountPercent: number
  /** Rango de precios de lista de las presentaciones por menor (para JSON-LD). */
  retailRange: { low: number; high: number } | null
}

/**
 * El "desde" de la grilla sale SOLO de las presentaciones por menor. Tomarlo de
 * todas era el bug que hacía que Google publicara "desde $ 3,96" para una cinta
 * de $ 13 el metro: $ 3,96 es el precio por metro DENTRO de una pieza de 100 m
 * que cuesta $ 396, no un precio al que alguien pueda comprar un metro.
 */
export function summarisePrice(
  product: Product,
  discounts: readonly Discount[] = [],
  now?: number
): ProductPriceSummary {
  const discountPercent = resolveDiscountPercent(product, discounts, now)

  const retail: Array<{ format: SaleFormat }> = []
  let hasWholesale = false
  let bestSavings: number | null = null

  for (const variant of product.variants) {
    for (const format of variant.formats) {
      if (!format.available) continue
      if (format.tier === 'menor') {
        retail.push({ format })
      } else {
        // Alcanza con que EXISTA una presentación por mayor, aunque su total no
        // esté publicado. El cordón de algodón es el caso: sabemos que por mayor
        // sale $ 17,60 el metro, pero no cuántos metros trae la pieza. El ahorro
        // por metro es un dato real y publicable; el total de la pieza, no. Si
        // esto exigiera `priceUyu !== null`, la grilla escondería un precio por
        // mayor que la ficha sí muestra.
        hasWholesale = true
        const s = savingsPercent(format, variant)
        if (s !== null && (bestSavings === null || s > bestSavings)) bestSavings = s
      }
    }
  }

  // Sin presentaciones por menor (producto que solo se vende por pieza): el
  // "desde" cae a la presentación más barata que exista, para no mostrar $ 0.
  const pool =
    retail.length > 0
      ? retail.map((r) => r.format)
      : product.variants.flatMap((v) => v.formats).filter((f) => f.available)

  const priced = pool.filter((f) => f.priceUyu !== null) as Array<SaleFormat & { priceUyu: number }>

  if (priced.length === 0) {
    return {
      fromUyu: 0,
      fromListUyu: 0,
      fromUnit: 'u',
      fromIsPerUnit: true,
      hasWholesale,
      bestSavingsPercent: bestSavings,
      discountPercent,
      retailRange: null,
    }
  }

  const cheapest = priced.reduce((a, b) => (a.priceUyu <= b.priceUyu ? a : b))
  const low = Math.min(...priced.map((f) => f.priceUyu))
  const high = Math.max(...priced.map((f) => f.priceUyu))

  return {
    fromUyu: applyDiscount(cheapest.priceUyu, discountPercent),
    fromListUyu: cheapest.priceUyu,
    fromUnit: cheapest.unit,
    fromIsPerUnit: (cheapest.contentQty ?? 1) === 1,
    hasWholesale,
    bestSavingsPercent: bestSavings,
    discountPercent,
    retailRange: { low, high },
  }
}

/** "desde $ 13 el metro" / "$ 198". */
export function formatFrom(summary: ProductPriceSummary, withPrefix = true): string {
  const price = formatUYU(summary.fromUyu)
  const prefix = withPrefix ? 'desde ' : ''
  if (summary.fromIsPerUnit && summary.fromUnit !== 'u') {
    const noun = UNIT_NOUN[summary.fromUnit]
    return `${prefix}${price} ${noun.article} ${noun.singular}`
  }
  return `${prefix}${price}`
}

// ─── Búsqueda de variantes y presentaciones ──────────────────────────────────

export function findVariant(product: Product, variantId: string): Variant | null {
  return product.variants.find((v) => v.id === variantId) ?? null
}

export function findFormat(
  product: Product,
  variantId: string,
  formatId: string
): { variant: Variant; format: SaleFormat } | null {
  const variant = findVariant(product, variantId)
  if (!variant) return null
  const format = variant.formats.find((f) => f.id === formatId)
  return format ? { variant, format } : null
}

/** Primera combinación comprable — el estado inicial del selector de la ficha. */
export function defaultSelection(
  product: Product
): { variantId: string; formatId: string } | null {
  const variant =
    product.variants.find((v) => v.available && v.formats.some((f) => f.available && f.priceUyu !== null)) ??
    product.variants[0]
  if (!variant) return null
  const format =
    variant.formats.find((f) => f.tier === 'menor' && f.available && f.priceUyu !== null) ??
    variant.formats.find((f) => f.available && f.priceUyu !== null) ??
    variant.formats[0]
  if (!format) return null
  return { variantId: variant.id, formatId: format.id }
}

/** ¿Se puede comprar algo de este producto? */
export function isPurchasable(product: Product): boolean {
  return (
    product.status === 'active' &&
    product.variants.some((v) => v.available && v.formats.some((f) => f.available && f.priceUyu !== null))
  )
}

// ─── Cómo nombrar la cantidad ────────────────────────────────────────────────

/**
 * Cómo se llama lo que el comprador está contando, en singular o plural según la
 * cantidad. En una mercería esto NO es un detalle de redacción: "2" puede ser
 * dos metros o dos piezas de cien metros, y el sustantivo es lo único que lo
 * distingue en la ficha, en el carrito y en el mensaje de WhatsApp.
 *
 * Vive acá, en un solo lugar, porque esos tres tienen que decir lo mismo.
 */
export function countNoun(format: SaleFormat, qty: number): string {
  const plural = qty !== 1
  // Contenido > 1 → lo que se cuenta son presentaciones cerradas, no metros.
  if ((format.contentQty ?? 1) > 1) return plural ? 'piezas' : 'pieza'
  if (format.unit === 'u') return plural ? 'unidades' : 'unidad'
  const noun = UNIT_NOUN[format.unit].singular
  return plural ? `${noun}s` : noun
}

// ─── El salto a por mayor ────────────────────────────────────────────────────

export interface WholesaleUpgrade {
  /** La presentación por mayor que conviene mirar. */
  format: SaleFormat
  /** Cuántas piezas cerradas hacen falta para cubrir lo que se está pidiendo. */
  packs: number
  /** Lo que se paga con la elección actual. */
  spendNowUyu: number
  /** Lo que se pagaría llevando la(s) pieza(s). */
  spendUpgradedUyu: number
  /** Contenido total que se lleva hoy (en la unidad de la presentación). */
  contentNow: number
  /** Contenido total que se llevaría con la pieza. */
  contentUpgraded: number
  /** Precio por unidad de hoy y el de la pieza, para comparar. */
  unitNowUyu: number
  unitUpgradedUyu: number
  /**
   * true cuando la pieza cerrada cuesta lo mismo o MENOS que lo que se está por
   * pagar suelto. Pasa más seguido de lo que parece: 40 m de cinta de raso
   * sueltos salen $ 468 y la pieza entera de 100 m sale $ 356,40.
   */
  alreadyCheaper: boolean
  /** Cuánto más hay que poner para llevarse la pieza (0 si ya conviene). */
  extraToPayUyu: number
  /** Cuánto se ahorra por unidad al pasarse. */
  savingPercent: number
}

/**
 * ¿Conviene pasarse a la pieza cerrada?
 *
 * Es la señal comercial más fuerte que permite este modelo de precios, y no
 * existe en ninguna tienda que trate el mayoreo como un tipo de cliente: hace
 * falta saber CUÁNTO trae la pieza para poder compararla contra lo que el
 * comprador está por llevar suelto.
 *
 * Devuelve null cuando no hay nada honesto que decir: si no hay presentación por
 * mayor, si las unidades no son comparables, o si el salto todavía queda tan
 * lejos que sugerirlo sería empujar a gastar de más (el corte está en
 * `MAX_STRETCH`).
 */
const MAX_STRETCH = 1.4

export function wholesaleUpgrade(
  variant: Variant,
  current: SaleFormat,
  qty: number,
  discountPercent: number
): WholesaleUpgrade | null {
  if (current.tier !== 'menor' || qty < 1) return null

  const candidates = variant.formats.filter(
    (f) =>
      f.tier === 'mayor' &&
      f.available &&
      f.priceUyu !== null &&
      f.contentQty !== null &&
      // Comparar metros contra unidades sueltas no significa nada.
      f.unit === current.unit
  )
  if (candidates.length === 0) return null

  // La pieza más chica: es la que primero se vuelve conveniente.
  const format = candidates.reduce((best, f) =>
    (f.contentQty as number) < (best.contentQty as number) ? f : best
  )

  const packContent = format.contentQty as number
  const packPrice = applyDiscount(format.priceUyu as number, discountPercent)
  const unitNow = applyDiscount(current.unitPriceUyu, discountPercent)
  const currentContent = current.contentQty ?? 1

  const contentNow = currentContent * qty
  // Ya está pidiendo tanto o más que una pieza: el consejo sobra, que elija la
  // presentación por mayor directamente desde el selector.
  if (contentNow >= packContent * 1.0 && currentContent > 1) return null

  const packs = Math.max(1, Math.ceil(contentNow / packContent))
  const contentUpgraded = packs * packContent
  const spendNow = round2(applyDiscount(current.priceUyu ?? current.unitPriceUyu, discountPercent) * qty)
  const spendUpgraded = round2(packPrice * packs)

  if (spendUpgraded > spendNow * MAX_STRETCH) return null

  const unitUpgraded = round2(spendUpgraded / contentUpgraded)
  const savingPercent = unitNow > 0 ? Math.round((1 - unitUpgraded / unitNow) * 100) : 0
  if (savingPercent <= 0) return null

  return {
    format,
    packs,
    spendNowUyu: spendNow,
    spendUpgradedUyu: spendUpgraded,
    contentNow,
    contentUpgraded,
    unitNowUyu: unitNow,
    unitUpgradedUyu: unitUpgraded,
    alreadyCheaper: spendUpgraded <= spendNow,
    extraToPayUyu: Math.max(0, round2(spendUpgraded - spendNow)),
    savingPercent,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
