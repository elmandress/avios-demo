import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { resumirCategoria, tarjetasDe } from '@/lib/catalog/tarjeta'
import { HomeClient } from './HomeClient'

export const revalidate = 3600

export default async function HomePage() {
  const catalog = await getCatalog(createClient())
  // Tarjetas y no productos: la portada sólo necesita lo que dibuja. Antes le
  // mandaba al navegador el catálogo entero para contar artículos por categoría.
  const tarjetas = tarjetasDe(catalog)
  const activas = tarjetas.filter((t) => t.status === 'active')

  // Destacados: el orden manual de la tienda. Los que llevan a la banda
  // mayorista son los que efectivamente tienen presentación por pieza — no una
  // selección a dedo que puede quedar desactualizada al cambiar precios.
  const featured = activas.slice(0, 8)
  const wholesale = activas.filter((t) => t.precio.hasWholesale).slice(0, 3)
  const tiles = catalog.categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ category, resumen: resumirCategoria(tarjetas, category.slug) }))

  const faqItems = [
    {
      q: '¿Venden por mayor?',
      a: 'Sí. Varios artículos tienen precio diferencial llevando la pieza cerrada, y el precio está publicado en la ficha de cada uno. No hace falta registrarse ni pedir una lista aparte.',
    },
    {
      q: '¿Hacen envíos a todo el país?',
      a: 'Sí, por agencia. También podés retirar sin cargo por el local, San José 851 esquina Andes, Montevideo.',
    },
    {
      q: '¿Qué medios de pago aceptan?',
      a: 'Efectivo y transferencia bancaria. Lo coordinamos por WhatsApp al confirmar el pedido.',
    },
    {
      q: '¿Puedo comprar un solo metro de cinta?',
      a: 'Sí. Cortamos por metro lo que necesites, y el precio por metro está publicado igual que el de la pieza.',
    },
    {
      q: '¿Cuál es el horario del local?',
      a: 'Lunes a viernes de 9:00 a 18:30 y sábados de 9:00 a 13:30, en San José 851 esquina Andes.',
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomeClient
        tiles={tiles}
        featured={featured}
        wholesale={wholesale}
        settings={catalog.settings}
      />
    </>
  )
}
