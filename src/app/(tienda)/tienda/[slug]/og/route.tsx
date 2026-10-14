import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { getCatalog, findCategory, findProduct } from '@/lib/catalog'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { UNIT_NOUN } from '@/lib/catalog/types'
import { aTarjeta, resumirCategoria, tarjetasDe } from '@/lib/catalog/tarjeta'
import { BRAND, SITE_URL } from '@/lib/env'
import { botImageUrl } from '@/lib/media'

// La tarjeta que aparece cuando se comparte una ficha por WhatsApp o Instagram.
//
// Es la vidriera de Avíos: quien atiende pega el link de la cinta en el chat y
// el cliente ve la foto, el nombre y el precio sin abrir nada. Antes se veía
// sólo la foto suelta.
//
// Patrón de Dahila (4ff38f3): se dibuja con next/og y se pasa a JPEG con sharp.
// Satori sólo saca PNG, y una foto en PNG pesa cerca de 1 MB; WhatsApp descarta
// las imágenes pesadas y el preview no carga. En JPEG pesa una décima parte.
// El precio sale de pricing.ts (vía aTarjeta): el mismo número que la grilla.

const FUCSIA = '#CA1A4B'
const CREMA = '#FEFAF1'
const TINTA = '#36231D'
const TINTA_SUAVE = '#5C463E'
const ORO = '#C79A3E'
const VERDE = '#0F6B47'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const catalog = await getCatalog()
  const product = findProduct(catalog, slug)
  const category = product ? null : findCategory(catalog, slug)
  if ((!product || product.status === 'draft') && !category) {
    return new Response('No existe', { status: 404 })
  }

  const card = product ? aTarjeta(product, catalog.discounts) : null
  const precio = product ? summarisePrice(product, catalog.discounts) : null
  // Una categoría se presenta con lo que tiene adentro: foto de uno de sus
  // artículos, cuántos son y desde qué precio.
  const resumen = category ? resumirCategoria(tarjetasDe(catalog), category.slug) : null
  const nombre = product?.name ?? category?.name ?? BRAND.name
  const urlFoto = product?.media[0]?.url ?? resumen?.foto?.url ?? null
  const foto = urlFoto ? botImageUrl(SITE_URL, urlFoto, 640) : null
  const unidad =
    precio && precio.fromIsPerUnit && precio.fromUnit !== 'u'
      ? ` ${UNIT_NOUN[precio.fromUnit].article} ${UNIT_NOUN[precio.fromUnit].singular}`
      : ''
  const textoPrecio =
    precio && precio.fromUyu > 0
      ? `${card?.precio.desde ? 'desde ' : ''}${formatUYU(precio.fromUyu)}${unidad}`
      : resumen?.desde
        ? `desde ${formatUYU(resumen.desde)}`
        : null
  const mayor = precio?.hasWholesale
    ? precio.bestSavingsPercent
      ? `Por mayor, hasta ${precio.bestSavingsPercent}% menos`
      : 'También por mayor'
    : null
  const detalle =
    card?.variantes ??
    (resumen
      ? `${resumen.cantidad} ${resumen.cantidad === 1 ? 'artículo' : 'artículos'} · por mayor y por menor`
      : null)

  const imagen = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: CREMA, fontFamily: 'sans-serif' }}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" width={540} height={630} style={{ objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              width: 540,
              height: 630,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F7EDE4',
              color: FUCSIA,
              fontSize: 40,
              letterSpacing: 8,
              fontWeight: 700,
            }}
          >
            AVÍOS
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '54px 56px',
          }}
        >
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 5, color: ORO, fontWeight: 700 }}>
            MERCERÍA AVÍOS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                fontSize: nombre.length > 24 ? 52 : 62,
                lineHeight: 1.05,
                color: TINTA,
                fontWeight: 700,
              }}
            >
              {nombre}
            </div>
            {detalle && <div style={{ display: 'flex', fontSize: 26, color: TINTA_SUAVE }}>{detalle}</div>}
            {textoPrecio && (
              <div style={{ display: 'flex', marginTop: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    background: FUCSIA,
                    color: '#FFFFFF',
                    fontSize: 30,
                    fontWeight: 700,
                    padding: '12px 26px',
                    borderRadius: 999,
                  }}
                >
                  {textoPrecio}
                </div>
              </div>
            )}
            {mayor && <div style={{ display: 'flex', fontSize: 24, color: VERDE, fontWeight: 700 }}>{mayor}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 21, color: TINTA_SUAVE }}>
            <span>San José 851 esq. Andes · Montevideo</span>
            <span style={{ color: FUCSIA, fontWeight: 700, marginTop: 4 }}>Pedidos por WhatsApp · envíos a todo el país</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )

  const png = Buffer.from(await imagen.arrayBuffer())
  const jpg = await sharp(png).jpeg({ quality: 82, progressive: true }).toBuffer()
  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      // El CDN la guarda un día y la renueva de fondo: el crawler de WhatsApp
      // corta a los pocos segundos y no puede esperar a que se dibuje.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
