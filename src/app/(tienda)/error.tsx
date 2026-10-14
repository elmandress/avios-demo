'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BRAND } from '@/lib/env'
import { avios } from '@/components/ui/tokens'
import { Button, Icon } from '@/components/ui/Primitives'

// Qué se ve cuando algo se rompe.
//
// Sin este archivo, un error de JavaScript en el cliente deja **la pantalla en
// blanco**: el visitante no ve nada, no entiende qué pasó y se va. Para una
// tienda que vive de que la gente llegue desde Instagram, eso es una venta
// perdida y, peor, alguien que no vuelve.
//
// Con esto, el peor caso sigue teniendo salida: el teléfono del local está a un
// toque. Una mercería vendía por WhatsApp mucho antes de tener sitio; si el
// sitio falla, el camino viejo sigue abierto.
//
// La causa técnica NO se muestra: al comprador no le dice nada y puede filtrar
// detalles internos. Va a la consola, que es donde sirve.

export default function ErrorTienda({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error en la tienda:', error)
  }, [error])

  return (
    <div className="error-page">
      <span className="error-page-icon" aria-hidden>
        <Icon name="warning" size={26} />
      </span>

      <h1>Se nos rompió algo</h1>
      <p>
        No es culpa tuya. Podés reintentar, y si sigue fallando escribinos por WhatsApp: te tomamos
        el pedido por ahí, como siempre.
      </p>

      <div className="error-page-actions">
        <Button variant="primary" size="lg" onClick={reset}>
          Reintentar
        </Button>
        <Button variant="whatsapp" size="lg" href={BRAND.whatsappUrl}>
          <Icon name="whatsapp-logo" weight="fill" size={19} /> Escribinos
        </Button>
      </div>

      <p className="error-page-extra">
        O volvé al <Link href="/">inicio</Link> o al{' '}
        <Link href="/tienda">catálogo</Link>. El local está en {BRAND.street}, de lunes a sábado.
      </p>

      {/* El digest es lo único que sirve para rastrear el fallo en los registros
          del servidor, y no revela nada del código. */}
      {error.digest && (
        <p className="error-page-digest" style={{ color: avios.ink300 }}>
          Referencia: {error.digest}
        </p>
      )}
    </div>
  )
}
