// Embudo de conversión — capa fina sobre Umami. `track()` no hace nada hasta
// que existan las env vars (hoy no hay cuenta creada); cuando se activen,
// los 4 puntos de instrumentación ya wireados en el código empiezan a
// mandar eventos sin tocar nada más. Ver database/ y CLAUDE.md para el
// resto de las convenciones del proyecto.
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
const SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL

export const ANALYTICS_ENABLED = Boolean(WEBSITE_ID && SCRIPT_URL)
export const ANALYTICS_SCRIPT_URL = SCRIPT_URL
export const ANALYTICS_WEBSITE_ID = WEBSITE_ID

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void }
    gtag?: (...args: unknown[]) => void
  }
}

// Un solo punto de instrumentación para las dos herramientas: cada track()
// ya wireado en el código (add_to_cart, order_sent, product_view, etc.) le
// llega tanto a Umami como a GA4 sin tocar los componentes que lo llaman.
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.umami?.track(event, props)
  window.gtag?.('event', event, props)
}
