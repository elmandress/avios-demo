// Base Open Graph compartida. Gotcha de Next.js: cuando una página define su
// propio `openGraph`, el objeto del layout se REEMPLAZA entero — no hay
// deep-merge. Sin este spread, cada página perdía og:site_name y og:locale
// (detectado con OpenGraph Inspector). Toda página que declare `openGraph`
// debe empezar con `...OG_BASE`.
//
// También la imagen por defecto: una página que declara su propio `openGraph`
// pierde la tarjeta de la raíz (opengraph-image.tsx), y /tienda, /contacto,
// /mayorista y /lista-de-precios se compartían SIN foto. En una mercería que
// vende por WhatsApp, el link del catálogo pegado en un chat es la vidriera.
// Las fichas la reemplazan con la foto del producto.
export const OG_BASE: {
  siteName: string
  locale: string
  type: 'website'
  images: Array<{ url: string; width: number; height: number; alt: string }>
} = {
  siteName: 'Mercería Avíos',
  locale: 'es_UY',
  type: 'website',
  images: [
    {
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Mercería Avíos — mercería por mayor y por menor en Montevideo',
    },
  ],
}
