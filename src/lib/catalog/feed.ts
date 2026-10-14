// El catálogo como feed, para los lugares donde Avíos también aparece.
//
// Vive acá, en un solo lugar, porque lo consumen DOS destinos que tienen que
// decir exactamente lo mismo:
//
//   · /merchant-feed.xml   → Google Merchant Center
//   · /catalogo-meta.csv   → Meta Commerce Manager, que es de donde salen el
//                            catálogo de WhatsApp Business, la tienda de
//                            Instagram y la de Facebook.
//
// Ese segundo destino es el que más importa acá, y conviene entender por qué:
// Avíos vende por WhatsApp. Hoy el catálogo de WhatsApp —si existe— se carga a
// mano, producto por producto, desde el teléfono. Con cientos de artículos eso
// no se hace, y si se hace, queda viejo. Con un feed, WhatsApp e Instagram leen
// del sitio: se cambia el precio en el panel y se actualiza en los tres lados.
//
// Sobre Google, un dato que conviene tener presente antes de prometer nada:
// Uruguay está admitido en Merchant Center y su moneda también, pero la pestaña
// Shopping NO está habilitada para usuarios uruguayos. O sea que el feed sirve
// para que Google conozca los productos, no para aparecer en un comparador que
// acá todavía no existe. Por eso para Avíos el feed de Meta rinde más que el de
// Google, y la ficha de Google rinde más que los dos.

import { applyDiscount, resolveDiscountPercent } from './pricing'
import type { Discount, Product } from './types'
import { BRAND, SITE_URL } from '@/lib/env'
import { botImageUrl } from '@/lib/media'

export interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  /** Número con dos decimales, sin moneda. */
  priceValue: string
  currency: 'UYU'
  availability: 'in_stock' | 'out_of_stock'
  itemGroupId: string
  brand: string
  /** "1m" cuando el precio publicado es por metro. Sólo lo usa Google. */
  unitPricingMeasure?: string
}

/**
 * Una fila por presentación POR MENOR de cada variante.
 *
 * No una por producto: lo que un catálogo externo lista tiene que ser algo
 * comprable a ese precio. Publicar el precio por metro de una pieza mayorista
 * como si fuera el precio de una unidad es motivo de desaprobación del feed —y
 * era lo que hacía el modelo viejo.
 *
 * Las presentaciones por mayor quedan afuera a propósito: son una condición de
 * compra, no un producto distinto, y ninguno de los dos catálogos tiene un campo
 * que lo represente sin mentir sobre la unidad. El precio por mayor se explica
 * en la ficha del sitio, que es a donde lleva el enlace.
 *
 * Los artículos sin foto real también quedan afuera: los dos exigen imagen, y
 * una ilustración de categoría no cumple.
 */
export function feedItems(products: Product[], discounts: readonly Discount[]): FeedItem[] {
  const items: FeedItem[] = []

  for (const product of products) {
    const photo = product.media[0]
    if (!photo) continue

    const discountPercent = resolveDiscountPercent(product, discounts)
    const availability = product.status === 'soldout' ? 'out_of_stock' : 'in_stock'

    for (const variant of product.variants) {
      for (const format of variant.formats) {
        if (format.tier !== 'menor' || !format.available || format.priceUyu === null) continue

        const title = [product.name, variant.label, format.contentQty === 1 ? '' : format.label]
          .filter(Boolean)
          .join(' · ')

        items.push({
          id: format.id,
          title,
          description:
            product.description ??
            `${product.name} en ${BRAND.name}, ${BRAND.street}, ${BRAND.city}.`,
          link: `${SITE_URL}/tienda/${product.slug}`,
          imageLink: botImageUrl(SITE_URL, photo.url),
          priceValue: applyDiscount(format.priceUyu, discountPercent).toFixed(2),
          currency: 'UYU',
          availability,
          itemGroupId: product.slug,
          brand: BRAND.name,
          // Le dice a Google que el precio es por metro y no por pieza, así la
          // comparación con otras tiendas es la correcta.
          unitPricingMeasure: format.unit === 'm' && format.contentQty === 1 ? '1m' : undefined,
        })
      }
    }
  }

  return items
}
