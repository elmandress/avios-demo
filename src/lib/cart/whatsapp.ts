// El mensaje de WhatsApp.
//
// Es la caja registradora de esta tienda: no hay pasarela de pago, así que este
// texto ES el pedido. Tiene que decir exactamente lo que el cliente eligió —
// variante, presentación, cantidad, cuánto contenido se lleva y cuánto sale.
//
// Lo que hacía el clon, con el modelo viejo:
//
//     1. Cinta Raso Doble Faz
//        • Talle: 4 mm (Nro 0) · mayorista, pieza x100m
//        • Cantidad: 2
//        • Subtotal: UYU 7,92
//
// $ 7,92 por dos piezas de 100 metros. El pedido real son $ 792. Ese error no se
// arregla escribiendo mejor el mensaje: se arregla en el modelo de datos, y por
// eso este archivo se limita a leer lo que ya resolvió `resolveCart`.

import { countNoun, formatContent, formatUYU, formatUnitPrice } from '@/lib/catalog/pricing'
import type { ResolvedCart, ResolvedLine } from './resolve'

export interface OrderContext {
  /** URL absoluta del sitio, para linkear cada ficha. */
  siteUrl: string
  /** 'retiro' | 'envio' | null cuando el cliente todavía no eligió. */
  delivery: 'retiro' | 'envio' | null
  /** Localidad de destino cuando eligió envío. */
  destination?: string
  /** Comentario libre del cliente. */
  note?: string
}

/** Una línea del pedido, con todo lo que hace falta para no tener que preguntar. */
function renderLine(line: ResolvedLine, index: number, siteUrl: string): string[] {
  const { product, variant, format, line: raw } = line
  const out: string[] = []

  const title = variant.label ? `${product.name} — ${variant.label}` : product.name
  out.push(`${index + 1}. ${title}`)

  // "Pieza cerrada · 100 m × 2 = $ 792"
  const qtySuffix = raw.qty > 1 ? ` × ${raw.qty}` : ''
  out.push(`   ${format.label}${qtySuffix} — ${formatUYU(line.subtotalUyu)}`)

  // Cuánto se lleva en total. Solo cuando aporta algo: en una presentación de
  // contenido 1 ("Unidad", "Por metro") el renglón de arriba ya lo dice.
  if (line.totalContent && (format.contentQty ?? 1) > 1) {
    out.push(
      `   Total: ${formatContent(line.totalContent.qty, line.totalContent.unit)} · ` +
        `${formatUnitPrice(line.unitFinalUyu / (format.contentQty ?? 1), format.unit)}`
    )
  } else if (raw.qty > 1) {
    out.push(`   ${raw.qty} ${countNoun(format, raw.qty)} a ${formatUYU(line.unitFinalUyu)} c/u`)
  }

  if (line.discountPercent > 0) {
    out.push(`   (con ${line.discountPercent}% de descuento sobre ${formatUYU(line.unitListUyu * raw.qty)})`)
  }

  // El enlace a la ficha sólo si el sitio tiene dominio: mientras corra en
  // localhost, pegarlo en el mensaje es mandarle a la dueña una dirección que
  // no puede abrir desde el teléfono.
  if (!siteUrl.includes('localhost')) {
    out.push(`   ${siteUrl}/tienda/${product.slug}`)
  }
  return out
}

export function buildOrderMessage(cart: ResolvedCart, ctx: OrderContext): string {
  const lines: string[] = []

  lines.push('¡Hola! Quiero hacer este pedido en Mercería Avíos:')
  lines.push('')

  cart.lines.forEach((line, i) => {
    lines.push(...renderLine(line, i, ctx.siteUrl))
    lines.push('')
  })

  if (cart.savedUyu > 0) {
    lines.push(`Descuento aplicado: −${formatUYU(cart.savedUyu)}`)
  }
  lines.push(`TOTAL: ${formatUYU(cart.subtotalUyu)}`)

  if (cart.hasWholesale) {
    lines.push('(incluye artículos por mayor)')
  }

  lines.push('')
  if (ctx.delivery === 'retiro') {
    lines.push('Retiro por el local (San José 851 esq. Andes).')
  } else if (ctx.delivery === 'envio') {
    lines.push(
      ctx.destination?.trim()
        ? `Envío por agencia a: ${ctx.destination.trim()}`
        : 'Prefiero envío por agencia — te paso el destino.'
    )
  }

  if (ctx.note?.trim()) {
    lines.push('')
    lines.push(`Nota: ${ctx.note.trim()}`)
  }

  lines.push('')
  lines.push('¿Me confirmás stock y cómo seguimos? ¡Gracias!')

  return lines.join('\n')
}

/** Mensaje de una sola ficha, para el botón "Consultar por WhatsApp". */
export function buildEnquiryMessage(
  productName: string,
  variantLabel: string,
  siteUrl: string,
  slug: string
): string {
  const what = variantLabel ? `${productName} (${variantLabel})` : productName
  return [
    `¡Hola! Quería consultar por ${what}.`,
    '',
    `${siteUrl}/tienda/${slug}`,
  ].join('\n')
}

/** Une la URL de wa.me con el texto ya codificado. */
export function whatsappLink(baseUrl: string, message: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}text=${encodeURIComponent(message)}`
}
