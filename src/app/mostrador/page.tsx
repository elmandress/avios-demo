import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import MostradorClient from './MostradorClient'

// El mostrador: la herramienta de quien atiende, no del comprador.
//
// Vive FUERA del grupo `(tienda)` a propósito, igual que /ig y que el panel.
// Sin header, sin pie, sin carrito, sin barra de promo: se abre en el teléfono
// con el cliente enfrente y todo lo que no sea la búsqueda estorba.
//
// No lleva `noindex` por casualidad: es una pantalla interna. Que aparezca en
// Google no aporta nada y confunde a quien busca la tienda.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Mostrador',
  description: 'Búsqueda rápida del catálogo para atender.',
  robots: { index: false, follow: false },
}

export default async function MostradorPage() {
  const catalog = await getCatalog(createClient())
  return <MostradorClient catalog={catalog} />
}
