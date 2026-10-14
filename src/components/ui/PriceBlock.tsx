import { formatUYU } from '@/lib/catalog/pricing'
import { UNIT_NOUN, type MeasureUnit } from '@/lib/catalog/types'
import { avios } from './tokens'

// Cómo se ve un precio, en un solo lugar.
//
// La regla que sostiene: si el precio se ve distinto en la grilla, en la ficha y
// en el carrito, el comprador duda. Y en una mercería hay un dato extra que casi
// siempre tiene que viajar pegado al número — de qué es ese precio ("el metro").
// Sin eso, "$ 13" al lado de "$ 1.990" parece un error de carga.

const SIZES = {
  sm: { final: 15, list: 12.5, unit: 12 },
  md: { final: 20, list: 14, unit: 13 },
  lg: { final: 27, list: 16, unit: 14 },
} as const

export function PriceBlock({
  list,
  final,
  unit,
  showUnit = false,
  prefix,
  size = 'sm',
  soldOut = false,
}: {
  /** Precio de lista, antes de descuento. */
  list: number
  /** Precio final que se cobra. */
  final: number
  unit?: MeasureUnit
  /** Agregar "el metro" / "la unidad" después del número. */
  showUnit?: boolean
  /** "desde", normalmente. */
  prefix?: string
  size?: keyof typeof SIZES
  soldOut?: boolean
}) {
  const s = SIZES[size]

  if (soldOut) {
    return (
      <span style={{ fontFamily: avios.fontSans, fontSize: s.final, fontWeight: 500, color: avios.ink500 }}>
        Sin stock
      </span>
    )
  }

  const discounted = final < list && list > 0
  const unitText = showUnit && unit && unit !== 'u' ? `${UNIT_NOUN[unit].article} ${UNIT_NOUN[unit].singular}` : ''

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
      {prefix && (
        <span style={{ fontFamily: avios.fontSans, fontSize: s.unit, color: avios.ink500 }}>{prefix}</span>
      )}
      <span
        style={{
          fontFamily: avios.fontSans,
          fontSize: s.final,
          fontWeight: 600,
          color: discounted ? avios.sale : avios.ink900,
          whiteSpace: 'nowrap',
        }}
      >
        {formatUYU(final)}
      </span>
      {discounted && (
        <span
          style={{
            fontFamily: avios.fontSans,
            fontSize: s.list,
            color: avios.ink500,
            textDecoration: 'line-through',
            whiteSpace: 'nowrap',
          }}
        >
          {formatUYU(list)}
        </span>
      )}
      {unitText && (
        <span style={{ fontFamily: avios.fontSans, fontSize: s.unit, color: avios.ink500 }}>{unitText}</span>
      )}
    </span>
  )
}
