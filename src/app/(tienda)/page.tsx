import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { summarisePrice } from '@/lib/catalog/pricing'
import { HomeClient } from './HomeClient'

export const revalidate = 3600

export default async function HomePage() {
  const catalog = await getCatalog(createClient())
  const active = catalog.products.filter((p) => p.status === 'active')

  // Destacados: el orden manual de la tienda. Los que llevan a la banda
  // mayorista son los que efectivamente tienen presentación por pieza — no una
  // selección a dedo que puede quedar desactualizada al cambiar precios.
  const featured = [...active].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 8)
  const wholesale = active.filter((p) => summarisePrice(p, catalog.discounts).hasWholesale)

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
        categories={catalog.categories}
        allProducts={active}
        featured={featured}
        wholesale={wholesale}
        discounts={catalog.discounts}
        settings={catalog.settings}
      />
    </>
  )
}
