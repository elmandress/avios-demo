// Resolución del carrito: líneas guardadas + catálogo → líneas con precio.
//
// Es el puente entre lo que se persiste (identidad y cantidad) y lo que se
// muestra y se cobra. Vive separado de React a propósito: el mensaje de WhatsApp
// se arma con estas mismas estructuras, así que lo que ve el comprador en
// pantalla y lo que le llega a Alejandra salen del mismo cálculo. Cuando eso se
// duplica, es cuestión de tiempo que uno de los dos quede desfasado.

import type { Discount, Product, SaleFormat, Variant } from '@/lib/catalog/types'
import {
  applyDiscount,
  resolveDiscountPercent,
  savingsPercent,
} from '@/lib/catalog/pricing'
import type { CartLine } from './types'

export interface ResolvedLine {
  line: CartLine
  product: Product
  variant: Variant
  format: SaleFormat
  /** Precio de lista de UNA presentación. */
  unitListUyu: number
  /** Precio final de UNA presentación (con descuento aplicado). */
  unitFinalUyu: number
  /** `unitFinalUyu × qty`. */
  subtotalUyu: number
  discountPercent: number
  /** Ahorro por unidad de medida contra la presentación de referencia, si aplica. */
  savingsPercent: number | null
  /** Contenido total que se lleva: 2 piezas × 100 m = 200 m. */
  totalContent: { qty: number; unit: SaleFormat['unit'] } | null
}

export interface ResolvedCart {
  lines: ResolvedLine[]
  /** Líneas guardadas que ya no existen en el catálogo (producto dado de baja). */
  droppedCount: number
  subtotalUyu: number
  /** Cuánto se ahorró contra los precios de lista, por descuentos vigentes. */
  savedUyu: number
  /**
   * Cuántos RENGLONES tiene el pedido (artículo + variante + presentación).
   * Es lo que espera leer una persona: "3 artículos", no "45" porque pidió 45
   * metros de una sola cinta.
   */
  lineCount: number
  /** La suma de todas las cantidades. Sirve para métricas, no para mostrar. */
  itemCount: number
  /** El pedido incluye al menos una presentación por mayor. */
  hasWholesale: boolean
}

/**
 * Resuelve el carrito contra el catálogo actual.
 *
 * Una línea cuyo producto, variante o presentación ya no existe se DESCARTA en
 * vez de mostrarse con datos viejos. Es la decisión correcta en una mercería:
 * mejor que el cliente vea que un renglón desapareció (y se cuente en
 * `droppedCount` para avisarle) a que mande por WhatsApp un pedido de algo que
 * ya no se vende, o a un precio que ya no rige.
 */
export function resolveCart(
  lines: readonly CartLine[],
  products: readonly Product[],
  discounts: readonly Discount[] = [],
  now?: number
): ResolvedCart {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const resolved: ResolvedLine[] = []
  let dropped = 0

  for (const line of [...lines].sort((a, b) => a.addedAt - b.addedAt)) {
    const product = bySlug.get(line.productSlug)
    if (!product || product.status === 'draft') {
      dropped++
      continue
    }
    const variant = product.variants.find((v) => v.id === line.variantId)
    const format = variant?.formats.find((f) => f.id === line.formatId)
    if (!variant || !format || format.priceUyu === null) {
      dropped++
      continue
    }

    const discountPercent = resolveDiscountPercent(product, discounts, now)
    const unitFinalUyu = applyDiscount(format.priceUyu, discountPercent)

    resolved.push({
      line,
      product,
      variant,
      format,
      unitListUyu: format.priceUyu,
      unitFinalUyu,
      subtotalUyu: Math.round(unitFinalUyu * line.qty * 100) / 100,
      discountPercent,
      savingsPercent: savingsPercent(format, variant),
      totalContent:
        format.contentQty === null
          ? null
          : { qty: format.contentQty * line.qty, unit: format.unit },
    })
  }

  const subtotalUyu = round2(resolved.reduce((sum, l) => sum + l.subtotalUyu, 0))
  const listTotal = round2(resolved.reduce((sum, l) => sum + l.unitListUyu * l.line.qty, 0))

  return {
    lines: resolved,
    droppedCount: dropped,
    subtotalUyu,
    savedUyu: round2(Math.max(0, listTotal - subtotalUyu)),
    lineCount: resolved.length,
    itemCount: resolved.reduce((n, l) => n + l.line.qty, 0),
    hasWholesale: resolved.some((l) => l.format.tier === 'mayor'),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
