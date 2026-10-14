import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { feedItems } from '@/lib/catalog/feed'
import { BRAND, SITE_URL } from '@/lib/env'

export const revalidate = 3600

/**
 * Feed para Google Merchant Center.
 *
 * Las reglas de qué entra y qué no viven en `lib/catalog/feed.ts`, compartidas
 * con el feed de Meta: dos catálogos externos que digan precios distintos del
 * mismo artículo es peor que tener uno solo.
 *
 * Expectativa realista, para no venderlo de más: Uruguay está admitido en
 * Merchant Center y el peso uruguayo también, pero la pestaña Shopping no está
 * habilitada para usuarios uruguayos. Este feed sirve para que Google conozca
 * los productos y los pueda usar en la Búsqueda y en la ficha del negocio; no
 * para aparecer en un comparador de precios que acá todavía no existe.
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const catalog = await getCatalog(createClient())
  const products = catalog.products.filter((p) => p.status !== 'draft')

  const items = feedItems(products, catalog.discounts)
    .map(
      (i) => `    <item>
      <g:id>${escapeXml(i.id)}</g:id>
      <g:title>${escapeXml(i.title)}</g:title>
      <g:description>${escapeXml(i.description.slice(0, 5000))}</g:description>
      <g:link>${escapeXml(i.link)}</g:link>
      <g:image_link>${escapeXml(i.imageLink)}</g:image_link>
      <g:availability>${i.availability}</g:availability>
      <g:price>${i.priceValue} ${i.currency}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(i.brand)}</g:brand>
      <g:item_group_id>${escapeXml(i.itemGroupId)}</g:item_group_id>
      <g:identifier_exists>no</g:identifier_exists>${
        i.unitPricingMeasure
          ? `\n      <g:unit_pricing_measure>${i.unitPricingMeasure}</g:unit_pricing_measure>`
          : ''
      }
    </item>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(BRAND.name)}</title>
    <link>${SITE_URL}</link>
    <description>Cintas, hilos, cordones y herramientas de costura. Por mayor y por menor.</description>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
