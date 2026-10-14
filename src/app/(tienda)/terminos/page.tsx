import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { avios } from '@/components/ui/tokens'
import { Eyebrow, Icon, SectionTitle } from '@/components/ui/Primitives'

// ⚠️ ESTE TEXTO NO PASÓ POR REVISIÓN LEGAL.
//
// Es un borrador razonable escrito por el estudio, no un documento revisado por
// un abogado ni verificado contra la Ley 17.250 de Relaciones de Consumo ni
// contra la Ley 18.331 de Protección de Datos Personales del Uruguay. Antes de
// publicar el sitio hay que hacerlo revisar. El aviso de abajo lo dice también
// en la página, para que no quede sólo en un comentario del código.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Términos y privacidad',
  description: 'Términos de uso y tratamiento de datos del sitio de Mercería Avíos.',
  alternates: { canonical: '/terminos' },
  openGraph: {
    ...OG_BASE,
    title: 'Términos y privacidad — Mercería Avíos',
    description: 'Términos de uso y tratamiento de datos.',
    url: `${SITE_URL}/terminos`,
  },
  robots: { index: true, follow: true },
}

export default async function TerminosPage() {
  const s = await getSettings(createClient())

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 22px 80px' }}>
      <Eyebrow>Legales</Eyebrow>
      <SectionTitle as="h1" style={{ fontSize: 'clamp(27px, 4.2vw, 38px)', margin: '12px 0 20px' }}>
        Términos y privacidad
      </SectionTitle>

      {/* El aviso va ARRIBA y visible, no en letra chica al pie: quien lo tiene
          que leer es Alejandra antes de publicar, no el visitante. */}
      <div
        role="note"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: avios.sale50,
          border: `1px solid ${avios.sale}`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 32,
        }}
      >
        <Icon name="warning" size={20} color={avios.sale} />
        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 14.5,
            lineHeight: 1.6,
            color: avios.ink900,
            margin: 0,
          }}
        >
          <strong>Borrador sin revisión legal.</strong> Este texto lo escribió el estudio que hizo
          el sitio, no un abogado, y no fue contrastado con la Ley 17.250 de Relaciones de Consumo
          ni con la Ley 18.331 de Protección de Datos Personales. Antes de publicar el sitio hay que
          hacerlo revisar por un profesional.
        </p>
      </div>

      <Section title="Quiénes somos">
        <p style={p}>
          {BRAND.name}, con local en {BRAND.street}, {BRAND.city}, Uruguay. Contacto:{' '}
          <a href={s.contact_whatsapp_url || BRAND.whatsappUrl} style={link}>
            WhatsApp {s.contact_whatsapp || BRAND.phoneDisplay}
          </a>{' '}
          o{' '}
          <a href={s.contact_instagram_url || BRAND.instagramUrl} style={link}>
            Instagram {s.contact_instagram || BRAND.instagram}
          </a>
          .
        </p>
      </Section>

      <Section title="Cómo funciona el sitio">
        <p style={p}>
          Este sitio es un catálogo. Cuando armás un pedido y tocás el botón de WhatsApp, se abre un
          chat con el pedido escrito: eso es una <strong>consulta</strong>, no una compra cerrada.
          La operación queda confirmada recién cuando acordamos por WhatsApp stock, precio final,
          envío y forma de pago.
        </p>
        <p style={p}>
          No procesamos pagos en el sitio. No se piden ni se guardan datos de tarjeta en ningún
          momento.
        </p>
      </Section>

      <Section title="Precios y disponibilidad">
        <p style={p}>
          Los precios están en pesos uruguayos e incluyen impuestos. Pueden cambiar sin aviso
          previo; el que vale es el que confirmamos al momento del pedido. Hacemos lo posible por
          mantener el stock al día, pero puede pasar que un artículo publicado no esté disponible —
          en ese caso te avisamos antes de cobrar nada.
        </p>
        <p style={p}>
          Las fotos son de referencia: los colores pueden verse distintos según la pantalla. Algunos
          artículos todavía no tienen foto propia y se muestran con una ilustración de su categoría.
        </p>
      </Section>

      <Section title="Cambios y devoluciones">
        <p style={p}>{s.info_returns}</p>
        <p style={p}>
          Esto no limita los derechos que te da la Ley 17.250 de Relaciones de Consumo, incluido el
          derecho a desistir de una compra hecha a distancia dentro de los plazos que fija la ley.
        </p>
      </Section>

      <Section title="Datos personales">
        <p style={p}>
          El sitio no tiene cuentas de usuario y no te pide datos personales para navegar ni para
          armar un pedido.
        </p>
        <p style={p}>
          Tu pedido y tu lista guardada viven <strong>en tu propio navegador</strong>{' '}
          (almacenamiento local). No se envían a ningún servidor nuestro y desaparecen si borrás los
          datos del navegador. Los datos que sí recibimos son los que vos nos escribís por WhatsApp,
          y los usamos solamente para atender ese pedido.
        </p>
        <p style={p}>
          Si el sitio tiene herramientas de medición de visitas activadas, recogen datos de uso
          agregados y no te identifican personalmente.
        </p>
      </Section>

      <Section title="Propiedad del contenido">
        <p style={p}>
          Los textos, fotos e ilustraciones de este sitio son de {BRAND.name}. No los reproduzcas
          con fines comerciales sin permiso.
        </p>
      </Section>

      <p style={{ ...p, marginTop: 34, fontSize: 14, color: avios.ink500 }}>
        Si algo de esto no te queda claro,{' '}
        <Link href="/contacto" style={link}>
          escribinos
        </Link>{' '}
        y lo charlamos.
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ paddingTop: 24, borderTop: `1px solid ${avios.border}`, marginBottom: 4 }}>
      <h2
        style={{
          fontFamily: avios.fontDisplay,
          fontWeight: 400,
          fontSize: 20,
          color: avios.ink900,
          margin: '0 0 10px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const p: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 15.5,
  lineHeight: 1.7,
  color: 'var(--ink-700)',
  margin: '0 0 14px',
}

const link: React.CSSProperties = { color: 'var(--brand-600)', textUnderlineOffset: 3 }
