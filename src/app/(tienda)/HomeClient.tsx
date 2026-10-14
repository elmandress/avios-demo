'use client'

import Link from 'next/link'
import type { Category } from '@/lib/catalog/types'
import type { ResumenCategoria, TarjetaProducto } from '@/lib/catalog/tarjeta'
import { ProductCard } from '@/components/ProductCard'
import { CategoryTile } from '@/components/CategoryTile'
import { avios, Badge, Button, Eyebrow, Icon, SectionTitle } from '@/components/ui/Primitives'

// Portada.
//
// El clon abría con una foto grande y una promesa de marca ("Hecho a mano"),
// que es lo correcto para una marca de autor: ahí lo que se vende es el deseo.
// Una mercería vende otra cosa — resolver un problema concreto, rápido. Quien
// llega acá ya sabe qué necesita: cinta de 15 mm, hilo encerado negro, plantillas.
//
// Por eso la portada no tiene hero de foto (además: no hay foto real del local,
// y una imagen inventada de stock se nota). Tiene una entrada tipográfica corta
// y, apenas abajo, las siete categorías como puerta grande. La segunda pantalla
// es el argumento mayorista, que es el cliente que más factura y el que hoy no
// tiene ninguna vía de entrada.

interface Props {
  /** Las baldosas de categoría, ya resumidas en el servidor. */
  tiles: Array<{ category: Category; resumen: ResumenCategoria }>
  /** Cuántos artículos hay publicados. */
  total: number
  featured: TarjetaProducto[]
  wholesale: TarjetaProducto[]
  settings: Record<string, string>
}

export function HomeClient({ tiles, total, featured, wholesale, settings }: Props) {
  return (
    <>
      {/* ── Entrada ───────────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <Eyebrow>{settings.hero_eyebrow ?? 'Mercería · Montevideo'}</Eyebrow>
          <h1
            style={{
              fontFamily: avios.fontDisplay,
              fontWeight: 400,
              fontSize: 'clamp(31px, 5.4vw, 52px)',
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              color: avios.ink900,
              margin: '14px 0 16px',
              maxWidth: 15 * 40,
            }}
          >
            {settings.hero_title ?? 'Todo lo que tu proyecto necesita, en un solo lugar.'}
          </h1>
          <p
            style={{
              fontFamily: avios.fontSans,
              fontSize: 'clamp(15.5px, 1.6vw, 18px)',
              lineHeight: 1.6,
              color: avios.ink700,
              margin: '0 0 26px',
              maxWidth: 540,
            }}
          >
            {settings.hero_subtitle}
          </p>
          <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
            <Button href="/tienda" variant="primary" size="lg">
              {settings.hero_cta ?? 'Ver el catálogo'}
            </Button>
            <Button href="/mayorista" variant="secondary" size="lg">
              {settings.hero_cta_secondary ?? 'Comprar por mayor'}
            </Button>
          </div>

          <ul className="home-hero-facts">
            <HeroFact icon="storefront">
              San José 851 esq. Andes
              <small>Lun a vie 9:00–18:30 · Sáb 9:00–13:30</small>
            </HeroFact>
            <HeroFact icon="truck">
              Envíos a todo el país
              <small>Por agencia, coordinado por WhatsApp</small>
            </HeroFact>
            <HeroFact icon="stack">
              Precio por mayor sin registro
              <small>Llevás la pieza cerrada y pagás menos</small>
            </HeroFact>
          </ul>
        </div>
      </section>

      {/* ── Categorías ────────────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <SectionHead
          title="Qué tenemos"
          aside={`${total} artículos cargados`}
        />
        <div className="category-grid">
          {tiles.map(({ category, resumen }) => (
            <CategoryTile key={category.slug} category={category} resumen={resumen} />
          ))}
        </div>
      </section>

      {/* ── Argumento mayorista ───────────────────────────────────────────── */}
      <section className="wholesale-band">
        <div className="wholesale-band-inner">
          <div style={{ maxWidth: 520 }}>
            <Badge tone="saving">Venta por mayor</Badge>
            <SectionTitle as="h2" style={{ margin: '13px 0 12px', color: '#fff' }}>
              El mismo artículo, mucho más barato por pieza
            </SectionTitle>
            <p
              style={{
                fontFamily: avios.fontSans,
                fontSize: 16,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.86)',
                margin: '0 0 22px',
              }}
            >
              No hace falta registrarse ni pedir una lista aparte. Cada ficha muestra los dos
              precios: el del metro suelto y el de la pieza cerrada, con el ahorro ya calculado.
            </p>
            <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
              <Button href="/mayorista" variant="quiet" size="lg">
                Cómo comprar por mayor
              </Button>
            </div>
          </div>

          {wholesale.length > 0 && (
            <div className="wholesale-band-grid">
              {wholesale.map((card) => (
                <ProductCard key={card.slug} card={card} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Destacados ────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section style={sectionStyle}>
          <SectionHead title="Lo que más sale" link={{ href: '/tienda', label: 'Ver todo' }} />
          <div className="product-grid">
            {featured.map((card, i) => (
              <ProductCard key={card.slug} card={card} priority={i < 4} />
            ))}
          </div>
        </section>
      )}

      {/* ── El local ──────────────────────────────────────────────────────── */}
      <section className="shop-strip">
        <div className="shop-strip-inner">
          <div className="shop-strip-text">
            <Eyebrow>El local</Eyebrow>
            <SectionTitle as="h2" style={{ margin: '11px 0 14px' }}>
              Estamos en San José y Andes desde siempre
            </SectionTitle>
            <p>
              El sitio muestra una parte de lo que hay. En el mostrador se corta la cinta a medida,
              se compara el color contra la tela que traés y se resuelve en el momento lo que por
              pantalla lleva tres mensajes.
            </p>
            <div className="shop-strip-actions">
              <Button href="/contacto" variant="secondary">
                Cómo llegar
              </Button>
              <Button href="/mayorista" variant="ghost">
                Comprar por mayor →
              </Button>
            </div>
          </div>

          <dl className="shop-strip-facts">
            <div>
              <dt>Dirección</dt>
              <dd>San José 851 esq. Andes, Montevideo</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                Lunes a viernes de 9:00 a 18:30
                <br />
                Sábados de 9:00 a 13:30
              </dd>
            </div>
            <div>
              <dt>Envíos</dt>
              <dd>A todo el país por agencia</dd>
            </div>
            <div>
              <dt>Pago</dt>
              <dd>Efectivo o transferencia</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Instagram ─────────────────────────────────────────────────────── */}
      {/*
        Prueba social real, y el activo más grande de Avíos: hoy la venta entra
        casi toda por ahí. Que el sitio no lo dijera en ningún lado era dejar
        sobre la mesa el argumento más fuerte que tiene el negocio.
        El número sale de SETTINGS y es editable; si se vacía, no se muestra —
        un conteo de seguidores desactualizado juega en contra.
      */}
      <section style={{ ...sectionStyle, paddingTop: 52, paddingBottom: 8 }}>
        <a
          className="ig-strip"
          href={settings.contact_instagram_url ?? 'https://www.instagram.com/merceria_avios_montevideo/'}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ig-strip-icon" aria-hidden>
            <Icon name="instagram-logo" size={26} />
          </span>
          <span className="ig-strip-text">
            <strong>{settings.contact_instagram ?? '@merceria_avios_montevideo'}</strong>
            <span>
              {settings.instagram_followers
                ? `${settings.instagram_followers} personas nos siguen. Ahí publicamos lo que va entrando.`
                : 'Ahí publicamos lo que va entrando y las novedades del local.'}
            </span>
          </span>
          <span className="ig-strip-cta">
            Seguinos <Icon name="arrow-right" size={15} />
          </span>
        </a>
      </section>

      {/* ── Contacto rápido ───────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, paddingBottom: 80 }}>
        <div className="contact-strip">
          <div>
            <SectionTitle as="h2" style={{ fontSize: 24, marginBottom: 8 }}>
              ¿No encontrás lo que buscás?
            </SectionTitle>
            <p
              style={{
                fontFamily: avios.fontSans,
                fontSize: 15.5,
                lineHeight: 1.6,
                color: avios.ink700,
                margin: 0,
                maxWidth: 480,
              }}
            >
              En el local hay bastante más de lo que está cargado en el sitio. Escribinos y te
              decimos si lo tenemos y a cuánto.
            </p>
          </div>
          <Button href="/contacto" variant="primary" size="lg">
            Escribinos
          </Button>
        </div>
      </section>
    </>
  )
}

function HeroFact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li>
      <Icon name={icon} size={20} color={avios.brand600} />
      <span>{children}</span>
    </li>
  )
}

/**
 * Cabecera de sección: título y, al costado, o bien un dato concreto o bien un
 * enlace. Existe para que las secciones compartan el mismo ritmo — antes cada
 * una traía su propio div flex con márgenes distintos y se notaba.
 */
function SectionHead({
  title,
  aside,
  link,
}: {
  title: string
  aside?: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="section-head">
      <SectionTitle as="h2">{title}</SectionTitle>
      {link ? (
        <Link href={link.href}>{link.label} →</Link>
      ) : aside ? (
        <span>{aside}</span>
      ) : null}
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: '58px 22px',
}
