'use client'

import type { WholesaleUpgrade } from '@/lib/catalog/pricing'
import { formatContent, formatUYU, formatUnitPrice } from '@/lib/catalog/pricing'
import { UNIT_NOUN } from '@/lib/catalog/types'
import { Icon } from './ui/Primitives'

// El aviso de "te conviene la pieza cerrada".
//
// Es la señal comercial más fuerte que permite este modelo de datos, y no la
// puede dar una tienda que trate el mayoreo como un tipo de cliente: hace falta
// saber cuánto trae la pieza para compararla contra lo que el comprador está por
// llevar suelto. Con la cinta de raso el cruce cae en 31 metros — de ahí para
// arriba, la pieza entera de 100 m cuesta MENOS que los metros sueltos.
//
// Dos tonos, porque son dos situaciones distintas:
//   · ya conviene  → afirmación, con el ahorro en pesos;
//   · falta poco   → invitación, con lo que hay que agregar.
//
// Nunca se muestra si el salto queda lejos (ver MAX_STRETCH en pricing.ts): un
// cartel que empuja a gastar el triple no ayuda a nadie y quema la confianza en
// el resto de los avisos.

export function UpgradeHint({
  upgrade,
  onSwitch,
  compact = false,
}: {
  upgrade: WholesaleUpgrade
  /** Cambia la selección a la presentación por mayor. */
  onSwitch?: () => void
  /** Versión de una línea, para el carrito. */
  compact?: boolean
}) {
  const {
    format,
    packs,
    spendNowUyu,
    spendUpgradedUyu,
    contentNow,
    contentUpgraded,
    unitNowUyu,
    unitUpgradedUyu,
    alreadyCheaper,
    extraToPayUyu,
  } = upgrade

  const packLabel =
    packs === 1
      ? `la pieza de ${formatContent(format.contentQty ?? 0, format.unit)}`
      : `${packs} piezas de ${formatContent(format.contentQty ?? 0, format.unit)}`

  if (compact) {
    return (
      <p className="upgrade-hint upgrade-hint-compact" data-tone={alreadyCheaper ? 'gana' : 'cerca'}>
        <Icon name="stack" size={15} />
        <span>
          {alreadyCheaper ? (
            <>
              Llevando {packLabel} pagás{' '}
              <strong>{formatUYU(spendNowUyu - spendUpgradedUyu)} menos</strong> y te llevás{' '}
              {formatContent(contentUpgraded - contentNow, format.unit)} más.
            </>
          ) : (
            <>
              Por <strong>{formatUYU(extraToPayUyu)} más</strong> te llevás {packLabel} y el precio
              baja a {formatUnitPrice(unitUpgradedUyu, format.unit)}.
            </>
          )}
        </span>
      </p>
    )
  }

  return (
    <div className="upgrade-hint" data-tone={alreadyCheaper ? 'gana' : 'cerca'} role="note">
      <span className="upgrade-hint-icon" aria-hidden>
        <Icon name="stack" size={18} />
      </span>

      <div className="upgrade-hint-body">
        <strong>
          {alreadyCheaper ? 'Te conviene la pieza cerrada' : 'Estás cerca del precio por mayor'}
        </strong>

        <p>
          {alreadyCheaper ? (
            <>
              {formatContent(contentNow, format.unit)} sueltos te salen{' '}
              {formatUYU(spendNowUyu)}. {packs === 1 ? 'La pieza entera' : `${packs} piezas`} de{' '}
              {formatContent(format.contentQty ?? 0, format.unit)}{' '}
              {packs === 1 ? 'sale' : 'salen'} {formatUYU(spendUpgradedUyu)} — te llevás{' '}
              {formatContent(contentUpgraded - contentNow, format.unit)} más y pagás{' '}
              <strong>{formatUYU(spendNowUyu - spendUpgradedUyu)} menos</strong>.
            </>
          ) : (
            <>
              Agregando {formatUYU(extraToPayUyu)} te llevás {packLabel} completa y el{' '}
              {UNIT_NOUN[format.unit].singular} pasa de {formatUYU(unitNowUyu)} a{' '}
              <strong>{formatUYU(unitUpgradedUyu)}</strong>.
            </>
          )}
        </p>

        {onSwitch && (
          <button type="button" onClick={onSwitch}>
            {alreadyCheaper ? 'Cambiar a la pieza' : 'Ver la pieza'}
            <Icon name="arrow-right" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
