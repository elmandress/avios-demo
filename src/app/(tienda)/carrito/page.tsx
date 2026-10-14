import type { Metadata } from 'next'
import { getSettings } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { BRAND, SITE_URL } from '@/lib/env'
import CarritoClient from './CarritoClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Tu pedido',
  description: 'Revisá tu pedido y confirmalo por WhatsApp.',
  alternates: { canonical: '/carrito' },
  // El pedido es privado y no aporta nada indexable.
  robots: { index: false, follow: false },
}

export default async function CarritoPage() {
  const settings = await getSettings(createClient())

  return (
    <CarritoClient
      whatsappUrl={settings.contact_whatsapp_url || BRAND.whatsappUrl}
      siteUrl={SITE_URL}
      shippingEstimate={settings.info_shipping ?? ''}
    />
  )
}
