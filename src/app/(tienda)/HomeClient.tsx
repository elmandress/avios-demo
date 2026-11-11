'use client'

import { CatalogoFamilias } from '@/components/CatalogoFamilias'
import dynamic from 'next/dynamic'
import { BRAND } from '@/lib/env'
import { useState } from 'react'
import { Enlace } from '@/components/Enlace'
import type { Category } from '@/lib/catalog/types'
import type { TarjetaProducto } from '@/lib/catalog/tarjeta'
import { ProductCard } from '@/components/ProductCard'
import {
  avios,
  Badge,
  Button,
  Eyebrow,
  Icon,
  SectionTitle,
} from '@/components/ui/Primitives'

const ResultadosBusqueda = dynamic(
  () => import('@/components/ResultadosBusqueda'),
)

// Entrada al catálogo con mercadería real y búsqueda; las tarjetas llegan del servidor.

interface Props {
  /** Las baldosas de categoría, ya resumidas en el servidor. */
  escaparate: TarjetaProducto[]
  cantidadArticulos: number
  categories: Category[]
  featured: TarjetaProducto[]
  wholesale: TarjetaProducto[]
  settings: Record<string, string>
}

export function HomeClient({
  categories,
  featured,
  wholesale,
  settings,
  escaparate,
  cantidadArticulos,
}: Props) {
  const [query, setQuery] = useState('')

  return (
    <>
      {/* ── Entrada ───────────────────────────────────────────────────────── */}
      <section className="home-hero home-hero-catalogo">
        <div className="home-hero-inner">
          <div className="hero-copy">
            <Eyebrow>
              {settings.hero_eyebrow ?? 'Mercería · Montevideo'}
            </Eyebrow>
            <h1
              style={{
                fontFamily: avios.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(34px, 4.8vw, 58px)',
                lineHeight: 1.08,
                letterSpacing: '-0.025em',
                color: avios.ink900,
                margin: '14px 0 16px',
                maxWidth: 540,
              }}
            >
              {settings.hero_title ?? 'Un catálogo que se busca, no se hojea.'}
            </h1>
            <p
              style={{
                fontFamily: avios.fontSans,
                fontSize: 'clamp(15.5px, 1.6vw, 18px)',
                lineHeight: 1.6,
                color: avios.ink700,
                margin: '0 0 18px',
                maxWidth: 620,
              }}
            >
              {settings.hero_subtitle}
            </p>
            <div className="home-search-wrap">
              <form className="home-search" action="/tienda" role="search">
                <label className="home-search-field">
                  <span className="sr-only">Buscar en el catálogo</span>
                  <Icon
                    name="magnifying-glass"
                    size={19}
                    color={avios.ink500}
                  />
                  <input
                    type="search"
                    name="q"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ej.: cinta gross, hilo encerado, 15 mm"
                  />
                </label>
                <button className="home-search-submit" type="submit">
                  Buscar
                </button>
              </form>
              {query.trim().length >= 2 && (
                <div className="home-search-suggestions">
                  <ResultadosBusqueda query={query} />
                </div>
              )}
            </div>
            <p className="home-search-hint">
              Escribí lo que buscás y las coincidencias aparecen al instante.
            </p>
            <p
              style={{
                margin: '6px 0 18px',
                fontFamily: avios.fontSans,
                fontSize: 13.5,
                lineHeight: 1.5,
                color: avios.ink500,
              }}
            >
              {cantidadArticulos} artículos para buscar, comparar y pedir por
              WhatsApp.
            </p>
            <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
              <Button href="/tienda" variant="primary" size="lg">
                {settings.hero_cta ?? 'Ver el catálogo'}
              </Button>
              <Button href="/mayorista" variant="secondary" size="lg">
                {settings.hero_cta_secondary ?? 'Comprar por mayor'}
              </Button>
            </div>

            <div className="hero-service-line">
              <span>San José 851, Montevideo</span>
              <span>Envíos a todo el país</span>
            </div>
          </div>
          <div
            className="hero-merch"
            role="group"
            aria-label="Artículos reales del catálogo"
          >
            <div className="hero-merch-heading">
              <span>Por metro, por unidad o por pieza</span>
              <Enlace href="/tienda">Ver todo ↗</Enlace>
            </div>
            <div className="hero-merch-grid">
              {escaparate.slice(0, 3).map((card, i) => (
                <ProductCard key={card.slug} card={card} priority={i < 2} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 22px' }}
      >
        <SectionTitle>¿Qué estás buscando?</SectionTitle>
        <CatalogoFamilias categories={categories} />
        <p>
          Elegí el artículo y la presentación, armá tu pedido y mandalo por
          WhatsApp. Confirmamos stock y pago por chat.
        </p>
      </section>
      {/* ── Productos ─────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="home-products" style={sectionStyle}>
          {/* "Lo que más sale" afirmaba algo sin datos detrás: el orden es el que
              elige Alejandra en el panel, no el de ventas. */}
          <SectionHead
            title="Artículos con medidas y precios a la vista"
            link={{ href: '/tienda', label: 'Explorar el catálogo' }}
          />
          <div className="product-grid home-featured-grid">
            {featured.map((card) => (
              <ProductCard key={card.slug} card={card} priority={false} />
            ))}
          </div>
        </section>
      )}

      {/* ── Argumento mayorista ───────────────────────────────────────────── */}
      <section className="wholesale-band">
        <div className="wholesale-band-inner">
          <div style={{ maxWidth: 520 }}>
            <Badge tone="saving">Venta por mayor</Badge>
            <SectionTitle
              as="h2"
              style={{ margin: '13px 0 12px', color: '#fff' }}
            >
              El precio por pieza, junto al precio por metro
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
              Compará las dos opciones en la ficha de cada artículo. El precio
              por mayor está a la vista y no requiere registro.
            </p>
            <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
              <Button href="/mayorista" variant="quiet" size="lg">
                Ver cómo funciona
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

      {/* ── El local ──────────────────────────────────────────────────────── */}
      <section className="shop-strip">
        <div className="shop-strip-inner">
          <div className="shop-strip-text">
            <Eyebrow>El local</Eyebrow>
            <SectionTitle as="h2" style={{ margin: '11px 0 14px' }}>
              El local, en San José y Andes
            </SectionTitle>
            <p>
              Acá está el catálogo completo de Avíos: cada cinta, galón, hilo y
              medida en una ficha fácil de encontrar, con foto, precio por menor
              y por mayor, y el pedido listo para mandar por WhatsApp.
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
      {/* Sin una fuente conectada no mostramos un contador que pueda quedar viejo. */}
      <section style={{ ...sectionStyle, paddingTop: 52, paddingBottom: 8 }}>
        <a
          className="ig-strip"
          href={
            settings.contact_instagram_url ??
            'https://www.instagram.com/merceria_avios_montevideo/'
          }
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir Instagram de Mercería Avíos"
        >
          <span className="ig-strip-icon" aria-hidden>
            <Icon name="instagram-logo" size={26} />
          </span>
          <span className="ig-strip-text">
            <strong>Avíos en Instagram</strong>
            <span className="ig-strip-handle">
              {settings.contact_instagram ?? '@merceria_avios_montevideo'}
            </span>
            <span>
              Publicaciones del local, novedades y lo que más se vende.
            </span>
          </span>
          <span className="ig-strip-cta">
            Ver Instagram <Icon name="arrow-right" size={15} />
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
              El local siempre tiene novedades. Consultanos por lo que necesitás
              y te confirmamos disponibilidad y precio.
            </p>
          </div>
          <Button
            href={settings.contact_whatsapp_url || BRAND.whatsappUrl}
            variant="primary"
            size="lg"
          >
            Consultar por WhatsApp
          </Button>
        </div>
      </section>
    </>
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
        <Enlace href={link.href}>{link.label} →</Enlace>
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
