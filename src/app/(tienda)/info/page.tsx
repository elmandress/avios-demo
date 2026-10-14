import type { Metadata } from 'next'
import { getSettings } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { avios } from '@/components/ui/tokens'
import { Button, Eyebrow, Icon, SectionTitle } from '@/components/ui/Primitives'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Envíos, pagos y cambios',
  description:
    'Cómo comprar en Mercería Avíos: envíos a todo Uruguay por agencia, retiro en San José 851, formas de pago y política de cambios.',
  alternates: { canonical: '/info' },
  openGraph: {
    ...OG_BASE,
    title: 'Envíos, pagos y cambios — Mercería Avíos',
    description: 'Cómo comprar, cómo pagar y cómo llega tu pedido.',
    url: `${SITE_URL}/info`,
  },
}

export default async function InfoPage() {
  const s = await getSettings(createClient())

  const blocks = [
    { icon: 'truck', title: 'Envíos', body: s.info_shipping },
    {
      icon: 'storefront',
      title: 'Retiro en el local',
      body: `Podés retirar sin cargo en ${BRAND.street}, ${BRAND.city}. ${BRAND.hoursDisplay.join('. ')}. Avisanos por WhatsApp cuando pases y te lo dejamos preparado.`,
    },
    { icon: 'credit-card', title: 'Formas de pago', body: s.info_payment },
    { icon: 'arrow-clockwise', title: 'Cambios', body: s.info_returns },
    {
      icon: 'stack',
      title: 'Compras por mayor',
      body: 'El precio por mayor está publicado en la ficha de cada artículo que lo tiene: es el de la pieza cerrada. No hace falta registro ni una lista aparte.',
    },
    {
      icon: 'ruler2',
      title: 'Mercadería cortada a medida',
      body: 'Las cintas, cordones, tul y adhesivo se cortan en el momento para tu pedido. Por eso conviene confirmar bien los metros antes: el corte no se puede deshacer.',
    },
  ]

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 22px 80px' }}>
      <Eyebrow>Información</Eyebrow>
      <SectionTitle as="h1" style={{ fontSize: 'clamp(28px, 4.4vw, 40px)', margin: '12px 0 14px' }}>
        Envíos, pagos y cambios
      </SectionTitle>
      <p
        style={{
          fontFamily: avios.fontSans,
          fontSize: 16.5,
          lineHeight: 1.7,
          color: avios.ink700,
          margin: '0 0 40px',
        }}
      >
        Todo lo que conviene saber antes de hacer el pedido. Si te queda alguna duda, escribinos y
        te la sacamos por WhatsApp.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {blocks.map((b) => (
          <section
            key={b.title}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              padding: '22px 0',
              borderTop: `1px solid ${avios.border}`,
            }}
          >
            <span style={{ flexShrink: 0, paddingTop: 3 }}>
              <Icon name={b.icon} size={22} color={avios.brand600} />
            </span>
            <div>
              <h2
                style={{
                  fontFamily: avios.fontDisplay,
                  fontWeight: 400,
                  fontSize: 20,
                  color: avios.ink900,
                  margin: '0 0 7px',
                }}
              >
                {b.title}
              </h2>
              <p
                style={{
                  fontFamily: avios.fontSans,
                  fontSize: 15.5,
                  lineHeight: 1.7,
                  color: avios.ink700,
                  margin: 0,
                }}
              >
                {b.body}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="contact-strip" style={{ marginTop: 44 }}>
        <div>
          <SectionTitle as="h2" style={{ fontSize: 22, marginBottom: 8 }}>
            ¿Te quedó una duda?
          </SectionTitle>
          <p
            style={{
              fontFamily: avios.fontSans,
              fontSize: 15,
              color: avios.ink700,
              margin: 0,
              maxWidth: 420,
            }}
          >
            Contestamos por WhatsApp de lunes a sábado.
          </p>
        </div>
        <Button variant="whatsapp" size="lg" href={s.contact_whatsapp_url || BRAND.whatsappUrl}>
          <Icon name="whatsapp-logo" weight="fill" size={19} /> Escribinos
        </Button>
      </div>
    </div>
  )
}
