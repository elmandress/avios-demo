'use client'

import Script from 'next/script'

// Google Analytics 4 (gtag.js). Inerte hasta que exista
// NEXT_PUBLIC_GA_MEASUREMENT_ID en Netlify; al setearla, next.config.ts agrega
// solo los hosts de Google a la CSP (script-src/connect-src) en el mismo build.
// Los 15 eventos ya instrumentados con track() (src/lib/analytics.ts) llegan
// acá solos — no hace falta tocar los componentes que ya llaman track().
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalyticsScript() {
  if (!GA_MEASUREMENT_ID) return null
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)});`}
      </Script>
    </>
  )
}
