'use client'

import type { Product, SaleFormat, Variant } from '@/lib/catalog/types'
import { UNIT_NOUN } from '@/lib/catalog/types'
import {
  applyDiscount,
  formatContent,
  formatUYU,
  formatUnitPrice,
  savingsPercent,
} from '@/lib/catalog/pricing'
import { avios, Badge } from './ui/Primitives'

// Selector de presentación — el "quantity break" de esta tienda.
//
// La investigación del rubro coincide en tres cosas para vender por mayor sin
// login: precio a la vista, el contenido de la caja/pieza explícito, y el ahorro
// calculado por vos, no por el comprador. Las tres van en esta tarjeta.
//
// Decisión de fondo: las presentaciones son TARJETAS visibles y no un desplegable.
// Un desplegable esconde justamente el argumento de venta — que existe un precio
// por mayor. Acá el mayorista lo ve sin buscarlo, y el minorista ve que la
// opción de arriba es la suya y sigue de largo.

function unitSuffix(format: SaleFormat): string {
  if (format.unit === 'u') return ''
  const noun = UNIT_NOUN[format.unit]
  return (format.contentQty ?? 1) === 1 ? `${noun.article} ${noun.singular}` : ''
}

export function FormatSelector({
  variant,
  selectedId,
  onSelect,
  discountPercent,
}: {
  variant: Variant
  selectedId: string
  onSelect: (formatId: string) => void
  discountPercent: number
}) {
  const formats = variant.formats.filter((f) => f.available)
  if (formats.length === 0) return null

  // Una sola presentación: no hay nada que elegir, y una tarjeta "seleccionable"
  // con una sola opción es ruido. El precio lo muestra el bloque de compra.
  if (formats.length === 1) return null

  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      <legend
        style={{
          fontFamily: avios.fontSans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: avios.ink500,
          padding: 0,
          marginBottom: 9,
        }}
      >
        Cómo lo llevás
      </legend>

      <div style={{ display: 'grid', gap: 8 }}>
        {formats.map((format) => {
          const selected = format.id === selectedId
          const saving = savingsPercent(format, variant)
          const finalPrice =
            format.priceUyu === null ? null : applyDiscount(format.priceUyu, discountPercent)
          const finalUnit = applyDiscount(format.unitPriceUyu, discountPercent)
          const showsUnitPrice = (format.contentQty ?? 1) > 1

          return (
            <button
              key={format.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(format.id)}
              style={{
                display: 'grid',
                // minmax(0, 1fr) y no 1fr: la columna de la izquierda tiene que
                // poder achicarse por debajo de su contenido, porque la de la
                // derecha (el precio) es nowrap y no cede. Con 1fr, en 390px la
                // tarjeta se salía de la pantalla.
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                width: '100%',
                padding: '13px 15px',
                borderRadius: 10,
                cursor: 'pointer',
                background: selected ? avios.brand50 : '#fff',
                border: `1.5px solid ${selected ? avios.brand600 : avios.ink100}`,
                // El anillo exterior evita que la tarjeta "salte" 1px al
                // seleccionarse por el cambio de grosor del borde.
                boxShadow: selected ? `0 0 0 1px ${avios.brand600}` : 'none',
                transition: `all 140ms ${avios.ease}`,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: avios.fontSans,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      color: format.tier === 'mayor' ? avios.saving700 : avios.ink500,
                    }}
                  >
                    {format.tier === 'mayor' ? 'Por mayor' : 'Por menor'}
                  </span>
                  {saving !== null && <Badge tone="saving">Ahorrás {saving}%</Badge>}
                </span>
                <span
                  style={{
                    fontFamily: avios.fontSans,
                    fontSize: 15,
                    fontWeight: 500,
                    color: avios.ink900,
                  }}
                >
                  {format.label}
                </span>
                {showsUnitPrice && (
                  <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                    {formatUnitPrice(finalUnit, format.unit)}
                  </span>
                )}
              </span>

              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {finalPrice === null ? (
                  // Presentación sin total publicado: mostramos el precio por
                  // unidad, que sí sabemos, y decimos qué falta. Inventar el
                  // total de la pieza sería inventar una medida que no tenemos.
                  <>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: avios.fontSans,
                        fontSize: 18,
                        fontWeight: 600,
                        color: avios.ink900,
                      }}
                    >
                      {formatUYU(finalUnit)}
                    </span>
                    <span style={{ fontFamily: avios.fontSans, fontSize: 12, color: avios.ink500 }}>
                      {UNIT_NOUN[format.unit].article} {UNIT_NOUN[format.unit].singular} · medida a
                      confirmar
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: avios.fontSans,
                        fontSize: 20,
                        fontWeight: 600,
                        color: discountPercent > 0 ? avios.sale : avios.ink900,
                      }}
                    >
                      {formatUYU(finalPrice)}
                    </span>
                    {discountPercent > 0 && (
                      <span
                        style={{
                          fontFamily: avios.fontSans,
                          fontSize: 12.5,
                          color: avios.ink500,
                          textDecoration: 'line-through',
                        }}
                      >
                        {formatUYU(format.priceUyu ?? 0)}
                      </span>
                    )}
                    {!showsUnitPrice && unitSuffix(format) && (
                      <span
                        style={{ display: 'block', fontFamily: avios.fontSans, fontSize: 12, color: avios.ink500 }}
                      >
                        {unitSuffix(format)}
                      </span>
                    )}
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

// ─── Tabla completa de precios ───────────────────────────────────────────────

/**
 * Todas las variantes × todas las presentaciones, de un vistazo.
 *
 * Es lo que un comprador mayorista pide primero y lo que en Avíos hoy vive en un
 * catálogo en papel: la lista de precios completa. Con siete anchos de cinta,
 * hacer clic variante por variante para comparar es exactamente el trabajo que
 * un sitio tiene que ahorrarle.
 */
export function PriceMatrix({
  product,
  discountPercent,
}: {
  product: Product
  discountPercent: number
}) {
  const variants = product.variants.filter((v) => v.label && v.formats.length > 0)
  if (variants.length < 2) return null

  // Columnas: una por "carril" de precio. Casi siempre son dos (menor y mayor),
  // pero se derivan de los datos para no romperse con un producto de tres.
  const tiers = ['menor', 'mayor'] as const
  const activeTiers = tiers.filter((t) => variants.some((v) => v.formats.some((f) => f.tier === t)))

  return (
    // `.scroll-x` pinta las sombras que avisan que la tabla sigue hacia el
    // costado. El fondo se pasa por variable porque acá la tabla se apoya en
    // paper-50 y no en blanco.
    <div className="scroll-x" style={{ ['--white' as string]: 'var(--paper-50)' }}>
      <table
        style={{
          width: '100%',
          // 300 y no 420: con 420 la columna "por mayor" —el argumento de venta
          // de la tabla— quedaba fuera de pantalla en un teléfono, detrás del
          // scroll lateral. Tres columnas entran en 300 px.
          minWidth: 300,
          borderCollapse: 'collapse',
          fontFamily: avios.fontSans,
          fontSize: 14,
        }}
      >
        <caption
          style={{
            captionSide: 'top',
            textAlign: 'left',
            fontSize: 13,
            color: avios.ink500,
            paddingBottom: 10,
          }}
        >
          Precios por ancho. El de mayor es el total de la pieza cerrada.
        </caption>
        <thead>
          <tr style={{ borderBottom: `1px solid ${avios.ink300}` }}>
            <th scope="col" style={thStyle}>
              {product.variants[0]?.axis === 'ancho' ? 'Ancho' : 'Variante'}
            </th>
            {activeTiers.map((t) => (
              <th key={t} scope="col" style={{ ...thStyle, textAlign: 'right' }}>
                {t === 'menor' ? 'Por menor' : 'Por mayor'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.id} style={{ borderBottom: `1px solid ${avios.ink100}` }}>
              <th scope="row" style={{ ...tdStyle, fontWeight: 500, textAlign: 'left' }}>
                {variant.label}
              </th>
              {activeTiers.map((tier) => {
                const format = variant.formats.find((f) => f.tier === tier)
                if (!format) {
                  return (
                    // ink500 y no ink300: el guión dice "este ancho no se
                    // vende así", que es información, y en ink300 no se lee.
                    <td key={tier} style={{ ...tdStyle, textAlign: 'right', color: avios.ink500 }}>
                      —
                    </td>
                  )
                }
                const finalUnit = applyDiscount(format.unitPriceUyu, discountPercent)
                const finalTotal =
                  format.priceUyu === null ? null : applyDiscount(format.priceUyu, discountPercent)
                return (
                  <td key={tier} style={{ ...tdStyle, textAlign: 'right' }}>
                    <span style={{ display: 'block', fontWeight: 600, color: avios.ink900 }}>
                      {finalTotal === null ? formatUnitPrice(finalUnit, format.unit) : formatUYU(finalTotal)}
                    </span>
                    <span style={{ fontSize: 12, color: tier === 'mayor' ? avios.saving700 : avios.ink500 }}>
                      {format.contentQty !== null && format.contentQty > 1
                        ? `${formatContent(format.contentQty, format.unit)} · ${formatUnitPrice(finalUnit, format.unit)}`
                        : format.label}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '9px 12px 9px 0',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: avios.ink500,
}

const tdStyle: React.CSSProperties = {
  padding: '11px 12px 11px 0',
  verticalAlign: 'top',
  color: avios.ink700,
}
