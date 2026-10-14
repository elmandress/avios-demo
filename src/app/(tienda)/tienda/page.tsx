import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { summarisePrice } from '@/lib/catalog/pricing'
import { SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { TiendaClient } from './TiendaClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Catálogo — cintas, hilos, cordones y herramientas',
  description:
    'Catálogo completo de Mercería Avíos: cintas de raso y gross, hilos, cordones, tul y herramientas de costura. Precio por menor y por mayor a la vista. Envíos a todo Uruguay.',
  alternates: { canonical: '/tienda' },
  openGraph: {
    ...OG_BASE,
    title: 'Catálogo de Mercería Avíos',
    description: 'Cintas, hilos, cordones y herramientas de costura. Por mayor y por menor.',
    url: `${SITE_URL}/tienda`,
  },
}

export default async function TiendaPage() {
  const catalog = await getCatalog(createClient())
  const products = catalog.products
    .filter((p) => p.status !== 'draft')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // ItemList para Google: el listado con precio de cada ficha. El precio que
  // viaja es el de la presentación POR MENOR más barata — el único al que
  // alguien puede efectivamente comprar una unidad.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catálogo de Mercería Avíos',
    url: `${SITE_URL}/tienda`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => {
        const price = summarisePrice(p, catalog.discounts)
        return {
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name: p.name,
            url: `${SITE_URL}/tienda/${p.slug}`,
            offers: {
              '@type': 'Offer',
              price: price.fromUyu.toFixed(2),
              priceCurrency: 'UYU',
              availability:
                p.status === 'soldout'
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
            },
          },
        }
      }),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <TiendaClient
        activeCategory="todo"
        heading="Catálogo"
        intro="Todo lo que tenemos cargado, con precio por menor y por mayor a la vista. Si buscás algo que no está, escribinos: en el local hay bastante más."
      />
    </>
  )
}
