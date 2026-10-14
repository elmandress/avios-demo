'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Discount, Product } from '@/lib/catalog/types'
import { UNIT_NOUN } from '@/lib/catalog/types'
import {
  applyDiscount,
  defaultSelection,
  formatContent,
  formatUYU,
  countNoun,
  formatUnitPrice,
  resolveDiscountPercent,
  savingsPercent,
  wholesaleUpgrade,
} from '@/lib/catalog/pricing'
import { buildEnquiryMessage, whatsappLink } from '@/lib/cart/whatsapp'
import { useCatalog } from '@/components/CatalogProvider'
import { useCart } from '@/components/CartProvider'
import { FormatSelector, PriceMatrix } from '@/components/FormatSelector'
import { QuantityStepper } from '@/components/QuantityStepper'
import { UpgradeHint } from '@/components/UpgradeHint'
import { ProductGallery } from '@/components/ProductGallery'
import { ProductCard } from '@/components/ProductCard'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ShareButton } from '@/components/ShareButton'
import { avios, Badge, Breadcrumb, Button, Icon, SectionTitle } from '@/components/ui/Primitives'
import { track } from '@/lib/analytics'

// Ficha de producto.
//
// La regla que ordena todo este archivo: lo que el comprador ve acá y lo que sale
// en el mensaje de WhatsApp tienen que ser el mismo cálculo. Por eso el bloque
// "vas a pedir" existe: no es decoración, es el recibo previo. Con presentaciones
// que traen 100 metros adentro, "cantidad 2" es ambiguo hasta que alguien
// escribe "2 piezas · 200 m en total · $ 792".

interface Props {
  product: Product
  categoryName: string
  related: Product[]
  discounts: Discount[]
  whatsappUrl: string
  siteUrl: string
  shippingEstimate: string
}

export function ProductDetailsClient({
  product: serverProduct,
  categoryName: serverCategoryName,
  related: serverRelated,
  discounts: serverDiscounts,
  whatsappUrl,
  siteUrl,
  shippingEstimate,
}: Props) {
  // Se vuelve a buscar el producto en el catálogo del cliente: si se editó en el
  // panel, la ficha muestra lo editado. Si no está (producto nuevo todavía sin
  // página pre-renderizada, o borrado), se usa lo que mandó el servidor.
  const catalog = useCatalog()
  const product = catalog.productBySlug(serverProduct.slug) ?? serverProduct
  const discounts = catalog.discounts.length > 0 || catalog.edited ? catalog.discounts : serverDiscounts
  const categoryName = catalog.categoryBySlug(product.categorySlug)?.name ?? serverCategoryName
  const related = catalog.edited
    ? catalog.products
        .filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug && p.status !== 'draft')
        .slice(0, 4)
    : serverRelated

  const { add } = useCart()
  const initial = useMemo(() => defaultSelection(product), [product])

  const [variantId, setVariantId] = useState(initial?.variantId ?? '')
  const [formatId, setFormatId] = useState(initial?.formatId ?? '')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    track('product_view', { product: product.slug })
  }, [product.slug])

  const discountPercent = resolveDiscountPercent(product, discounts)
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const format = variant?.formats.find((f) => f.id === formatId) ?? variant?.formats[0]
  const selectableVariants = product.variants.filter((v) => v.label)

  // Al cambiar de variante hay que reapuntar la presentación: los ids son por
  // variante, así que el id anterior no existe en la nueva y el bloque de compra
  // quedaría sin precio.
  const chooseVariant = (nextId: string) => {
    const next = product.variants.find((v) => v.id === nextId)
    if (!next) return
    setVariantId(nextId)
    const sameTier = next.formats.find((f) => f.tier === format?.tier && f.available)
    setFormatId((sameTier ?? next.formats.find((f) => f.available) ?? next.formats[0])?.id ?? '')
    setQty(1)
  }

  if (!variant || !format) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
        <SectionTitle as="h1">{product.name}</SectionTitle>
        <p style={{ fontFamily: avios.fontSans, color: avios.ink700 }}>
          Este artículo no tiene precio publicado todavía. Escribinos y te lo pasamos.
        </p>
        <Button variant="whatsapp" href={whatsappUrl}>
          <Icon name="whatsapp-logo" weight="fill" size={18} /> Consultar por WhatsApp
        </Button>
      </div>
    )
  }

  const soldOut = product.status === 'soldout'
  const canBuy = !soldOut && format.available && format.priceUyu !== null
  const unitFinal = applyDiscount(format.unitPriceUyu, discountPercent)
  const formatFinal = format.priceUyu === null ? null : applyDiscount(format.priceUyu, discountPercent)
  const lineTotal = formatFinal === null ? null : Math.round(formatFinal * qty * 100) / 100
  const saving = savingsPercent(format, variant)
  const contentQty = format.contentQty ?? 1
  const totalContent = contentQty * qty

  // Cómo nombrar lo que se está contando: "metros" cuando se corta a medida,
  // "piezas" cuando la presentación es cerrada, "unidades" en artículos sueltos.
  // El plural depende de la cantidad, así que se calculan los dos: el rótulo del
  // selector siempre va en plural, el resumen concuerda con lo elegido.
  const unitNounPlural = countNoun(format, 2)
  const unitNounForQty = countNoun(format, qty)

  // ¿Conviene la pieza cerrada con esta cantidad? Se recalcula con cada cambio
  // del selector: es la única forma de que el aviso sea verdadero.
  const upgrade = wholesaleUpgrade(variant, format, qty, discountPercent)

  const handleAdd = () => {
    add(product, variant, format, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const enquiryUrl = whatsappLink(
    whatsappUrl,
    buildEnquiryMessage(product.name, variant.label, siteUrl, product.slug)
  )

  const galleryImages = product.media.map((m) => ({ url: m.url, alt: m.alt || product.name }))

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 22px 0' }}>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Tienda', href: '/tienda' },
          { label: categoryName, href: `/tienda/${product.categorySlug}` },
          { label: product.name },
        ]}
      />

      <div className="pdp-split">
        <div>
          <ProductGallery
            images={galleryImages}
            productName={product.name}
            categorySlug={product.categorySlug}
          />
        </div>

        <div className="pdp-detail">
          <div>
            <span
              style={{
                fontFamily: avios.fontSans,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: avios.brand600,
              }}
            >
              {categoryName}
            </span>
            <h1
              style={{
                fontFamily: avios.fontDisplay,
                fontWeight: 400,
                fontSize: 33,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: avios.ink900,
                margin: '8px 0 12px',
              }}
            >
              {product.name}
            </h1>

            {/* Titular de precio: el número grande es SIEMPRE el de la
                presentación elegida, no un "desde" que después no se paga. */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: avios.fontSans,
                  fontSize: 30,
                  fontWeight: 600,
                  color: discountPercent > 0 ? avios.sale : avios.ink900,
                }}
              >
                {formatFinal === null ? formatUYU(unitFinal) : formatUYU(formatFinal)}
              </span>
              {discountPercent > 0 && format.priceUyu !== null && (
                <span
                  style={{
                    fontFamily: avios.fontSans,
                    fontSize: 17,
                    color: avios.ink500,
                    textDecoration: 'line-through',
                  }}
                >
                  {formatUYU(format.priceUyu)}
                </span>
              )}
              <span style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink500 }}>
                {contentQty > 1
                  ? `la ${format.label.toLowerCase().startsWith('pieza') ? 'pieza' : 'presentación'} de ${formatContent(contentQty, format.unit)}`
                  : format.unit === 'u'
                    ? format.label.toLowerCase()
                    : `${UNIT_NOUN[format.unit].article} ${UNIT_NOUN[format.unit].singular}`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              {discountPercent > 0 && <Badge tone="sale">−{discountPercent}% de descuento</Badge>}
              {saving !== null && (
                <Badge tone="saving">
                  Ahorrás {saving}% por {UNIT_NOUN[format.unit].singular}
                </Badge>
              )}
              {soldOut && <Badge tone="sold">Sin stock</Badge>}
            </div>
          </div>

          {/* Variantes */}
          {selectableVariants.length > 1 && (
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend
                style={{
                  fontFamily: avios.fontSans,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: avios.ink500,
                  padding: 0,
                  marginBottom: 9,
                }}
              >
                {axisLabel(product)}
              </legend>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {selectableVariants.map((v) => {
                  const on = v.id === variant.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={!v.available}
                      onClick={() => chooseVariant(v.id)}
                      style={{
                        minHeight: 44,
                        padding: '0 15px',
                        borderRadius: 8,
                        fontFamily: avios.fontSans,
                        fontSize: 14,
                        fontWeight: on ? 600 : 400,
                        background: on ? avios.ink900 : '#fff',
                        // Una variante agotada sigue teniendo que leerse: el
                        // tachado ya comunica que no está, el color no hace falta
                        // que la esconda.
                        color: on ? '#fff' : v.available ? avios.ink900 : avios.ink500,
                        border: `1px solid ${on ? avios.ink900 : avios.borderStrong}`,
                        cursor: v.available ? 'pointer' : 'not-allowed',
                        textDecoration: v.available ? 'none' : 'line-through',
                        transition: `all 140ms ${avios.ease}`,
                      }}
                    >
                      {v.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <FormatSelector
            variant={variant}
            selectedId={format.id}
            onSelect={(id) => {
              setFormatId(id)
              setQty(1)
            }}
            discountPercent={discountPercent}
          />

          {canBuy && (
            <>
              <QuantityStepper value={qty} onChange={setQty} min={format.minQty} unitLabel={unitNounPlural} />

              {/* El recibo previo. Desambigua la cantidad ANTES de agregar. */}
              <div
                style={{
                  background: avios.paper50,
                  border: `1px solid ${avios.border}`,
                  borderRadius: 10,
                  padding: '13px 15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontFamily: avios.fontSans, fontSize: 13.5, color: avios.ink700 }}>
                  Vas a pedir{' '}
                  <strong style={{ color: avios.ink900 }}>
                    {qty} {unitNounForQty}
                  </strong>
                  {contentQty > 1 && (
                    <>
                      {' '}· {formatContent(totalContent, format.unit)} en total ·{' '}
                      {formatUnitPrice(unitFinal, format.unit)}
                    </>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: avios.fontSans,
                    fontSize: 19,
                    fontWeight: 700,
                    color: avios.ink900,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatUYU(lineTotal ?? 0)}
                </span>
              </div>

              {upgrade && (
                <UpgradeHint
                  upgrade={upgrade}
                  onSwitch={() => {
                    setFormatId(upgrade.format.id)
                    setQty(upgrade.packs)
                  }}
                />
              )}

              <Button variant="primary" size="lg" full onClick={handleAdd}>
                {added ? '✓ Agregado al pedido' : 'Agregar al pedido'}
              </Button>
            </>
          )}

          {!canBuy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink700, margin: 0 }}>
                {soldOut
                  ? 'Este artículo está sin stock por ahora. Escribinos y te avisamos cuando vuelva.'
                  : 'Esta presentación se coordina por WhatsApp: nos falta confirmar la medida de la pieza.'}
              </p>
              <Button variant="whatsapp" size="lg" full href={enquiryUrl}>
                <Icon name="whatsapp-logo" weight="fill" size={19} /> Consultar por WhatsApp
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <FavoriteButton slug={product.slug} variant="inline" />
            <ShareButton title={product.name} text={`Mirá esto en Mercería Avíos: ${product.name}`} />
            <a
              href={enquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: avios.fontSans,
                fontSize: 14,
                color: avios.ink700,
                textDecoration: 'none',
              }}
            >
              <Icon name="whatsapp-logo" size={17} /> Consultar
            </a>
          </div>

          {/* Confianza, pegado al CTA */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '16px 0 0',
              borderTop: `1px solid ${avios.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <Fact icon="storefront">Retirás en San José 851 esq. Andes, o te lo enviamos.</Fact>
            <Fact icon="truck">{shippingEstimate || 'Envíos a todo Uruguay por agencia.'}</Fact>
            <Fact icon="credit-card">Efectivo o transferencia, coordinado por WhatsApp.</Fact>
            {product.variants.some((v) => v.formats.some((f) => f.tier === 'mayor')) && (
              <Fact icon="stack">
                Precio por mayor llevando la pieza cerrada. Sin registro ni mínimo de compra.
              </Fact>
            )}
          </ul>

          {product.description && (
            <p
              style={{
                fontFamily: avios.fontSans,
                fontSize: 15,
                lineHeight: 1.7,
                color: avios.ink700,
                margin: 0,
                paddingTop: 16,
                borderTop: `1px solid ${avios.border}`,
              }}
            >
              {product.description}
            </p>
          )}

          {(product.material || product.sku || product.colors.length > 0) && (
            <dl
              style={{
                margin: 0,
                paddingTop: 16,
                borderTop: `1px solid ${avios.border}`,
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: '9px 18px',
                fontFamily: avios.fontSans,
                fontSize: 14,
              }}
            >
              {product.material && (
                <>
                  <dt style={dtStyle}>Material</dt>
                  <dd style={ddStyle}>{product.material}</dd>
                </>
              )}
              {product.sku && (
                <>
                  <dt style={dtStyle}>Código</dt>
                  <dd style={ddStyle}>{product.sku}</dd>
                </>
              )}
              {product.colors.length > 0 && (
                <>
                  <dt style={dtStyle}>Colores</dt>
                  <dd style={{ ...ddStyle, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {product.colors.map((c) => (
                      <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 15,
                            height: 15,
                            borderRadius: 999,
                            background: c.hex,
                            boxShadow: `inset 0 0 0 1px ${avios.borderStrong}`,
                          }}
                        />
                        {c.name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          )}
        </div>
      </div>

      {/* Lista de precios completa: lo que un mayorista quiere ver de una. */}
      {selectableVariants.length > 1 && (
        <section
          style={{
            marginTop: 56,
            padding: '24px 22px',
            background: avios.paper50,
            border: `1px solid ${avios.border}`,
            borderRadius: 14,
          }}
        >
          <SectionTitle as="h2" style={{ fontSize: 21, marginBottom: 6 }}>
            Lista de precios
          </SectionTitle>
          <PriceMatrix product={product} discountPercent={discountPercent} />
        </section>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: 72 }}>
          <SectionTitle
            as="h2"
            style={{
              fontSize: 22,
              marginBottom: 22,
              paddingBottom: 12,
              borderBottom: `1px solid ${avios.border}`,
            }}
          >
            También en {categoryName}
          </SectionTitle>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} discounts={discounts} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Fact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        fontFamily: avios.fontSans,
        fontSize: 14,
        color: avios.ink700,
        lineHeight: 1.5,
      }}
    >
      <span style={{ flexShrink: 0, paddingTop: 1 }}>
        <Icon name={icon} size={18} color={avios.brand600} />
      </span>
      {children}
    </li>
  )
}

function axisLabel(product: Product): string {
  switch (product.variants.find((v) => v.axis)?.axis) {
    case 'ancho':
      return 'Ancho'
    case 'color':
      return 'Color'
    case 'medida':
      return 'Medida'
    default:
      return 'Modelo'
  }
}

const dtStyle: React.CSSProperties = { color: avios.ink500, margin: 0 }
const ddStyle: React.CSSProperties = { color: avios.ink900, margin: 0 }
