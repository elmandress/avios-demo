import type { Metadata } from 'next'
import { MiListaClient } from './MiListaClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Mi lista',
  description: 'Los artículos que guardaste para tu próximo pedido.',
  alternates: { canonical: '/mi-lista' },
  // Es contenido por visitante: no hay nada que indexar.
  robots: { index: false, follow: true },
}

export default function MiListaPage() {
  return <MiListaClient />
}
