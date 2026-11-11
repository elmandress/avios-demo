'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'
import { leerConsulta, leerConsultaServidor, suscribirConsulta } from '@/lib/consulta'

/**
 * Burbuja de WhatsApp fija en la esquina.
 *
 * Se esconde al bajar y vuelve al subir, para no taparle el pulgar al botón de
 * "Agregar al pedido" de la ficha, que en el teléfono queda justo debajo.
 *
 * `enabled` y `waUrl` vienen del layout, que ya leyó los settings en el
 * servidor: así no hay una segunda consulta desde el navegador en cada página.
 */
export function WhatsAppFloat({ enabled, waUrl }: { enabled: boolean; waUrl: string }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  // En la ficha, el artículo y la variante elegida (ver lib/consulta.ts).
  const consulta = useSyncExternalStore(suscribirConsulta, leerConsulta, leerConsultaServidor)
  const lastYRef = useRef(0)

  // Use a ref for lastY so the scroll handler is stable (registered once, not
  // re-added on every scroll tick as it was when lastY lived in state).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 200 || y < lastYRef.current) {
        setVisible(true)
      } else if (y > lastYRef.current + 8) {
        setVisible(false)
      }
      lastYRef.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // No aparece donde ya hay un botón de acción propio compitiendo por el pulgar:
  // el carrito termina en "Enviar el pedido", y la lista de precios en "Preguntar
  // por WhatsApp". Dos burbujas verdes en la misma pantalla se leen como error.
  if (
    pathname.startsWith('/panel') ||
    pathname.startsWith('/tienda') ||
    pathname.startsWith('/carrito') ||
    pathname.startsWith('/lista-de-precios')
  ) return null

  if (!enabled) return null

  // Only allow known-safe WhatsApp domains to prevent open redirect if the
  // admin accidentally pastes a non-WA URL into site_settings.
  const safeWa = waUrl.startsWith('https://wa.me/') || waUrl.startsWith('https://api.whatsapp.com/')
  if (!safeWa) return null

  // El texto con el que se abre WhatsApp. Era un resto del clon: decía
  // "Estoy en el sitio de Dahila Crochet", o sea que el botón más visible del
  // sitio mandaba el nombre de otro negocio al WhatsApp de Alejandra.
  //
  // El emoji también se fue: no es la voz de mostrador de Avíos, y en el
  // teclado de WhatsApp la primera impresión es el mensaje ya escrito.
  const message = encodeURIComponent(consulta ?? 'Hola! Estoy viendo el sitio y tengo una consulta.')
  const href = `${waUrl.replace(/\/$/, '')}?text=${message}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className="wa-float"
      onClick={() => track('whatsapp_click', { source: 'float' })}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 24,
        // Mismo escalón que los otros botones flotantes de esquina
        // (BackToTop/WeaverCallout=40-45) — no arriba de drawers/modales
        // (90-200) ni de la barra sticky del PDP en mobile (45), que si no
        // queda tapada por esta burbuja justo donde está "Agregar".
        zIndex: 40,
        width: 52,
        height: 52,
        borderRadius: 999,
        background: '#25D366',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.38)',
        textDecoration: 'none',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.9)',
        opacity: visible ? 1 : 0,
        transition: 'transform 260ms cubic-bezier(0.34,1.56,0.64,1), opacity 220ms ease',
        willChange: 'transform',
      }}
    >
      {/* WhatsApp SVG — inline, no external request */}
      <svg width="26" height="26" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.818 6.51L4 29l7.697-1.79A11.94 11.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm5.93 16.71c-.25.7-1.47 1.37-2.01 1.42-.54.05-1.05.24-3.54-.73-2.98-1.15-4.88-4.18-5.03-4.37-.15-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.17 1.03-2.46.27-.29.59-.36.79-.36l.57.01c.18 0 .43-.07.67.51.25.6.85 2.06.92 2.21.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.14.14-.29.29-.12.58.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.39-.24.66-.14.27.1 1.7.8 1.99.94.29.14.49.21.56.33.07.12.07.7-.18 1.4z"/>
      </svg>
    </a>
  )
}
