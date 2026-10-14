import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCatalog, findCategory, findProduct, productsInCategory } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import {
  applyDiscount,
  formatUYU,
  resolveDiscountPercent,
  summarisePrice,
} from '@/lib/catalog/pricing'
import type { Discount, Product } from '@/lib/catalog/types'
import { BRAND, SITE_URL } from '@/lib/env'
import { OG_BASE } from '@/lib/og'
import { botImageUrl } from '@/lib/media'
import { TiendaClient } from '../TiendaClient'
import { ProductDetailsClient } from './ProductDetailsClient'

export const revalidate = 3600

/**
 * Este segmento resuelve DOS formas de URL:
 *   /tienda/cintas               → página de categoría
 *   /tienda/cinta-raso-doble-faz → ficha de producto
 *
 * Orden: primero categorías (son siete), después productos. Si no matchea
 * ninguna, 404.
 *
 * `generateStaticParams` existe para que Next NO trate `params` como una API de
 * request y renderice la ruta en modo dinámico: con la lista de slugs acá, cada
 * ficha y cada categoría se pre-renderiza como HTML estático que sirve el CDN.
 */
export async function generateStaticParams() {
  const catalog = await getCatalog(createClient())
  return [
    ...catalog.categories.map((c) => ({ slug: c.slug })),
    ...catalog.products.filter((p) => p.status !== 'draft').map((p) => ({ slug: p.slug })),
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const catalog = await getCatalog(createClient())

  const category = findCategory(catalog, slug)
  if (category) {
    const title = `${category.name} — por mayor y por menor`
    const description =
      category.description ??
      `${category.name} en Mercería Avíos, San José 851, Montevideo. Precio por menor y por mayor a la vista, envíos a todo el país.`
    return {
      title,
      description,
      alternates: { canonical: `/tienda/${slug}` },
      openGraph: { ...OG_BASE, title, description, url: `${SITE_URL}/tienda/${slug}` },
    }
  }

  const product = findProduct(catalog, slug)
  if (!product || product.status === 'draft') return { title: 'No encontrado' }

  const price = summarisePrice(product, catalog.discounts)
  const description =
    product.description ??
    `${product.name} en Mercería Avíos. Desde ${formatUYU(price.fromUyu)}. Retiro en San José 851, Montevideo, o envío a todo el país.`

  const image = product.media[0]
  return {
    title: product.name,
    description: description.slice(0, 300),
    alternates: { canonical: `/tienda/${slug}` },
    openGraph: {
      ...OG_BASE,
      type: 'website',
      title: product.name,
      description: description.slice(0, 200),
      url: `${SITE_URL}/tienda/${slug}`,
      ...(image ? { images: [{ url: botImageUrl(SITE_URL, image.url), alt: product.name }] } : {}),
    },
  }
}

export default async function TiendaSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const catalog = await getCatalog(createClient())

  // ─── Categoría ─────────────────────────────────────────────────────────────
  const category = findCategory(catalog, slug)
  if (category) {
    // La grilla la arma TiendaClient desde el catálogo del cliente (para que
    // refleje lo editado en el panel), así que acá sólo hace falta el JSON-LD.
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd([{ name: category.name, slug }])),
          }}
        />
        <TiendaClient activeCategory={slug} heading={category.name} intro={category.description} />
      </>
    )
  }

  // ─── Producto ──────────────────────────────────────────────────────────────
  const product = findProduct(catalog, slug)
  if (!product || product.status === 'draft') notFound()

  const productCategory = findCategory(catalog, product.categorySlug)
  const related = productsInCategory(catalog, product.categorySlug)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, catalog.discounts)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              ...(productCategory
                ? [{ name: productCategory.name, slug: productCategory.slug }]
                : []),
              { name: product.name, slug: product.slug },
            ])
          ),
        }}
      />
      <ProductDetailsClient
        product={product}
        categoryName={productCategory?.name ?? 'Catálogo'}
        related={related}
        discounts={catalog.discounts}
        whatsappUrl={catalog.settings.contact_whatsapp_url || BRAND.whatsappUrl}
        siteUrl={SITE_URL}
        shippingEstimate={catalog.settings.shipping_estimate ?? ''}
      />
    </>
  )
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────

function breadcrumbJsonLd(trail: Array<{ name: string; slug: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tienda', item: `${SITE_URL}/tienda` },
      ...trail.map((t, i) => ({
        '@type': 'ListItem',
        position: 3 + i,
        name: t.name,
        item: `${SITE_URL}/tienda/${t.slug}`,
      })),
    ],
  }
}

/**
 * Product schema.
 *
 * El rango de precios sale SÓLO de las presentaciones por menor. Con el modelo
 * viejo, `lowPrice` se calculaba sobre todas las filas de talle e incluía el
 * precio POR METRO dentro de una pieza mayorista: Google publicaba "desde
 * $ 3,96" para una cinta cuyo metro suelto cuesta $ 13. Un precio que nadie
 * puede pagar en el sitio es, para Google, motivo de desaprobar la ficha.
 */
function productJsonLd(product: Product, discounts: readonly Discount[]) {
  const price = summarisePrice(product, discounts)
  const discountPercent = resolveDiscountPercent(product, discounts)

  const retailPrices = product.variants
    .flatMap((v) => v.formats)
    .filter((f) => f.tier === 'menor' && f.available && f.priceUyu !== null)
    .map((f) => applyDiscount(f.priceUyu as number, discountPercent))

  const low = retailPrices.length > 0 ? Math.min(...retailPrices) : price.fromUyu
  const high = retailPrices.length > 0 ? Math.max(...retailPrices) : price.fromUyu
  const hasRange = low !== high

  const availability =
    product.status === 'soldout' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'

  // Un año: el catálogo de una mercería no cambia de precio todas las semanas y
  // Google pide la fecha para no marcar la oferta como vencida.
  const priceValidUntil = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    material: product.material ?? undefined,
    url: `${SITE_URL}/tienda/${product.slug}`,
    image: product.media.map((m) => botImageUrl(SITE_URL, m.url)),
    brand: { '@type': 'Brand', name: BRAND.name },
    offers: {
      '@type': hasRange ? 'AggregateOffer' : 'Offer',
      priceCurrency: 'UYU',
      ...(hasRange
        ? { lowPrice: low.toFixed(2), highPrice: high.toFixed(2), offerCount: retailPrices.length }
        : { price: low.toFixed(2), priceValidUntil }),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      url: `${SITE_URL}/tienda/${product.slug}`,
      seller: { '@type': 'Organization', name: BRAND.name, url: SITE_URL },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: BRAND.country },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: BRAND.country,
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 15,
        returnMethod: 'https://schema.org/ReturnInStore',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  }
}
