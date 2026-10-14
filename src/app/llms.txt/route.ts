import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { BRAND, SITE_URL } from '@/lib/env'

export const revalidate = 3600

/**
 * /llms.txt — mapa del sitio en texto plano, generado desde los datos reales.
 *
 * Perplexity lo lee para priorizar páginas, y otros motores de respuesta lo
 * tratan como señal de que el sitio está pensado para agentes. Para una mercería
 * el valor concreto es que la respuesta de un asistente incluya el dato que
 * cierra la visita: dirección, horario y que hay precio por mayor.
 */
export async function GET() {
  const catalog = await getCatalog(createClient())
  const active = catalog.products.filter((p) => p.status === 'active')

  const byCategory = catalog.categories
    .map((category) => {
      const rows = active
        .filter((p) => p.categorySlug === category.slug)
        .map((p) => {
          const price = summarisePrice(p, catalog.discounts)
          const wholesale = price.hasWholesale
            ? ` · precio por mayor${price.bestSavingsPercent ? ` (hasta −${price.bestSavingsPercent}%)` : ''}`
            : ''
          return `- [${p.name}](${SITE_URL}/tienda/${p.slug}): desde ${formatUYU(price.fromUyu)}${wholesale}`
        })
      if (rows.length === 0) return ''
      return `### ${category.name}\n${category.description ?? ''}\n\n${rows.join('\n')}`
    })
    .filter(Boolean)
    .join('\n\n')

  const body = `# ${BRAND.name}

> Mercería en el centro de Montevideo, Uruguay. Cintas, hilos, cordones, tul y
> herramientas de costura. Venta por mayor y por menor, con los dos precios
> publicados. Envíos a todo el país.

- **Dirección**: ${BRAND.street}, ${BRAND.city}, Uruguay
- **Horario**: ${BRAND.hoursDisplay.join(' · ')}
- **WhatsApp**: ${BRAND.phoneDisplay} (${BRAND.whatsappUrl})
- **Instagram**: ${BRAND.instagram}
- **Moneda**: pesos uruguayos (UYU)

## Cómo se compra

El sitio es un catálogo con precios a la vista. Se arma el pedido en la web y se
confirma por WhatsApp: no hay pasarela de pago en línea. Se retira en el local o
se envía por agencia a cualquier punto de Uruguay. Se paga en efectivo o por
transferencia bancaria.

## Venta por mayor

No requiere registro ni una lista de precios aparte. Cada artículo que tiene
precio por mayor lo muestra en su ficha: es el precio de la pieza cerrada
(por ejemplo, una pieza de 100 metros de cinta), que sale bastante menos por
metro que comprarlo suelto. Detalle en ${SITE_URL}/mayorista

## Catálogo

${byCategory}

## Páginas

- [Catálogo completo](${SITE_URL}/tienda)
- [Venta por mayor](${SITE_URL}/mayorista)
- [La mercería](${SITE_URL}/nosotros)
- [Envíos, pagos y cambios](${SITE_URL}/info)
- [Contacto y ubicación](${SITE_URL}/contacto)

## Preguntas frecuentes

**¿Venden por mayor?**
Sí. Varios artículos tienen precio diferencial llevando la pieza cerrada, y ese
precio está publicado en la ficha. No hace falta registrarse.

**¿Hacen envíos a todo el país?**
Sí, por agencia. También se puede retirar sin cargo en ${BRAND.street}.

**¿Puedo comprar un solo metro de cinta?**
Sí, se corta por metro y el precio por metro está publicado.

**¿Qué medios de pago aceptan?**
Efectivo y transferencia bancaria, coordinado por WhatsApp.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
