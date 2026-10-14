import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { MiListaClient } from './MiListaClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Mi lista',
  description: 'Los artículos que guardaste para tu próximo pedido.',
  alternates: { canonical: '/mi-lista' },
  // Es contenido por visitante: no hay nada que indexar.
  robots: { index: false, follow: true },
}

export default async function MiListaPage() {
  const catalog = await getCatalog(createClient())
  return (
    <MiListaClient
      products={catalog.products.filter((p) => p.status !== 'draft')}
      discounts={catalog.discounts}
    />
  )
}
