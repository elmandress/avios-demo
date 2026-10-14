import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

// ─── Content Security Policy ─────────────────────────────────────────────────
//
// En producción se cae 'unsafe-eval'. 'unsafe-inline' en estilos se mantiene
// porque Next emite atributos `style` que un nonce no cubre, y este sitio usa
// estilos en línea a propósito (ver el sistema de diseño en Primitives.tsx).
//
// Las fuentes las auto-hostea next/font y los íconos son SVG en línea, así que
// no hace falta abrir fonts.googleapis.com ni ningún CDN de íconos.
//
// Analítica: los hosts de GA4 entran a la CSP AUTOMÁTICAMENTE cuando su env var
// existe en el build — setearla y redeployar alcanza. Sin variable, la CSP queda
// igual de cerrada. Umami NO entra acá: se proxea por /stats (ver rewrites) para
// que el navegador lo vea como same-origin, porque cloud.umami.is está en varias
// listas de bloqueo y lo tumbarían los ad-blockers y el ITP de Safari.
const umamiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
      ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
      : ''
  } catch {
    return ''
  }
})()

const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
const analyticsScriptSrc = gaEnabled ? ' https://www.googletagmanager.com' : ''
const analyticsConnectSrc = gaEnabled
  ? ' https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com'
  : ''

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}${analyticsScriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co${analyticsConnectSrc};
  frame-src https://www.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Next bloquea las peticiones de origen cruzado a los recursos de DESARROLLO,
  // y el bloqueo es silencioso: la página se ve entera porque el HTML viene del
  // servidor, pero React nunca hidrata y nada responde al clic.
  //
  // Sin esto, abrir el sitio en desarrollo por 127.0.0.1 en vez de localhost da
  // una página que parece correcta y está muerta. Cuesta un rato darse cuenta.
  // Sólo afecta a `next dev`; en producción no aplica.
  allowedDevOrigins: ['127.0.0.1', '0.0.0.0'],
  experimental: {
    // Sólo se importa lo que se usa de los paquetes grandes. Supabase queda
    // acá aunque la demo no lo use: el día que se conecte la base, ya está.
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr'],
  },
  images: {
    // TTL del optimizador. Next 16 usa el MAYOR entre esto y el Cache-Control
    // del origen, así que esto es un piso: una foto vieja en Supabase Storage
    // con cache-control corto igual se cachea un año del lado del optimizador.
    // Es seguro por construcción: los nombres de archivo llevan sufijo
    // aleatorio y no se sobrescriben, así que una URL cacheada nunca cambia de
    // contenido y no hay nada que invalidar.
    minimumCacheTTL: 31_536_000,
    // Next 16 exige declarar los niveles de calidad que usa la prop `quality`.
    // 82 tarjetas · 90 ficha · 100 lightbox.
    qualities: [82, 90, 100],
    // Un solo formato y pocos anchos. Cada formato y cada ancho es una versión
    // más de cada foto, y cada versión que el optimizador no tiene en caché lo
    // obliga a bajar el ORIGINAL de donde esté guardado. Netlify vacía ese
    // caché en cada deploy, así que la cuenta se paga de nuevo en cada
    // publicación. Es exactamente lo que agotó los 5 GB gratis de Supabase en
    // Dahila (20/09/2026): con 2 formatos y 15 anchos eran hasta 30 versiones
    // por foto; así son 6. Con miles de artículos, esa diferencia es la cuenta.
    // WebP solo: medido en Dahila, Netlify servía WebP aunque se pidiera AVIF.
    formats: ['image/webp'],
    // 420/640 tarjetas (2 por fila en teléfono), 828 galería a pantalla
    // completa, 1200 lightbox y bots (botImageUrl usa 640 y 1200: no sacarlos).
    deviceSizes: [420, 640, 828, 1200],
    // Miniaturas del carrito, el panel y la galería (44–120 px en pantalla).
    imageSizes: [96, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    if (!umamiOrigin) return []
    return [
      { source: '/stats/script.js', destination: `${umamiOrigin}/script.js` },
      { source: '/stats/api/send', destination: `${umamiOrigin}/api/send` },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim(),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
