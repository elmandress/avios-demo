'use client'

import { useState } from 'react'
import type { Discount } from '@/lib/catalog/types'
import { resolveDiscountPercent } from '@/lib/catalog/pricing'
import { deleteDiscount, newId, upsertDiscount } from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Badge, Button, Icon } from '@/components/ui/Primitives'

// Descuentos por lote: toda la tienda o una categoría.
//
// El descuento propio de cada artículo se carga en su ficha. Cuando los dos
// aplican, gana el más alto (nunca se suman): sumarlos es el camino corto a
// vender con un 70% sin querer.

export default function PanelDescuentos() {
  const { catalog } = useAdminCatalog()
  const [editing, setEditing] = useState<Discount | null>(null)
  // El reloj se lee UNA vez, en el inicializador del estado: leerlo en cada
  // render hace que el componente no sea puro (una regla vigente puede
  // "vencerse" entre dos renders sin que haya cambiado nada).
  const [now] = useState(() => Date.now())

  const vigente = (d: Discount) =>
    d.active &&
    d.percent > 0 &&
    (!d.startsAt || new Date(d.startsAt).getTime() <= now) &&
    (!d.endsAt || new Date(d.endsAt).getTime() >= now)

  const alcance = (d: Discount) => {
    if (d.scope === 'all') return catalog.products.filter((p) => p.status !== 'draft').length
    return catalog.products.filter((p) => p.categorySlug === d.categorySlug && p.status !== 'draft')
      .length
  }

  // Cuántos artículos tienen HOY un descuento efectivo, contando también los
  // propios de cada ficha. Es el número que importa antes de publicar.
  const conDescuento = catalog.products.filter(
    (p) => p.status !== 'draft' && resolveDiscountPercent(p, catalog.discounts, now) > 0
  ).length

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <h1>Descuentos</h1>
          <p>
            Reglas que aplican a toda la tienda o a una categoría. Hoy hay{' '}
            <strong>{conDescuento}</strong> artículos con descuento.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() =>
            setEditing({
              id: newId('disc'),
              label: '',
              scope: 'all',
              categorySlug: null,
              percent: 10,
              active: false,
              startsAt: null,
              endsAt: null,
            })
          }
        >
          <Icon name="plus" size={17} /> Nuevo descuento
        </Button>
      </header>

      <p className="panel-note">
        <Icon name="info" size={17} />
        <span>
          Si un artículo tiene descuento propio <em>y</em> le aplica una regla de acá,{' '}
          <strong>gana el más alto</strong>. Nunca se suman.
        </span>
      </p>

      {editing && (
        <DiscountEditor
          discount={editing}
          categories={catalog.categories}
          onCancel={() => setEditing(null)}
          onSave={(d) => {
            upsertDiscount(d)
            setEditing(null)
          }}
        />
      )}

      {catalog.discounts.length === 0 ? (
        <p className="panel-empty">No hay descuentos cargados.</p>
      ) : (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th scope="col">Descuento</th>
                <th scope="col">Aplica a</th>
                <th scope="col">%</th>
                <th scope="col">Vigencia</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.discounts.map((d) => (
                <tr key={d.id}>
                  <th scope="row">{d.label || <em className="panel-muted">(sin nombre)</em>}</th>
                  <td>
                    {d.scope === 'all'
                      ? 'Toda la tienda'
                      : catalog.categories.find((c) => c.slug === d.categorySlug)?.name ??
                        'Categoría borrada'}
                    <span className="panel-slug panel-muted">{alcance(d)} artículos</span>
                  </td>
                  <td>{d.percent}%</td>
                  <td>
                    {d.startsAt || d.endsAt ? (
                      <>
                        {d.startsAt ? new Date(d.startsAt).toLocaleDateString('es-UY') : 'ya'} →{' '}
                        {d.endsAt ? new Date(d.endsAt).toLocaleDateString('es-UY') : 'sin fin'}
                      </>
                    ) : (
                      <span className="panel-muted">Siempre</span>
                    )}
                  </td>
                  <td>
                    {vigente(d) ? (
                      <Badge tone="saving">Vigente</Badge>
                    ) : d.active ? (
                      <Badge tone="sold">Fuera de fecha</Badge>
                    ) : (
                      <Badge tone="sold">Apagado</Badge>
                    )}
                  </td>
                  <td className="panel-actions">
                    <button type="button" onClick={() => setEditing(d)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => upsertDiscount({ ...d, active: !d.active })}
                    >
                      {d.active ? 'Apagar' : 'Prender'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Borrar el descuento "${d.label}"?`)) deleteDiscount(d.id)
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function DiscountEditor({
  discount,
  categories,
  onCancel,
  onSave,
}: {
  discount: Discount
  categories: { slug: string; name: string }[]
  onCancel: () => void
  onSave: (d: Discount) => void
}) {
  const [draft, setDraft] = useState(discount)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.label.trim()) return setError('Poné un nombre para reconocerlo después.')
    if (draft.percent < 1 || draft.percent > 90) return setError('El porcentaje va de 1 a 90.')
    if (draft.scope === 'category' && !draft.categorySlug) return setError('Elegí una categoría.')
    if (draft.startsAt && draft.endsAt && draft.startsAt > draft.endsAt) {
      return setError('La fecha de inicio es posterior a la de fin.')
    }
    onSave({ ...draft, label: draft.label.trim() })
  }

  return (
    <form className="panel-inline-editor" onSubmit={submit}>
      <h2>{discount.label ? `Editar ${discount.label}` : 'Nuevo descuento'}</h2>

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
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Semana de la costura"
          />
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Aplica a</span>
          <select
            value={draft.scope === 'all' ? 'all' : draft.categorySlug ?? ''}
            onChange={(e) =>
              setDraft((d) =>
                e.target.value === 'all'
                  ? { ...d, scope: 'all', categorySlug: null }
                  : { ...d, scope: 'category', categorySlug: e.target.value }
              )
            }
          >
            <option value="all">Toda la tienda</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                Sólo {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Porcentaje</span>
          <input
            type="number"
            min={1}
            max={90}
            value={draft.percent}
            onChange={(e) => setDraft((d) => ({ ...d, percent: Number(e.target.value) || 0 }))}
            style={{ width: 90 }}
          />
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Desde</span>
          <input
            type="date"
            value={draft.startsAt?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startsAt: e.target.value ? `${e.target.value}T00:00:00` : null }))
            }
          />
          <span className="panel-field-hint">Vacío = ya</span>
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Hasta</span>
          <input
            type="date"
            value={draft.endsAt?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setDraft((d) => ({ ...d, endsAt: e.target.value ? `${e.target.value}T23:59:59` : null }))
            }
          />
          <span className="panel-field-hint">Vacío = sin fin</span>
        </label>

        <label className="panel-field">
          <span className="panel-field-label">Estado</span>
          <label className="panel-inline-check">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
            />
            Prendido
          </label>
        </label>
      </div>

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
