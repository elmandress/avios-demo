'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { normalizeText } from '@/lib/media'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { deleteProduct, moveProduct, upsertProduct } from '@/lib/admin/store'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { avios, Badge, Button, Icon } from '@/components/ui/Primitives'

export default function PanelProductos() {
  const { catalog } = useAdminCatalog()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todo')

  const byCategory = useMemo(
    () => new Map(catalog.categories.map((c) => [c.slug, c.name])),
    [catalog.categories]
  )

  const products = useMemo(() => {
    const q = normalizeText(search)
    return [...catalog.products]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((p) => categoryFilter === 'todo' || p.categorySlug === categoryFilter)
      .filter((p) => !q || normalizeText(`${p.name} ${p.sku ?? ''}`).includes(q))
  }, [catalog.products, search, categoryFilter])

  const remove = (id: string, name: string) => {
    if (confirm(`¿Borrar "${name}"? Se saca del sitio. Podés restaurar el catálogo original desde el menú.`)) {
      deleteProduct(id)
    }
  }

  const toggleStatus = (id: string) => {
    const p = catalog.products.find((x) => x.id === id)
    if (!p) return
    // Publicado ↔ borrador. "Sin stock" se pone desde la ficha, porque implica
    // decidir qué variante es la que faltó.
    upsertProduct({ ...p, status: p.status === 'active' ? 'draft' : 'active' })
  }

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <h1>Productos</h1>
          <p>
            {catalog.products.length} artículos. El orden de la lista es el orden en que aparecen en
            la tienda.
          </p>
        </div>
        <Button href="/panel/productos/nuevo" variant="primary">
          <Icon name="plus" size={17} /> Cargar producto
        </Button>
      </header>

      <div className="panel-filters">
        <label className="panel-search">
          <Icon name="magnifying-glass" size={17} color={avios.ink500} />
          <span className="sr-only">Buscar producto</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por categoría</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="todo">Todas las categorías</option>
            {catalog.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {products.length === 0 ? (
        <p className="panel-empty">No hay productos con ese filtro.</p>
      ) : (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th scope="col">Orden</th>
                <th scope="col">Artículo</th>
                <th scope="col">Categoría</th>
                <th scope="col">Desde</th>
                <th scope="col">Por mayor</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const price = summarisePrice(p, catalog.discounts)
                const photo = p.media[0]
                const variantLabels = p.variants.filter((v) => v.label)
                return (
                  <tr key={p.id}>
                    <td className="panel-order">
                      <button
                        type="button"
                        onClick={() => moveProduct(p.id, -1)}
                        disabled={i === 0}
                        aria-label={`Subir ${p.name}`}
                      >
                        <Icon name="caret-up" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(p.id, 1)}
                        disabled={i === products.length - 1}
                        aria-label={`Bajar ${p.name}`}
                      >
                        <Icon name="caret-up" size={14} />
                      </button>
                    </td>
                    <th scope="row">
                      <Link href={`/panel/productos/${p.id}`} className="panel-product-cell">
                        <span className="panel-thumb">
                          {photo ? (
                            <Image
                              src={photo.url}
                              alt=""
                              fill
                              sizes="44px"
                              quality={82}
                              unoptimized={photo.url.startsWith('data:')}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <ProductPlaceholder categorySlug={p.categorySlug} />
                          )}
                        </span>
                        <span>
                          {p.name || <em className="panel-muted">(sin nombre)</em>}
                          {variantLabels.length > 1 && (
                            <span className="panel-slug panel-muted">
                              {variantLabels.length} variantes
                            </span>
                          )}
                          {p.needsReview.length > 0 && (
                            <span className="panel-review-flag" title={p.needsReview.join(' · ')}>
                              <Icon name="warning" size={14} /> a confirmar
                            </span>
                          )}
                        </span>
                      </Link>
                    </th>
                    <td>
                      {byCategory.get(p.categorySlug) ?? (
                        <span className="panel-review-flag">
                          <Icon name="warning" size={14} /> sin categoría
                        </span>
                      )}
                    </td>
                    <td>{price.fromUyu > 0 ? formatUYU(price.fromUyu) : '—'}</td>
                    <td>
                      {price.hasWholesale ? (
                        <Badge tone="saving">
                          {price.bestSavingsPercent !== null ? `−${price.bestSavingsPercent}%` : 'Sí'}
                        </Badge>
                      ) : (
                        <span className="panel-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="panel-status-toggle"
                        onClick={() => toggleStatus(p.id)}
                        title="Cambiar entre publicado y borrador"
                      >
                        {p.status === 'active' ? (
                          <Badge tone="saving">Publicado</Badge>
                        ) : p.status === 'soldout' ? (
                          <Badge tone="sold">Sin stock</Badge>
                        ) : (
                          <Badge tone="sold">Borrador</Badge>
                        )}
                      </button>
                    </td>
                    <td className="panel-actions">
                      <Link href={`/panel/productos/${p.id}`} aria-label={`Editar ${p.name}`}>
                        Editar
                      </Link>
                      <button type="button" onClick={() => remove(p.id, p.name)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
