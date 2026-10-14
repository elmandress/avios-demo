import type { Metadata } from 'next'
import { Enlace } from '@/components/Enlace'
import Image from 'next/image'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { avios } from '@/components/ui/tokens'
import { Badge, Icon } from '@/components/ui/Primitives'
import { BRAND, SITE_URL } from '@/lib/env'
import { BLUR_DATA_URL } from '@/lib/media'

export const revalidate = 900

// /ig — el link de la biografía de Instagram, en el propio dominio.
//
// Con 47.100 seguidores, este es EL canal de Avíos: hoy toda la venta entra por
// ahí. Reemplaza a un Linktree — cero fuga a un dominio ajeno, y todo lo que
// pase después (ver producto, agregar al pedido, mandar el mensaje) queda dentro
// del mismo embudo medible.
//
// El link para la bio es simplemente https://…/ig, sin parámetros: como esta
// página existe SÓLO para la biografía, la atribución asume instagram/bio cuando
// alguien llega sin UTM. Un UTM explícito lo sigue pisando: /ig?utm_medium=reel
//
// Diseñada para el navegador embebido de Instagram: una columna, objetivos
// táctiles grandes, sin header ni footer del sitio compitiendo por el pulgar.

export const metadata: Metadata = {
  title: 'Enlaces',
  description: 'Catálogo, precios por mayor y contacto directo de Mercería Avíos.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/ig' },
}

export default async function IgPage() {
  const catalog = await getCatalog(createClient())
  const active = catalog.products.filter((p) => p.status === 'active')

  // "Lo último" por fecha de alta, no por el orden manual de la tienda: quien
  // llega desde un reel viene por lo que se publicó hace poco.
  const newest = [...active]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.sortOrder - b.sortOrder)
    .slice(0, 4)

  const links = [
    { href: '/tienda', label: 'Ver el catálogo completo', hint: `${active.length} artículos con precio`, icon: 'shopping-bag' },
    { href: '/mayorista', label: 'Comprar por mayor', hint: 'Precio por pieza cerrada, sin registro', icon: 'stack' },
    { href: '/contacto', label: 'Cómo llegar al local', hint: BRAND.street, icon: 'map-pin' },
    { href: '/info', label: 'Envíos, pagos y cambios', hint: 'Todo el país por agencia', icon: 'truck' },
  ] as const

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '32px 18px 60px' }}>
      <header style={{ textAlign: 'center', marginBottom: 26 }}>
        <Image
          src="/favicon.svg"
          alt=""
          width={56}
          height={56}
          loading="eager"
          style={{ margin: '0 auto' }}
        />
        <h1
          style={{
            fontFamily: avios.fontDisplay,
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: '0.1em',
            color: avios.ink900,
            margin: '10px 0 6px',
          }}
        >
          MERCERÍA AVÍOS
        </h1>
        <p style={{ fontFamily: avios.fontSans, fontSize: 14.5, color: avios.ink700, margin: 0, lineHeight: 1.55 }}>
          Por mayor y por menor · {BRAND.street}
          <br />
          Envíos a todo el país
        </p>
      </header>

      <a
        href={catalog.settings.contact_whatsapp_url || BRAND.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          minHeight: 54,
          borderRadius: 11,
          background: '#25D366',
          color: '#0A2E1B',
          fontFamily: avios.fontSans,
          fontSize: 16,
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: 10,
        }}
      >
        <Icon name="whatsapp-logo" weight="fill" size={21} /> Escribinos por WhatsApp
      </a>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 30 }}>
        {links.map((l) => (
          <Enlace
            key={l.href}
            href={l.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              minHeight: 60,
              padding: '10px 15px',
              borderRadius: 11,
              border: `1px solid ${avios.borderStrong}`,
              background: '#fff',
              textDecoration: 'none',
            }}
          >
            <Icon name={l.icon} size={21} color={avios.brand600} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontFamily: avios.fontSans, fontSize: 15.5, fontWeight: 500, color: avios.ink900 }}>
                {l.label}
              </span>
              <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                {l.hint}
              </span>
            </span>
            <Icon name="caret-right" size={16} color={avios.ink300} />
          </Enlace>
        ))}
      </nav>

      {newest.length > 0 && (
        <section>
          <h2
            style={{
              fontFamily: avios.fontSans,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: avios.ink500,
              margin: '0 0 12px',
            }}
          >
            Lo último
          </h2>
          <div className="ig-grid">
            {newest.map((p) => {
              const price = summarisePrice(p, catalog.discounts)
              const photo = p.media[0]
              return (
                <Enlace key={p.id} href={`/tienda/${p.slug}`} className="ig-card">
                  <span
                    style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: avios.paper50,
                      border: `1px solid ${avios.border}`,
                      display: 'block',
                    }}
                  >
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={p.name}
                        fill
                        quality={82}
                        sizes="(max-width: 460px) 45vw, 210px"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <ProductPlaceholder categorySlug={p.categorySlug} label={p.name} />
                    )}
                    {price.hasWholesale && (
                      <span style={{ position: 'absolute', top: 8, left: 8 }}>
                        <Badge tone="saving">Por mayor</Badge>
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink900, lineHeight: 1.3 }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: avios.fontSans, fontSize: 13.5, fontWeight: 600, color: avios.ink700 }}>
                    desde {formatUYU(price.fromUyu)}
                  </span>
                </Enlace>
              )
            })}
          </div>
        </section>
      )}

      {/* El dominio al pie, sólo si hay uno de verdad: mientras SITE_URL sea
          localhost, mostrarlo es dejar ruido de desarrollo a la vista. */}
      {!SITE_URL.includes('localhost') && (
        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 12.5,
            color: avios.ink500,
            textAlign: 'center',
            marginTop: 30,
          }}
        >
          <a href={SITE_URL} style={{ color: avios.ink500 }}>
            {SITE_URL.replace(/^https?:\/\//, '')}
          </a>
        </p>
      )}
    </div>
  )
}
