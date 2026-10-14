// La tarjeta: lo mínimo de un producto que necesitan la grilla y el buscador.
//
// Por qué existe. Hasta acá el layout de la tienda le mandaba al navegador el
// catálogo ENTERO —variantes, presentaciones, precios, descripciones— en cada
// página, incluso en /contacto. Con los 20 artículos de la demo son 29 KB; con
// los miles del catálogo real serían varios MB dentro de cada página, más lo
// mismo en cada prefetch, más un build de miles de fichas que no termina.
//
// La tarjeta es la versión de grilla de un producto: nombre, foto, el precio
// "desde" ya calculado, las señales (por mayor, descuento, sin stock) y los
// textos de búsqueda ya normalizados. Todo lo que es plata sale de
// `summarisePrice`, igual que antes: la tarjeta no hace cuentas propias, sólo
// guarda el resultado.
//
// Se arma en el servidor (índice en /indice.json, grillas pre-renderizadas) y,
// en la demo, también en el navegador a partir del catálogo editado en el panel.

import { camposDeBusqueda, type CamposBusqueda } from '@/lib/search/match'
import { summarisePrice, type ProductPriceSummary } from './pricing'
import type { Catalog, Category, Discount, Product, ProductStatus } from './types'

export interface TarjetaProducto {
  slug: string
  name: string
  categorySlug: string
  status: ProductStatus
  /** Etiqueta libre de la dueña ("Nuevo", "Último stock"). */
  badge: string | null
  sortOrder: number
  photo: { url: string; alt: string } | null
  /** "7 anchos", "2 colores"… o null si el producto no tiene variantes. */
  variantes: string | null
  precio: Pick<
    ProductPriceSummary,
    | 'fromUyu'
    | 'fromListUyu'
    | 'fromUnit'
    | 'fromIsPerUnit'
    | 'hasWholesale'
    | 'bestSavingsPercent'
    | 'discountPercent'
  > & {
    /** Mostrar "desde": hay más de una variante o más de un precio por menor. */
    desde: boolean
  }
  busqueda: CamposBusqueda
}

/**
 * Cómo se llama en plural el eje por el que varía el producto. Decir "2 medidas"
 * de una cinta reflectiva que viene en gris y en flúor es describirla mal: lo
 * que cambia es el modelo, no la medida.
 */
function nombreDelEje(product: Product): string {
  switch (product.variants.find((v) => v.axis)?.axis) {
    case 'color':
      return 'colores'
    case 'ancho':
      return 'anchos'
    case 'medida':
      return 'medidas'
    default:
      return 'versiones'
  }
}

export function aTarjeta(
  product: Product,
  discounts: readonly Discount[],
  categoria?: string
): TarjetaProducto {
  const p = summarisePrice(product, discounts)
  const cantidad = product.variants.filter((v) => v.label).length
  const foto = product.media[0]

  return {
    slug: product.slug,
    name: product.name,
    categorySlug: product.categorySlug,
    status: product.status,
    badge: product.badge,
    sortOrder: product.sortOrder,
    photo: foto ? { url: foto.url, alt: foto.alt || product.name } : null,
    variantes: cantidad > 1 ? `${cantidad} ${nombreDelEje(product)}` : null,
    precio: {
      fromUyu: p.fromUyu,
      fromListUyu: p.fromListUyu,
      fromUnit: p.fromUnit,
      fromIsPerUnit: p.fromIsPerUnit,
      hasWholesale: p.hasWholesale,
      bestSavingsPercent: p.bestSavingsPercent,
      discountPercent: p.discountPercent,
      desde: cantidad > 1 || p.retailRange?.low !== p.retailRange?.high,
    },
    busqueda: camposDeBusqueda(product, categoria),
  }
}

/** Las tarjetas publicables de un catálogo, en el orden manual de la tienda. */
export function tarjetasDe(catalog: Pick<Catalog, 'products' | 'categories' | 'discounts'>): TarjetaProducto[] {
  const nombres = new Map(catalog.categories.map((c: Category) => [c.slug, c.name]))
  return catalog.products
    .filter((p) => p.status !== 'draft')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => aTarjeta(p, catalog.discounts, nombres.get(p.categorySlug)))
}

/**
 * Cuántas tarjetas pinta la grilla por tanda. 24 entra en tres pantallas de
 * teléfono y en dos de escritorio. Vive acá y no en TiendaClient porque lo usa
 * también el servidor, y una constante de un módulo 'use client' no llega al
 * servidor como valor.
 */
export const TANDA = 24

/** Lo que sirve /indice.json. */
export interface Indice {
  generatedAt: string
  tarjetas: TarjetaProducto[]
}

/**
 * Lo que muestra la baldosa de una categoría: cuántos artículos hay, desde qué
 * precio, una foto y los primeros nombres. Se calcula en el servidor para que
 * la portada no tenga que mandarle al navegador todos los productos sólo para
 * contarlos.
 */
export interface ResumenCategoria {
  cantidad: number
  desde: number | null
  foto: { url: string; alt: string } | null
  muestra: string[]
}

export function resumirCategoria(tarjetas: readonly TarjetaProducto[], categorySlug: string): ResumenCategoria {
  const adentro = tarjetas.filter((t) => t.categorySlug === categorySlug)
  const precios = adentro.map((t) => t.precio.fromUyu).filter((n) => n > 0)
  return {
    cantidad: adentro.length,
    desde: precios.length > 0 ? Math.min(...precios) : null,
    foto: adentro.find((t) => t.photo)?.photo ?? null,
    muestra: adentro.slice(0, 3).map((t) => t.name),
  }
}
