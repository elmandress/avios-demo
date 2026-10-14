import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { resumirCategoria, tarjetasDe } from '@/lib/catalog/tarjeta'
import { createClient } from '@/lib/supabase/public'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { CategoryTile } from '@/components/CategoryTile'
import { avios } from '@/components/ui/tokens'
import { Button, Eyebrow, Icon, SectionTitle } from '@/components/ui/Primitives'

// Reemplaza a /atelier. "Atelier" es la palabra de un taller de diseño de autor;
// una mercería del centro de Montevideo no tiene atelier, tiene local.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'La mercería',
  description:
    'Mercería Avíos, San José 851 esquina Andes, Montevideo. Cintas, hilos, cordones, tul y herramientas de costura, por mayor y por menor, con envíos a todo el país.',
  alternates: { canonical: '/nosotros' },
  openGraph: {
    ...OG_BASE,
    title: 'La mercería — Mercería Avíos',
    description: 'San José 851 esq. Andes, Montevideo. Por mayor y por menor.',
    url: `${SITE_URL}/nosotros`,
  },
}

export default async function NosotrosPage() {
  const catalog = await getCatalog(createClient())
  const s = catalog.settings
  const tarjetas = tarjetasDe(catalog)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 22px 80px' }}>
      <header style={{ marginBottom: 40 }}>
        <Eyebrow>{s.about_eyebrow ?? 'La mercería'}</Eyebrow>
        <SectionTitle
          as="h1"
          style={{ fontSize: 'clamp(29px, 4.6vw, 44px)', margin: '12px 0 20px' }}
        >
          {s.about_title ?? 'En San José y Andes'}
        </SectionTitle>
        <p style={paragraph}>{s.about_body}</p>
        <p style={paragraph}>{s.about_body_2}</p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
          marginBottom: 48,
        }}
      >
        <Value icon="storefront" title="Local a la calle">
          {BRAND.street}, {BRAND.city}. {BRAND.hoursDisplay.join('. ')}.
        </Value>
        <Value icon="stack" title="Por mayor y por menor">
          Te cortamos un metro de cinta o te vendemos la pieza de cien, con el mismo trato.
        </Value>
        <Value icon="truck" title="Envíos a todo el país">
          Por agencia, a cualquier punto de Uruguay. El costo lo confirmamos antes de despachar.
        </Value>
      </section>

      <section style={{ marginBottom: 48 }}>
        <SectionTitle as="h2" style={{ fontSize: 24, marginBottom: 18 }}>
          Qué vas a encontrar
        </SectionTitle>
        <div className="category-grid">
          {catalog.categories.map((c) => (
            <CategoryTile
              key={c.slug}
              category={c}
              resumen={resumirCategoria(tarjetas, c.slug)}
            />
          ))}
        </div>
        <p style={{ ...paragraph, fontSize: 14.5, color: avios.ink500, marginTop: 16 }}>
          El sitio muestra una parte del catálogo: en el local hay bastante más. Si buscás algo que
          no está publicado, preguntanos.
        </p>
      </section>

      <section className="contact-strip">
        <div>
          <SectionTitle as="h2" style={{ fontSize: 23, marginBottom: 8 }}>
            Venite o escribinos
          </SectionTitle>
          <p style={{ ...paragraph, margin: 0, maxWidth: 460 }}>
            Estamos de lunes a sábado. Si querés asegurarte de que tenemos lo que buscás antes de
            venir, mandanos un mensaje.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button href="/contacto" variant="primary" size="lg">
            Cómo llegar
          </Button>
          <Button href="/tienda" variant="secondary" size="lg">
            Ver catálogo
          </Button>
        </div>
      </section>
    </div>
  )
}

function Value({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: avios.paper50,
        border: `1px solid ${avios.border}`,
        borderRadius: 12,
        padding: '20px 20px 22px',
      }}
    >
      <Icon name={icon} size={24} color={avios.brand600} />
      <h3
        style={{
          fontFamily: avios.fontDisplay,
          fontWeight: 400,
          fontSize: 18,
          color: avios.ink900,
          margin: '10px 0 7px',
        }}
      >
        {title}
      </h3>
      <p style={{ fontFamily: avios.fontSans, fontSize: 14.5, lineHeight: 1.6, color: avios.ink700, margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

const paragraph: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 16.5,
  lineHeight: 1.7,
  color: 'var(--ink-700)',
  margin: '0 0 14px',
}
