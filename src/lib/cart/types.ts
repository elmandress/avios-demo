// Carrito — modelo de datos.
//
// Una línea guarda SOLO la identidad de lo que se eligió y cuánto. Todo lo demás
// (nombre, precio, ahorro, total) se deriva del catálogo en cada render.
//
// El clon guardaba el carrito en Supabase con la forma `{ product_id, size, qty }`,
// donde `size` era el string "4 mm (Nro 0) · mayorista, pieza x100m" recortado a
// 16 caracteres por la API. Dos problemas de fondo: la elección de presentación
// no sobrevivía al recorte, y sin base el carrito directamente no funcionaba.
//
// Guardar identidad y derivar el resto tiene una consecuencia que importa: un
// precio nunca queda viejo dentro de un carrito. Si Alejandra cambia el precio de
// la pieza, el carrito abierto de un cliente muestra el precio nuevo, y el
// mensaje de WhatsApp también.

export interface CartLine {
  productSlug: string
  variantId: string
  formatId: string
  qty: number
  /** Marca de tiempo del agregado, para ordenar el carrito por antigüedad. */
  addedAt: number
}

/** Estado persistido en localStorage. `v` permite migrar sin romper carritos. */
export interface CartState {
  v: 1
  lines: CartLine[]
}

export const EMPTY_CART: CartState = { v: 1, lines: [] }

/** Tope por línea. Un mayorista puede llevar muchas piezas, pero no diez mil. */
export const MAX_QTY_PER_LINE = 999

/** Identidad de una línea: producto + variante + presentación. */
export function lineKey(line: Pick<CartLine, 'productSlug' | 'variantId' | 'formatId'>): string {
  return `${line.productSlug}::${line.variantId}::${line.formatId}`
}

function isValidLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const l = value as Record<string, unknown>
  return (
    typeof l.productSlug === 'string' &&
    l.productSlug.length > 0 &&
    typeof l.variantId === 'string' &&
    typeof l.formatId === 'string' &&
    typeof l.qty === 'number' &&
    Number.isFinite(l.qty) &&
    l.qty > 0 &&
    typeof l.addedAt === 'number'
  )
}

/**
 * Lee el carrito guardado. Todo lo que no sea exactamente la forma esperada se
 * descarta en silencio: puede venir de una versión anterior del sitio, de una
 * extensión que tocó el storage, o de un JSON truncado. Un carrito vacío es
 * molesto; un carrito con líneas rotas rompe el mensaje de WhatsApp.
 */
export function parseCartState(raw: string | null): CartState {
  if (!raw) return EMPTY_CART
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_CART
    const candidate = parsed as { v?: unknown; lines?: unknown }
    if (candidate.v !== 1 || !Array.isArray(candidate.lines)) return EMPTY_CART

    const lines = candidate.lines.filter(isValidLine).map((l) => ({
      ...l,
      qty: Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.round(l.qty))),
    }))
    return { v: 1, lines }
  } catch {
    return EMPTY_CART
  }
}
