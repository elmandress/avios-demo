import type { Metadata } from 'next'
import Link from 'next/link'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { formatUYU, referenceFormat, savingsPercent, summarisePrice } from '@/lib/catalog/pricing'
import type { Product } from '@/lib/catalog/types'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { ProductCard } from '@/components/ProductCard'
import { aTarjeta } from '@/lib/catalog/tarjeta'
import { avios } from '@/components/ui/tokens'
import { Badge, Button, Eyebrow, Icon, SectionTitle } from '@/components/ui/Primitives'

// Página de mayorista.
//
// No es una adaptación de nada del clon: es un hueco que la auditoría dejó a la
// vista. Avíos vende por mayor y el sitio no lo decía en ningún lado.
//
// El contenido sale de lo que la bibliografía del rubro coincide en pedir: a
// quién le venden, cuál es el mínimo, cómo se pide, cómo se paga y cómo llega.
// Y de un hallazgo que decide la arquitectura: los sitios mayoristas del rubro
// que funcionan NO esconden el precio detrás de un login. Publican precio y
// mínimo de compra, y el "ser mayorista" es una consecuencia de cuánto llevás.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Venta por mayor',
  description:
    'Precio por mayor en Mercería Avíos: llevás la pieza cerrada y pagás menos por metro. Sin registro ni lista aparte — el precio está publicado en cada ficha. San José 851, Montevideo, con envíos a todo el país.',
  alternates: { canonical: '/mayorista' },
  openGraph: {
    ...OG_BASE,
    title: 'Venta por mayor — Mercería Avíos',
    description: 'Precio por pieza cerrada, publicado en cada ficha. Sin registro.',
    url: `${SITE_URL}/mayorista`,
  },
}

interface WholesaleRow {
  product: Product
  variantLabel: string
  packLabel: string
  /** null cuando falta la medida de la pieza y no se puede publicar un total. */
  packPrice: number | null
  unitPrice: number
  retailUnitPrice: number
  saving: number
}

/** El mejor ahorro de cada producto: una fila por producto, no por variante. */
function bestWholesaleRows(products: Product[]): WholesaleRow[] {
  const rows: WholesaleRow[] = []

  for (const product of products) {
    let best: WholesaleRow | null = null
    for (const variant of product.variants) {
      const reference = referenceFormat(variant)
      for (const format of variant.formats) {
        // Se aceptan presentaciones sin total publicado: el ahorro POR UNIDAD
        // es un dato real aunque no sepamos cuántos metros trae la pieza.
        // Dejarlas afuera escondía un precio por mayor que la ficha sí muestra.
        if (format.tier !== 'mayor' || !format.available) continue
        const saving = savingsPercent(format, variant)
        if (saving === null) continue
        if (!best || saving > best.saving) {
          best = {
            product,
            variantLabel: variant.label,
            packLabel: format.label,
            packPrice: format.priceUyu,
            unitPrice: format.unitPriceUyu,
            retailUnitPrice: reference?.unitPriceUyu ?? format.unitPriceUyu,
            saving,
          }
        }
      }
    }
    if (best) rows.push(best)
  }

  return rows.sort((a, b) => b.saving - a.saving)
}

export default async function MayoristaPage() {
  const catalog = await getCatalog(createClient())
  const active = catalog.products.filter((p) => p.status === 'active')
  const wholesaleProducts = active.filter((p) => summarisePrice(p, catalog.discounts).hasWholesale)
  // Las mejores por ahorro, no todas.
  //
  // Con el catálogo completo esto son cientos de filas, y una tabla de cientos
  // de filas no la lee nadie: deja de ser un argumento y pasa a ser un muro.
  // Doce entran en una pantalla y dicen lo mismo. La referencia completa es
  // /lista-de-precios, que para eso está paginada e impresa por categoría.
  const TOPE_TABLA = 12
  // bestWholesaleRows ya devuelve ordenado por ahorro descendente.
  const todasLasFilas = bestWholesaleRows(wholesaleProducts)
  const rows = todasLasFilas.slice(0, TOPE_TABLA)

  const minOrder = catalog.settings.wholesale_min_order?.trim() ?? ''
  const waUrl = catalog.settings.contact_whatsapp_url || BRAND.whatsappUrl

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 22px 80px' }}>
      <header style={{ maxWidth: 660, marginBottom: 40 }}>
        <Eyebrow>Venta por mayor</Eyebrow>
        <SectionTitle as="h1" style={{ fontSize: 'clamp(29px, 4.6vw, 42px)', margin: '12px 0 16px' }}>
          Comprás la pieza cerrada y pagás bastante menos por metro
        </SectionTitle>
        <p style={{ fontFamily: avios.fontSans, fontSize: 17, lineHeight: 1.65, color: avios.ink700, margin: 0 }}>
          Trabajamos con modistas, talleres de confección, diseñadoras, escuelas de costura,
          comparsas y revendedoras. El precio por mayor está publicado en la ficha de cada artículo:
          no hay que registrarse, ni pedir una lista, ni esperar respuesta para saber cuánto sale.
        </p>
      </header>

      {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div className="wholesale-steps">
          <WholesaleStep icon="magnifying-glass" title="Buscás el artículo">
            En la ficha vas a ver los dos precios juntos: el del metro suelto y el de la pieza
            cerrada, con el ahorro por metro ya calculado.
          </WholesaleStep>
          <WholesaleStep icon="stack" title="Elegís “Por mayor”">
            Cada pieza dice cuánto trae (100 m, 50 m, 10 m, un cono de 169 m). Podés llevar más de
            una del mismo ancho o color.
          </WholesaleStep>
          <WholesaleStep icon="whatsapp-logo" title="Lo mandás por WhatsApp">
            El pedido llega escrito con cada renglón, el contenido total y el precio. Confirmamos
            stock y forma de pago por chat.
          </WholesaleStep>
        </div>
      </section>

      {/* ── Condiciones ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: avios.paper50,
          border: `1px solid ${avios.border}`,
          borderRadius: 14,
          padding: '26px 24px',
          marginBottom: 48,
        }}
      >
        <SectionTitle as="h2" style={{ fontSize: 22, marginBottom: 18 }}>
          Condiciones
        </SectionTitle>
        <dl className="condition-list">
          <div>
            <dt>Mínimo de compra</dt>
            <dd>
              {minOrder ? (
                minOrder
              ) : (
                // Dato de negocio que Alejandra todavía no definió. Antes de
                // inventar un número, el sitio dice la verdad y ofrece
                // preguntarlo: un mínimo falso espanta al cliente que sí
                // llegaba, y uno inventado bajo genera pedidos que no convienen.
                <>
                  No tenemos un mínimo fijo publicado. Escribinos y lo vemos según lo que necesites.
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Precios</dt>
            <dd>
              Publicados en cada ficha, en pesos uruguayos. El precio por mayor es el de la pieza
              cerrada completa.
            </dd>
          </div>
          <div>
            <dt>Formas de pago</dt>
            <dd>{catalog.settings.info_payment}</dd>
          </div>
          <div>
            <dt>Envíos</dt>
            <dd>{catalog.settings.info_shipping}</dd>
          </div>
          <div>
            <dt>Retiro</dt>
            <dd>
              {BRAND.street}, {BRAND.city}. {BRAND.hoursDisplay.join(' · ')}.
            </dd>
          </div>
          <div>
            <dt>Cambios</dt>
            <dd>{catalog.settings.info_returns}</dd>
          </div>
        </dl>
      </section>

      {/* ── Tabla de ahorros ──────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <SectionTitle as="h2" style={{ fontSize: 24, marginBottom: 6 }}>
            Cuánto se ahorra
          </SectionTitle>
          <p
            style={{
              fontFamily: avios.fontSans,
              fontSize: 14.5,
              color: avios.ink500,
              margin: '0 0 18px',
            }}
          >
            La diferencia por unidad entre comprar suelto y llevar la pieza cerrada.{' '}
            {/* El mayorista no compra de a un artículo: compara una lista contra
                otra. Acá es donde efectivamente la pide. */}
            <Link href="/lista-de-precios">Ver la lista de precios completa</Link>, lista para
            imprimir.
          </p>

          <div className="scroll-x">
            <table className="savings-table">
              <thead>
                <tr>
                  <th scope="col">Artículo</th>
                  <th scope="col">Pieza</th>
                  <th scope="col">Suelto</th>
                  <th scope="col">Por mayor</th>
                  <th scope="col">Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.product.slug}-${row.variantLabel}`}>
                    <th scope="row">
                      <Link href={`/tienda/${row.product.slug}`}>{row.product.name}</Link>
                      {row.variantLabel && (
                        <span style={{ display: 'block', color: avios.ink500, fontWeight: 400 }}>
                          {row.variantLabel}
                        </span>
                      )}
                    </th>
                    <td>
                      <span style={{ display: 'block' }}>{row.packLabel}</span>
                      <span style={{ color: avios.ink500 }}>
                        {row.packPrice === null ? 'medida a confirmar' : formatUYU(row.packPrice)}
                      </span>
                    </td>
                    <td>{formatUYU(row.retailUnitPrice)}</td>
                    <td style={{ color: avios.saving700, fontWeight: 600 }}>
                      {formatUYU(row.unitPrice)}
                    </td>
                    <td>
                      <Badge tone="saving">−{row.saving}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            style={{
              fontFamily: avios.fontSans,
              fontSize: 13,
              color: avios.ink500,
              margin: '12px 0 0',
            }}
          >
            Los precios “suelto” y “por mayor” son por unidad de medida (metro, yarda o unidad),
            para que la comparación sea directa.
            {todasLasFilas.length > rows.length && (
              <>
                {' '}
                Se muestran los {rows.length} mayores ahorros de {todasLasFilas.length} artículos.{' '}
                <Link href="/lista-de-precios">Ver la lista completa</Link>.
              </>
            )}
          </p>
        </section>
      )}

      {/* ── Artículos con precio por mayor ────────────────────────────────── */}
      {wholesaleProducts.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <SectionTitle as="h2" style={{ fontSize: 24, marginBottom: 18 }}>
            Artículos con precio por mayor
          </SectionTitle>
          <div className="product-grid">
            {wholesaleProducts.slice(0, 12).map((p) => (
              <ProductCard key={p.id} card={aTarjeta(p, catalog.discounts)} />
            ))}
          </div>
        </section>
      )}

      <section className="contact-strip">
        <div>
          <SectionTitle as="h2" style={{ fontSize: 23, marginBottom: 8 }}>
            ¿Necesitás cantidad de algo que no está?
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
            Pasanos la lista por WhatsApp con cantidades y te cotizamos. Si es un pedido grande y no
            lo tenemos en stock, lo conseguimos.
          </p>
        </div>
        <Button variant="whatsapp" size="lg" href={waUrl}>
          <Icon name="whatsapp-logo" weight="fill" size={19} /> Pedir cotización
        </Button>
      </section>
    </div>
  )
}

function WholesaleStep({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="wholesale-step-icon" aria-hidden>
        <Icon name={icon} size={22} color={avios.brand600} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}
