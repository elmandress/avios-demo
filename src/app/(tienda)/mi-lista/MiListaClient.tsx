'use client'

import { useMemo } from 'react'
import type { Discount, Product } from '@/lib/catalog/types'
import { useFavorites } from '@/components/FavoritesProvider'
import { ProductCard } from '@/components/ProductCard'
import { avios, Button, SectionTitle } from '@/components/ui/Primitives'

/**
 * Mi lista.
 *
 * Antes era "Favoritos" contra una tabla de Supabase. Acá vive en el navegador y
 * el nombre cambió a propósito: en una mercería esto no es una wishlist de
 * deseo, es la lista de compra de un proyecto —o la de reposición de un taller—
 * que se arma en varias sesiones y se pasa al pedido cuando está completa.
 */
export function MiListaClient({
  products,
  discounts,
}: {
  products: Product[]
  discounts: Discount[]
}) {
  const { slugs, hasMounted } = useFavorites()

  const saved = useMemo(() => {
    const order = new Map(slugs.map((s, i) => [s, i]))
    return products
      .filter((p) => order.has(p.slug))
      .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
  }, [slugs, products])

  if (!hasMounted) {
    return (
      <div style={wrap} role="status" aria-live="polite">
        <span className="sr-only">Cargando tu lista…</span>
        <div className="sk-shimmer" style={{ width: 160, height: 32, borderRadius: 6 }} />
      </div>
    )
  }

  if (saved.length === 0) {
    return (
      <div style={{ ...wrap, textAlign: 'center', paddingTop: 72, paddingBottom: 96 }}>
        <SectionTitle as="h1" style={{ fontSize: 30 }}>
          Tu lista está vacía
        </SectionTitle>
        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 15.5,
            lineHeight: 1.65,
            color: avios.ink700,
            margin: '12px auto 26px',
            maxWidth: 460,
          }}
        >
          Guardá lo que vas necesitando para un proyecto y armá el pedido cuando la tengas completa.
          Se guarda en este navegador, sin cuenta ni registro.
        </p>
        <Button href="/tienda" variant="primary" size="lg">
          Ver el catálogo
        </Button>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <SectionTitle as="h1" style={{ fontSize: 30, marginBottom: 6 }}>
        Mi lista
      </SectionTitle>
      <p
        style={{
          fontFamily: avios.fontSans,
          fontSize: 14.5,
          color: avios.ink500,
          margin: '0 0 28px',
        }}
      >
        {saved.length} {saved.length === 1 ? 'artículo guardado' : 'artículos guardados'} en este
        navegador
      </p>
      <div className="product-grid">
        {saved.map((p, i) => (
          <ProductCard key={p.id} product={p} discounts={discounts} priority={i < 4} />
        ))}
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: '36px 22px 80px',
}
