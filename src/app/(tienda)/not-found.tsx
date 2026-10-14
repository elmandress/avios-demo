import Link from 'next/link'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { ProductCard } from '@/components/ProductCard'
import { avios } from '@/components/ui/tokens'
import { Button, Eyebrow, SectionTitle } from '@/components/ui/Primitives'

export default async function NotFound() {
  // Un 404 que sólo dice "no existe" pierde la visita. Con las categorías y
  // algunos artículos reales, un link roto sigue llevando a algún lado.
  const catalog = await getCatalog(createClient())
  const suggestions = catalog.products.filter((p) => p.status === 'active').slice(0, 4)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 22px 72px' }}>
      <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 56px' }}>
        <Eyebrow>Error 404</Eyebrow>
        <SectionTitle as="h1" style={{ fontSize: 'clamp(30px, 5vw, 46px)', margin: '12px 0 14px' }}>
          Esta página no existe
        </SectionTitle>
        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 16.5,
            lineHeight: 1.65,
            color: avios.ink700,
            margin: '0 0 26px',
          }}
        >
          Puede que el link esté viejo o que el artículo ya no esté publicado. Probá desde el
          catálogo, o escribinos y te decimos si lo tenemos.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button href="/tienda" variant="primary" size="lg">
            Ver el catálogo
          </Button>
          <Button href="/contacto" variant="secondary" size="lg">
            Escribinos
          </Button>
        </div>
      </div>

      <nav aria-label="Categorías" style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
          {catalog.categories.map((c) => (
            <Link
              key={c.slug}
              href={`/tienda/${c.slug}`}
              style={{
                padding: '9px 15px',
                borderRadius: 999,
                border: `1px solid ${avios.borderStrong}`,
                fontFamily: avios.fontSans,
                fontSize: 14,
                color: avios.ink900,
                textDecoration: 'none',
              }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      {suggestions.length > 0 && (
        <div className="product-grid">
          {suggestions.map((p) => (
            <ProductCard key={p.id} product={p} discounts={catalog.discounts} />
          ))}
        </div>
      )}
    </div>
  )
}
