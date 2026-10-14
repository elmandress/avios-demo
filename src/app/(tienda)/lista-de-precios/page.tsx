import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import ListaPreciosClient from './ListaPreciosClient'

// Lista de precios imprimible.
//
// El catálogo lo pone el CatalogProvider del layout de `(tienda)`, así que esta
// página no vuelve a leerlo: si lo hiciera, imprimiría el catálogo del archivo
// y no el que se ve en pantalla, y una lista impresa que no coincide con la
// tienda es exactamente el problema que esto viene a resolver.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Lista de precios',
  description:
    'Lista de precios completa de Mercería Avíos: cintas, hilos, cordones, tul y herramientas de costura, por menor y por mayor. Lista para imprimir o guardar en PDF. San José 851, Montevideo.',
  alternates: { canonical: '/lista-de-precios' },
  openGraph: {
    ...OG_BASE,
    title: 'Lista de precios — Mercería Avíos',
    description: 'Todos los precios, por menor y por mayor, en una hoja para imprimir.',
    url: `${SITE_URL}/lista-de-precios`,
  },
}

export default async function ListaPreciosPage() {
  const catalog = await getCatalog(createClient())
  return <ListaPreciosClient products={catalog.products.filter((p) => p.status !== 'draft')} />
}
