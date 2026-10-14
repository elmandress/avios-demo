import type { Metadata } from 'next'
import { getSettings } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import ContactoClient from './ContactoClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Contacto y ubicación',
  description:
    'Mercería Avíos está en San José 851 esquina Andes, Montevideo. Lunes a viernes de 9:00 a 18:30 y sábados de 9:00 a 13:30. Escribinos por WhatsApp o Instagram.',
  alternates: { canonical: '/contacto' },
  openGraph: {
    ...OG_BASE,
    title: 'Contacto — Mercería Avíos',
    description: 'San José 851 esq. Andes, Montevideo. WhatsApp, Instagram y cómo llegar.',
    url: `${SITE_URL}/contacto`,
  },
}

export default async function ContactoPage() {
  const settings = await getSettings(createClient())
  return (
    <ContactoClient
      settings={{
        contact_whatsapp: settings.contact_whatsapp || BRAND.phoneDisplay,
        contact_whatsapp_url: settings.contact_whatsapp_url || BRAND.whatsappUrl,
        contact_instagram: settings.contact_instagram || BRAND.instagram,
        contact_instagram_url: settings.contact_instagram_url || BRAND.instagramUrl,
        contact_address: settings.contact_address || `${BRAND.street}, ${BRAND.city}`,
      }}
    />
  )
}
