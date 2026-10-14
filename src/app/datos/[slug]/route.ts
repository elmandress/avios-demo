import { getCatalog, findProduct } from '@/lib/catalog'
import { FICHAS_PRE_GENERADAS } from '@/lib/catalog/escala'

export const revalidate = 3600

/**
 * Los datos completos de UN producto, para el carrito.
 *
 * El carrito guarda sólo la elección (producto, variante, presentación,
 * cantidad) y recalcula el precio contra el catálogo vigente: un carrito viejo
 * nunca cobra un precio viejo. Para eso necesita las variantes y presentaciones
 * de lo que tiene adentro, y antes las sacaba del catálogo entero que viajaba
 * en cada página. Ahora pide sólo los productos que tiene, de a uno, y cada
 * respuesta es estática y la sirve el CDN.
 *
 * Se pre-generan los mismos que las fichas; el resto se arma en el primer
 * pedido y queda guardado.
 */
export async function generateStaticParams() {
  const catalog = await getCatalog()
  return catalog.products
    .filter((p) => p.status !== 'draft')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, FICHAS_PRE_GENERADAS)
    .map((p) => ({ slug: p.slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const catalog = await getCatalog()
  const product = findProduct(catalog, slug)
  if (!product || product.status === 'draft') {
    return Response.json({ error: 'No existe' }, { status: 404 })
  }
  return Response.json(product, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
