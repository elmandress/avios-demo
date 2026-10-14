'use client'

import { useMemo } from 'react'
import { formatUYU } from '@/lib/catalog/pricing'
import { normalizeText } from '@/lib/media'
import { puntuarCampos } from '@/lib/search/match'
import { useCatalog } from './CatalogProvider'
import { useIndice } from './useIndice'
import { Enlace } from './Enlace'
import { avios } from './ui/Primitives'

/**
 * Las sugerencias del buscador del header.
 *
 * Es un componente aparte para poder bajarlo recién cuando se abre la lupa (ver
 * Header): trae la búsqueda con el diccionario del rubro y el índice del
 * catálogo, que quien entra a /contacto no necesita. El campo de texto queda en
 * el header a propósito: en iPhone el teclado sólo se abre si el campo se
 * enfoca dentro del mismo toque, y un campo que llega después no lo abre.
 */
export default function ResultadosBusqueda({ query }: { query: string }) {
  const { categories } = useCatalog()
  const tarjetas = useIndice(true)

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories])

  const hits = useMemo(() => {
    const q = normalizeText(query)
    if (q.length < 2 || !tarjetas) return []
    return tarjetas
      // El ranking sale de lib/search/match, el MISMO módulo que filtra la
      // grilla de /tienda. Cuando eran dos códigos distintos, la sugerencia
      // mostraba el producto y al apretar Enter la grilla decía "sin resultados".
      .map((p) => ({ p, score: puntuarCampos(p.busqueda, query) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map(({ p }) => ({
        slug: p.slug,
        name: p.name,
        price: formatUYU(p.precio.fromUyu),
        category: categoryName.get(p.categorySlug) ?? '',
      }))
  }, [query, tarjetas, categoryName])

  if (query.length < 2) return null

  return (
    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
      {hits.length === 0 ? (
        <li style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink500, padding: '10px 2px' }}>
          {tarjetas === null
            ? 'Buscando…'
            : 'Nada con ese nombre. Probá con la categoría o preguntanos por WhatsApp.'}
        </li>
      ) : (
        hits.map((hit) => (
          <li key={hit.slug}>
            <Enlace
              href={`/tienda/${hit.slug}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                padding: '10px 2px',
                textDecoration: 'none',
                borderTop: `1px solid ${avios.border}`,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontFamily: avios.fontSans, fontSize: 15, color: avios.ink900 }}>{hit.name}</span>
                <span style={{ fontFamily: avios.fontSans, fontSize: 12.5, color: avios.ink500 }}>{hit.category}</span>
              </span>
              <span style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink700, whiteSpace: 'nowrap' }}>
                desde {hit.price}
              </span>
            </Enlace>
          </li>
        ))
      )}
    </ul>
  )
}
