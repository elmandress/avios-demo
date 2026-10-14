// Base Open Graph compartida. Gotcha de Next.js: cuando una página define su
// propio `openGraph`, el objeto del layout se REEMPLAZA entero — no hay
// deep-merge. Sin este spread, cada página perdía og:site_name y og:locale
// (detectado con OpenGraph Inspector). Toda página que declare `openGraph`
// debe empezar con `...OG_BASE`.
export const OG_BASE = {
  siteName: 'Mercería Avíos',
  locale: 'es_UY',
  type: 'website',
} as const
