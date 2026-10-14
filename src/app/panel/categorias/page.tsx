'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Category } from '@/lib/catalog/types'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { slugify } from '@/lib/media'
import { deleteCategory, newId, upsertCategory } from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Button, Icon } from '@/components/ui/Primitives'

export default function PanelCategorias() {
  const { catalog } = useAdminCatalog()
  const [editing, setEditing] = useState<Category | null>(null)

  const sorted = [...catalog.categories].sort((a, b) => a.sortOrder - b.sortOrder)

  const remove = (c: Category) => {
    const count = catalog.products.filter((p) => p.categorySlug === c.slug).length
    const warning =
      count > 0
        ? `\n\n${count} artículo(s) van a quedar sin categoría (no se borran, pero dejan de aparecer en la navegación).`
        : ''
    if (confirm(`¿Borrar la categoría "${c.name}"?${warning}`)) deleteCategory(c.id)
  }

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <h1>Categorías</h1>
          <p>El orden de acá es el orden en la navegación, la portada y el pie.</p>
        </div>
        <Button
          variant="primary"
          onClick={() =>
            setEditing({
              id: newId('cat'),
              slug: '',
              name: '',
              description: null,
              sortOrder: sorted.length + 1,
            })
          }
        >
          <Icon name="plus" size={17} /> Nueva categoría
        </Button>
      </header>

      {editing && (
        <CategoryEditor
          category={editing}
          existing={catalog.categories}
          onCancel={() => setEditing(null)}
          onSave={(c) => {
            upsertCategory(c)
            setEditing(null)
          }}
        />
      )}

      <div className="panel-table-wrap">
        <table className="panel-table">
          <thead>
            <tr>
              <th scope="col">Orden</th>
              <th scope="col">Categoría</th>
              <th scope="col">Artículos</th>
              <th scope="col">Desde</th>
              <th scope="col">Texto de la página</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const products = catalog.products.filter(
                (p) => p.categorySlug === c.slug && p.status !== 'draft'
              )
              const prices = products
                .map((p) => summarisePrice(p, catalog.discounts).fromUyu)
                .filter((n) => n > 0)
              return (
                <tr key={c.id}>
                  <td>{c.sortOrder}</td>
                  <th scope="row">
                    <Link href={`/tienda/${c.slug}`}>{c.name}</Link>
                    <span className="panel-muted panel-slug">/tienda/{c.slug}</span>
                  </th>
                  <td>{products.length}</td>
                  <td>{prices.length > 0 ? formatUYU(Math.min(...prices)) : '—'}</td>
                  <td className="panel-longtext">
                    {c.description ?? <span className="panel-muted">Sin texto</span>}
                  </td>
                  <td className="panel-actions">
                    <button type="button" onClick={() => setEditing(c)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => remove(c)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function CategoryEditor({
  category,
  existing,
  onCancel,
  onSave,
}: {
  category: Category
  existing: Category[]
  onCancel: () => void
  onSave: (c: Category) => void
}) {
  const [draft, setDraft] = useState(category)
  const [error, setError] = useState<string | null>(null)
  const isNew = !existing.some((c) => c.id === category.id)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return setError('Poné un nombre.')
    const slug = draft.slug.trim() || slugify(name)
    if (existing.some((c) => c.slug === slug && c.id !== draft.id)) {
      return setError(`Ya hay una categoría en /tienda/${slug}.`)
    }
    onSave({ ...draft, name, slug, description: draft.description?.trim() || null })
  }

  return (
    <form className="panel-inline-editor" onSubmit={submit}>
      <h2>{isNew ? 'Nueva categoría' : `Editar ${category.name}`}</h2>

      {error && (
        <div className="panel-alert" role="alert">
          <Icon name="warning" size={19} />
          <div>{error}</div>
        </div>
      )}

      <div className="panel-form-grid">
        <label className="panel-field">
          <span className="panel-field-label">Nombre</span>
          <input
            value={draft.name}
            onChange={(e) => {
              const name = e.target.value
              setDraft((d) => (isNew ? { ...d, name, slug: slugify(name) } : { ...d, name }))
            }}
            placeholder="Botones"
          />
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Dirección</span>
          <input
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
            placeholder="botones"
          />
          <span className="panel-field-hint">/tienda/{draft.slug || '…'}</span>
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Orden</span>
          <input
            type="number"
            min={1}
            value={draft.sortOrder}
            onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 1 }))}
            style={{ width: 90 }}
          />
        </label>
      </div>

      <label className="panel-field">
        <span className="panel-field-label">Texto de la página</span>
        <textarea
          rows={3}
          value={draft.description ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="Qué hay en esta categoría. Se lee arriba de la grilla y lo usa Google."
        />
      </label>

      <div style={{ display: 'flex', gap: 9 }}>
        <Button type="submit" variant="primary">
          Guardar
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
