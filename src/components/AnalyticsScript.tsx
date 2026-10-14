'use client'

import Script from 'next/script'
import { ANALYTICS_ENABLED, ANALYTICS_WEBSITE_ID } from '@/lib/analytics'

// Renders nothing until NEXT_PUBLIC_UMAMI_WEBSITE_ID/SCRIPT_URL exist — see
// src/lib/analytics.ts. Activar analytics es solo setear esas 2 env vars en
// Netlify, no requiere tocar código.
// Se carga por /stats (proxeado a cloud.umami.is vía rewrites en
// next.config.ts), NO por el dominio externo directo — así el navegador lo
// ve same-origin y no lo bloquea como tracker de terceros. data-host-url le
// dice al script que también mande los eventos por /stats/api/send.
export function AnalyticsScript() {
  if (!ANALYTICS_ENABLED) return null
  return (
    <Script
      src="/stats/script.js"
      data-website-id={ANALYTICS_WEBSITE_ID}
      data-host-url="/stats"
      strategy="afterInteractive"
    />
  )
}
