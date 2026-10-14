import type { Metadata, Viewport } from 'next'
import { Fraunces } from 'next/font/google'
import { BRAND, SITE_URL, SUPABASE_STORAGE_ORIGIN } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { AnalyticsScript } from '@/components/AnalyticsScript'
import { GoogleAnalyticsScript } from '@/components/GoogleAnalyticsScript'
import { AttributionCapture } from '@/components/AttributionCapture'
import './globals.css'

// Layout raíz: sólo <html>, <body>, fuentes, metadatos y analítica.
//
// La navegación, el pie y el carrito NO viven acá: viven en el grupo de rutas
// `(tienda)`. Es la única forma en App Router de que el panel tenga su propio
// marco: el layout raíz envuelve TODO, así que si el header está acá, el panel
// también lo hereda — y un panel de administración con la barra de promo de la
// tienda arriba se lee como un error.

export const viewport: Viewport = {
  themeColor: '#CA1A4B',
  colorScheme: 'light',
}

// Fuentes: lo que más pesaba de la primera visita (114 KB, una cuarta parte).
//
// - Fraunces, la de los títulos, se usa en un solo peso (400). Bajaba la
//   variable entera con el eje óptico: 67 KB. En un solo peso es una fracción,
//   y la marca se sigue viendo igual en cada título.
// - El texto corrido usa la fuente del sistema (San Francisco en iPhone,
//   Roboto en Android, Segoe en Windows): cero bytes, se lee perfecto a
//   cualquier tamaño, y es la que el teléfono ya muestra en todo lo demás.
//   Inter pesaba 48 KB para verse casi igual. Ver --font-sans en globals.css.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${BRAND.name}`,
    default: 'Mercería Avíos — mercería por mayor y por menor en Montevideo',
  },
  description:
    'Cintas, hilos, cordones, tul y herramientas de costura en San José 851 esq. Andes, Montevideo. Venta por mayor y por menor con precio a la vista. Envíos a todo Uruguay.',
  keywords: [
    'mercería montevideo',
    'mercería mayorista uruguay',
    'cintas de raso por mayor',
    'hilo encerado',
    'insumos de costura',
    'cordones',
  ],
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  category: 'shopping',
  // Evita que iOS convierta medidas y precios en enlaces de teléfono.
  formatDetection: { telephone: false, address: false, email: false },
  alternates: { canonical: '/' },
  openGraph: {
    ...OG_BASE,
    url: SITE_URL,
    title: 'Mercería Avíos — por mayor y por menor',
    description: 'Cintas, hilos, cordones y herramientas de costura. San José 851, Montevideo.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercería Avíos — por mayor y por menor',
    description: 'Cintas, hilos, cordones y herramientas de costura. San José 851, Montevideo.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

/**
 * Store + LocalBusiness: para un negocio con local a la calle, esto es lo que
 * arma el panel de Google con dirección, horario y botón de "cómo llegar". El
 * clon publicaba un `Organization` genérico, con el horario equivocado y la
 * descripción "Mercería de mercería en Montevideo".
 */
const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['Store', 'LocalBusiness'],
  name: BRAND.name,
  alternateName: ['Avíos', 'Mercería Avíos Montevideo'],
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/web-app-manifest-512x512.png`,
    width: 512,
    height: 512,
  },
  image: `${SITE_URL}/web-app-manifest-512x512.png`,
  description:
    'Mercería en el centro de Montevideo. Cintas, hilos, cordones, tul y herramientas de costura, por mayor y por menor.',
  telephone: BRAND.phoneE164,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BRAND.street,
    addressLocality: BRAND.city,
    addressCountry: BRAND.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: BRAND.geo.lat, longitude: BRAND.geo.lng },
  openingHoursSpecification: BRAND.hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days,
    opens: h.opens,
    closes: h.closes,
  })),
  sameAs: [BRAND.instagramUrl],
  areaServed: { '@type': 'Country', name: 'Uruguay' },
  currenciesAccepted: 'UYU',
  paymentAccepted: 'Efectivo, Transferencia bancaria',
  priceRange: '$$',
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BRAND.name,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tienda?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-UY" className={fraunces.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Juego de favicons generado con RealFaviconGenerator a partir del
            logo real. Son archivos estáticos de /public y no las convenciones
            de archivo de Next, para que exista un /favicon.ico estable que
            Google y los navegadores puedan cachear.

            Sin el favicon.svg: era el logo en PNG metido dentro de un SVG, 31 KB
            que bajaba cada primera visita, más el .ico, que el navegador pedía
            igual. Los PNG con paleta reducida pesan 0,5 y 2 KB y se ven igual.
            /favicon.ico sigue existiendo para quien lo pida directo. */}
        <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Avíos" />
        <link rel="manifest" href="/site.webmanifest" />
        {SUPABASE_STORAGE_ORIGIN && <link rel="preconnect" href={SUPABASE_STORAGE_ORIGIN} />}
      </head>
      <body>
        {children}
        <AttributionCapture />
        <AnalyticsScript />
        <GoogleAnalyticsScript />
      </body>
    </html>
  )
}
