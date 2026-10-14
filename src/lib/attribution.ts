// De dónde vino la visita que terminó en un pedido — captado una sola vez
// por sesión de navegador (sessionStorage), sin depender de ningún script de
// analytics de terceros, así que no lo pierden los ad-blockers. Se manda
// junto con el pedido en /api/orders para que /admin/pedidos muestre el
// canal real de cada venta, no solo de las visitas que un script pudo medir.
const STORAGE_KEY = 'avios.attribution.v1'

export interface Attribution {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer_host: string | null
}

function readStored(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Attribution) : null
  } catch {
    return null
  }
}

// Llamar una vez al cargar la app (ver AttributionCapture.tsx). Si la URL
// trae utm_source, siempre pisa lo guardado (la visita más reciente manda).
// Si no, solo completa si todavía no hay nada guardado en esta sesión.
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')

  if (!utmSource && readStored()) return

  let referrerHost: string | null = null
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : null
  } catch {
    referrerHost = null
  }
  // Un referrer del propio dominio (navegación interna) no es una fuente.
  if (referrerHost && referrerHost === window.location.hostname) referrerHost = null

  // /ig existe SOLO para ser el link de la bio de Instagram (ver app/ig), así
  // que quien entra por ahí viene de Instagram por definición. Damos eso por
  // sentado cuando no vienen UTM en la URL: el link de la bio puede ser
  // simplemente "avios.uy/ig", corto y prolijo, en vez de arrastrar
  // "?utm_source=instagram&utm_medium=bio" a la vista de todo el mundo.
  // Un UTM explícito en la URL siempre gana (sirve para distinguir un reel
  // puntual de la bio, p. ej. ?utm_medium=reel-poncho).
  const esLandingDeInstagram = window.location.pathname.replace(/\/+$/, '') === '/ig'
  const attribution: Attribution = {
    utm_source: utmSource ?? (esLandingDeInstagram ? 'instagram' : null),
    utm_medium: params.get('utm_medium') ?? (esLandingDeInstagram ? 'bio' : null),
    utm_campaign: params.get('utm_campaign'),
    referrer_host: referrerHost,
  }
  if (!attribution.utm_source && !attribution.referrer_host) return

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    /* sessionStorage no disponible (privado/bloqueado) — no es crítico */
  }
}

export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null
  return readStored()
}

// Etiqueta corta y humana para mostrar en /admin/pedidos.
export function channelLabel(a: Pick<Attribution, 'utm_source' | 'referrer_host'> | null): string {
  const raw = (a?.utm_source || a?.referrer_host || '').toLowerCase()
  if (!raw) return 'Directo'
  if (raw.includes('instagram')) return 'Instagram'
  if (raw.includes('facebook') || raw.includes('fb.')) return 'Facebook'
  if (raw.includes('whatsapp')) return 'WhatsApp'
  if (raw.includes('tiktok')) return 'TikTok'
  if (raw.includes('google')) return 'Google'
  if (raw.includes('pinterest')) return 'Pinterest'
  return a?.utm_source || a?.referrer_host || 'Directo'
}
