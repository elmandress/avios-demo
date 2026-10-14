'use client'

import { useId } from 'react'
import { MAX_QTY_PER_LINE } from '@/lib/cart/types'
import { avios, Icon } from './ui/Primitives'

/**
 * Selector de cantidad.
 *
 * `unitLabel` dice de QUÉ es la cantidad, y eso acá no es un detalle: "3" puede
 * ser tres metros o tres piezas de 100 m. El clon usaba un stepper mudo porque
 * en una tienda de prendas la unidad siempre es "una prenda"; en una mercería no
 * decirlo es la diferencia entre un pedido de $ 39 y uno de $ 1.188.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY_PER_LINE,
  unitLabel,
  size = 'md',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  /** "metros", "piezas", "unidades". */
  unitLabel?: string
  size?: 'sm' | 'md'
}) {
  const inputId = useId()
  const dim = size === 'sm' ? 34 : 44
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {unitLabel && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: avios.fontSans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: avios.ink500,
          }}
        >
          Cantidad · {unitLabel}
        </label>
      )}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: `1px solid ${avios.borderStrong}`,
          borderRadius: 9,
          overflow: 'hidden',
          width: 'fit-content',
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label="Quitar uno"
          style={stepButton(dim, value <= min)}
        >
          <Icon name="minus" size={15} />
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10)
            // Un input vacío o no numérico vuelve al mínimo en vez de propagar
            // NaN al carrito, que dejaría el total en "$ NaN".
            onChange(Number.isFinite(parsed) ? clamp(parsed) : min)
          }}
          aria-label={unitLabel ? `Cantidad en ${unitLabel}` : 'Cantidad'}
          style={{
            width: 58,
            height: dim,
            textAlign: 'center',
            border: 'none',
            borderLeft: `1px solid ${avios.ink100}`,
            borderRight: `1px solid ${avios.ink100}`,
            fontFamily: avios.fontSans,
            fontSize: 15,
            fontWeight: 600,
            color: avios.ink900,
            background: '#fff',
            // Las flechitas nativas de number chocan con nuestros botones.
            MozAppearance: 'textfield',
            appearance: 'textfield',
          }}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label="Agregar uno"
          style={stepButton(dim, value >= max)}
        >
          <Icon name="plus" size={15} />
        </button>
      </div>
    </div>
  )
}

function stepButton(dim: number, disabled: boolean): React.CSSProperties {
  return {
    width: dim,
    height: dim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? avios.ink300 : avios.ink900,
  }
}
