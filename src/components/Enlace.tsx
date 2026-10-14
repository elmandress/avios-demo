'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

/**
 * Un <Link> que precarga por intención, no por aparecer en pantalla.
 *
 * Por defecto Next precarga cada enlace que entra en pantalla, y en Next 16
 * cada precarga son 5 a 7 pedidos al servidor. Con el menú, el pie y las
 * categorías a la vista, eran unos 30 pedidos por página vista que casi nadie
 * usa — y en Netlify cada pedido cuesta créditos (2 cada 10.000). Con miles de
 * visitas por mes, la precarga sola se comía un tercio del plan gratis.
 *
 * Así se precarga sólo el destino que el mouse o el dedo están por tocar. La
 * navegación sigue siendo instantánea donde importa.
 */
export function Enlace({
  href,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'prefetch' | 'href'> & { href: string }) {
  const router = useRouter()
  const precargar = () => {
    // Sólo rutas internas: un wa.me o un mailto no se precargan.
    if (href.startsWith('/')) router.prefetch(href)
  }
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        precargar()
        onMouseEnter?.(e)
      }}
      onTouchStart={(e) => {
        precargar()
        onTouchStart?.(e)
      }}
      onFocus={(e) => {
        precargar()
        onFocus?.(e)
      }}
      {...rest}
    />
  )
}
