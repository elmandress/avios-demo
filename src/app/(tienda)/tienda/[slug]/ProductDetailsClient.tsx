'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Discount, Product } from '@/lib/catalog/types'
import { aTarjeta, type TarjetaProducto } from '@/lib/catalog/tarjeta'
import { registrarProductos } from '@/lib/catalog/cliente'
import { recordarVisto } from '@/lib/vistos'
import { fijarConsulta } from '@/lib/consulta'
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
import { VistosRecientes } from '@/components/VistosRecientes'
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
  /** Tarjetas de la misma categoría, ya armadas en el servidor. */
  related: TarjetaProducto[]
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
  // Si el catálogo se editó en el panel (demo), la ficha muestra lo editado. Si
  // no, lo que mandó el servidor: la ficha ya no depende de que el navegador
  // tenga el catálogo entero.
  const catalog = useCatalog()
  const overlay = catalog.overlay
  const product = overlay?.products.find((p) => p.slug === serverProduct.slug) ?? serverProduct
  const discounts = overlay ? overlay.discounts : serverDiscounts
  const categoryName = catalog.categoryBySlug(product.categorySlug)?.name ?? serverCategoryName
  const related = useMemo(
    () =>
      overlay
        ? overlay.products
            .filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug && p.status !== 'draft')
            .slice(0, 4)
            .map((p) => aTarjeta(p, overlay.discounts))
        : serverRelated,
    [overlay, product.categorySlug, product.slug, serverRelated]
  )

  // El carrito recalcula precios contra el producto completo: se lo deja
  // guardado para que agregar no tenga que volver a pedirlo.
  useEffect(() => {
    registrarProductos([serverProduct])
  }, [serverProduct])

  const { add } = useCart()
  const initial = useMemo(() => defaultSelection(product), [product])

  const [variantId, setVariantId] = useState(initial?.variantId ?? '')
  const [formatId, setFormatId] = useState(initial?.formatId ?? '')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  // La foto del modelo o color elegido (ver `mediaIndex` en types.ts).
  const [galleryFocus, setGalleryFocus] = useState<{ index: number; tick: number } | undefined>(undefined)

  // Barra fija de compra en el teléfono (patrón de Dahila). Aparece cuando el
  // botón "Agregar al pedido" quedó ARRIBA, fuera de pantalla: quien bajó a
  // leer la lista de precios o la descripción no tiene que volver a subir. Si
  // el botón todavía está abajo (no llegó), no aparece: ahí estorbaría.
  const botonRef = useRef<HTMLDivElement>(null)
  const [barraVisible, setBarraVisible] = useState(false)
  useEffect(() => {
    const el = botonRef.current
    if (!el) return
    // Con el scroll y no con IntersectionObserver: el observador sólo avisa
    // cuando el botón cruza el borde de la pantalla, y un salto de scroll (un
    // ancla, "volver arriba", un swipe largo) lo pasa de abajo a arriba sin
    // cruzarlo. 80 px es el header fijo: detrás de él, el botón no se ve.
    let cuadro = 0
    const medir = () => {
      cuadro = 0
      setBarraVisible(el.getBoundingClientRect().bottom < 80)
    }
    const alScroll = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir)
    }
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', alScroll)
      if (cuadro) cancelAnimationFrame(cuadro)
    }
  }, [])
  // El botón flotante de WhatsApp se corre para arriba mientras la barra está a
  // la vista (ver .wa-float en globals.css): si no, tapa "Agregar".
  useEffect(() => {
    const html = document.documentElement
    if (barraVisible) html.dataset.barraCompra = ''
    else delete html.dataset.barraCompra
    return () => {
      delete html.dataset.barraCompra
    }
  }, [barraVisible])

  useEffect(() => {
    track('product_view', { product: product.slug })
  }, [product.slug])

  // "Viste hace poco": se guarda la tarjeta, no el producto (ver lib/vistos).
  useEffect(() => {
    recordarVisto(aTarjeta(product, discounts, categoryName))
  }, [product, discounts, categoryName])

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
    if (typeof next.mediaIndex === 'number') {
      const index = next.mediaIndex
      setGalleryFocus((prev) => ({ index, tick: (prev?.tick ?? 0) + 1 }))
    }
    const sameTier = next.formats.find((f) => f.tier === format?.tier && f.available)
    setFormatId((sameTier ?? next.formats.find((f) => f.available) ?? next.formats[0])?.id ?? '')
    setQty(1)
  }

  // La burbuja de WhatsApp abre con este artículo y la variante elegida.
  const mensajeConsulta = buildEnquiryMessage(product.name, variant?.label ?? '', siteUrl, product.slug)
  useEffect(() => {
    fijarConsulta(mensajeConsulta)
    return () => fijarConsulta(null)
  }, [mensajeConsulta])

  const enquiryUrl = whatsappLink(whatsappUrl, mensajeConsulta)
  const galleryImages = product.media.map((m) => ({ url: m.url, alt: m.alt || product.name }))

  // Artículo "a consultar": el catálogo lo trae sin precio. Se muestra entero
  // —fotos, descripción, código— y el botón es la consulta, no un carrito.
  if (!variant || !format) {
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
            <ProductGallery images={galleryImages} productName={product.name} categorySlug={product.categorySlug} />
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
              <SectionTitle as="h1">{product.name}</SectionTitle>
              <p style={{ fontFamily: avios.fontSans, fontSize: 20, fontWeight: 600, color: avios.ink900, margin: 0 }}>
                Consultar precio
              </p>
            </div>
            <p style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink700, margin: 0 }}>
              Este artículo no tiene precio publicado en el catálogo. Escribinos y te pasamos precio, medidas y
              modelos disponibles.
            </p>
            <Button variant="whatsapp" size="lg" full href={enquiryUrl}>
              <Icon name="whatsapp-logo" weight="fill" size={19} /> Consultar por WhatsApp
            </Button>
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
          </div>
        </div>
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
            focus={galleryFocus}
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
              <div
                style={{
                  display: 'flex',
                  gap: 7,
                  flexWrap: 'wrap',
                  // Un marroquí trae 91 modelos: la lista entera empujaba el
                  // precio y el botón varias pantallas para abajo.
                  ...(selectableVariants.length > 24
                    ? { maxHeight: 232, overflowY: 'auto' as const, padding: 2, margin: -2 }
                    : null),
                }}
              >
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
                      {v.hex && (
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-block',
                            width: 13,
                            height: 13,
                            borderRadius: 999,
                            background: v.hex,
                            boxShadow: `inset 0 0 0 1px ${on ? 'rgba(255,255,255,0.55)' : avios.borderStrong}`,
                            marginRight: 7,
                            verticalAlign: '-1px',
                          }}
                        />
                      )}
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

              <div ref={botonRef}>
                <Button variant="primary" size="lg" full onClick={handleAdd}>
                  {added ? '✓ Agregado al pedido' : 'Agregar al pedido'}
                </Button>
              </div>

              <div className="barra-compra" data-visible={barraVisible ? 'si' : 'no'} aria-hidden={!barraVisible}>
                <div className="barra-compra-texto">
                  <span>
                    {qty} {unitNounForQty}
                    {variant.label ? ` · ${variant.label}` : ''}
                  </span>
                  <strong>{formatUYU(lineTotal ?? 0)}</strong>
                </div>
                <Button variant="primary" onClick={handleAdd} tabIndex={barraVisible ? 0 : -1}>
                  {added ? '✓ Agregado' : 'Agregar'}
                </Button>
              </div>
            </>
          )}

          {!canBuy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink700, margin: 0 }}>
                {soldOut
                  ? 'Este artículo está sin stock por ahora. Escribinos y te avisamos cuando vuelva.'
                  : 'Esta presentación se coordina por WhatsApp: nos falta confirmar la medida de la pieza.'}
              </p>
              <div ref={botonRef}>
                <Button variant="whatsapp" size="lg" full href={enquiryUrl}>
                  <Icon name="whatsapp-logo" weight="fill" size={19} /> Consultar por WhatsApp
                </Button>
              </div>

              {/* La barra fija también existe sin precio: ofrece la consulta, no
                  un "Agregar" que no puede funcionar (Dahila, 3fe1e40). */}
              <div className="barra-compra" data-visible={barraVisible ? 'si' : 'no'} aria-hidden={!barraVisible}>
                <div className="barra-compra-texto">
                  <span>{soldOut ? 'Sin stock por ahora' : 'Se coordina por WhatsApp'}</span>
                  <strong style={{ fontSize: 15 }}>{product.name}</strong>
                </div>
                <Button variant="whatsapp" href={enquiryUrl} tabIndex={barraVisible ? 0 : -1}>
                  Consultar
                </Button>
              </div>
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
            {/* "¿Cuándo pago?" contestado al lado del botón (Dahila, 3cc8b3a).
                Antes decía "efectivo o transferencia", que no está confirmado:
                esto es verdad por cómo funciona el sitio. */}
            <Fact icon="credit-card">
              No pagás nada en el sitio: confirmamos el pedido y la forma de pago por WhatsApp.
            </Fact>
            {product.variants.some((v) => v.formats.some((f) => f.tier === 'mayor')) && (
              <Fact icon="stack">
                Precio por mayor llevando la pieza cerrada, sin registrarte.
              </Fact>
            )}
            {product.wholesaleNote && <Fact icon="stack">{product.wholesaleNote}</Fact>}
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
            {related.map((card) => (
              <ProductCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      )}

      <VistosRecientes excluir={product.slug} />

      {/* Lugar para la barra fija de compra, para que no tape el pie. Siempre
          presente en teléfono: si apareciera junto con la barra, movería la
          página al hacer scroll. */}
      <div className="barra-compra-espacio" aria-hidden />
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
