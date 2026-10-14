'use client'

import { useMemo, useState } from 'react'
import { formatUYU } from '@/lib/catalog/pricing'
import {
  applyPriceAdjustment,
  previewPriceAdjustment,
  type PriceRounding,
  type PriceScope,
} from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Button, Icon } from '@/components/ui/Primitives'

// Ajuste masivo de precios.
//
// El catálogo tiene 58 presentaciones repartidas en 42 variantes. Cuando hay que
// mover los precios —que en este país es seguido— hacerlo a mano es una tarde de
// trabajo y una errata asegurada. Acá son tres campos y una vista previa.
//
// La vista previa es obligatoria por diseño: no hay forma de aplicar sin haber
// visto antes la lista completa de qué precio pasa a cuánto. Un cambio masivo
// que no se puede revisar es la manera más rápida de romper un catálogo.

const ROUNDING: Array<{ value: PriceRounding; label: string; hint: string }> = [
  { value: 'ninguno', label: 'Sin redondear', hint: '14,04' },
  { value: '1', label: 'Al peso', hint: '14' },
  { value: '5', label: 'A 5 pesos', hint: '15' },
  { value: '10', label: 'A 10 pesos', hint: '10' },
]

export default function PanelPrecios() {
  const { catalog } = useAdminCatalog()

  const [scope, setScope] = useState<PriceScope>('todo')
  const [categorySlug, setCategorySlug] = useState(catalog.categories[0]?.slug ?? '')
  const [productId, setProductId] = useState(catalog.products[0]?.id ?? '')
  const [percent, setPercent] = useState(8)
  const [rounding, setRounding] = useState<PriceRounding>('1')
  const [onlyTier, setOnlyTier] = useState<'menor' | 'mayor' | ''>('')
  const [done, setDone] = useState<number | null>(null)

  const changes = useMemo(
    () =>
      previewPriceAdjustment(catalog, {
        scope,
        categorySlug,
        productId,
        percent,
        rounding,
        onlyTier: onlyTier || null,
      }),
    [catalog, scope, categorySlug, productId, percent, rounding, onlyTier]
  )

  const apply = () => {
    const cuantos = changes.length
    if (cuantos === 0) return

    const alcance =
      scope === 'todo'
        ? 'todo el catálogo'
        : scope === 'categoria'
          ? `la categoría ${catalog.categories.find((c) => c.slug === categorySlug)?.name ?? ''}`
          : (catalog.products.find((p) => p.id === productId)?.name ?? 'el producto')

    const verbo = percent > 0 ? 'subiendo' : 'bajando'
    if (!confirm(`Vas a cambiar ${cuantos} precios de ${alcance}, ${verbo} un ${Math.abs(percent)}%.\n\n¿Aplicar?`)) {
      return
    }

    applyPriceAdjustment(changes)
    setDone(cuantos)
    setPercent(0)
    setTimeout(() => setDone(null), 6000)
  }

  return (
    <>
      <header className="panel-header">
        <h1>Ajustar precios</h1>
        <p>
          Subí o bajá varios precios de una vez. Siempre vas a ver la lista completa antes de que se
          aplique nada.
        </p>
      </header>

      {done !== null && (
        <div className="panel-ok" role="status">
          <Icon name="check" size={19} />
          <span>
            Listo: se actualizaron <strong>{done}</strong> precios. La tienda ya los muestra.
          </span>
        </div>
      )}

      <section className="panel-section">
        <div className="price-form">
          <label className="panel-field">
            <span className="panel-field-label">Qué ajustar</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as PriceScope)}>
              <option value="todo">Todo el catálogo</option>
              <option value="categoria">Una categoría</option>
              <option value="producto">Un producto</option>
            </select>
          </label>

          {scope === 'categoria' && (
            <label className="panel-field">
              <span className="panel-field-label">Categoría</span>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                {catalog.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === 'producto' && (
            <label className="panel-field">
              <span className="panel-field-label">Producto</span>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {catalog.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="panel-field">
            <span className="panel-field-label">Porcentaje</span>
            <div className="price-percent">
              <button type="button" onClick={() => setPercent((v) => v - 1)} aria-label="Bajar un punto">
                <Icon name="minus" size={15} />
              </button>
              <input
                type="number"
                value={percent}
                step={1}
                onChange={(e) => setPercent(Number(e.target.value) || 0)}
                aria-label="Porcentaje de ajuste"
              />
              <span aria-hidden>%</span>
              <button type="button" onClick={() => setPercent((v) => v + 1)} aria-label="Subir un punto">
                <Icon name="plus" size={15} />
              </button>
            </div>
            <span className="panel-field-hint">
              {percent > 0 ? 'Los precios suben' : percent < 0 ? 'Los precios bajan' : 'Sin cambio'} ·
              poné negativo para bajar
            </span>
          </label>

          <label className="panel-field">
            <span className="panel-field-label">Redondeo</span>
            <select value={rounding} onChange={(e) => setRounding(e.target.value as PriceRounding)}>
              {ROUNDING.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — queda en {r.hint}
                </option>
              ))}
            </select>
            <span className="panel-field-hint">Nadie cobra 13,52 el metro</span>
          </label>

          <label className="panel-field">
            <span className="panel-field-label">Alcance</span>
            <select
              value={onlyTier}
              onChange={(e) => setOnlyTier(e.target.value as 'menor' | 'mayor' | '')}
            >
              <option value="">Por menor y por mayor</option>
              <option value="menor">Sólo precios por menor</option>
              <option value="mayor">Sólo precios por mayor</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-header-row" style={{ marginBottom: 14 }}>
          <div>
            <h2>Vista previa</h2>
            <p className="panel-where">
              {changes.length === 0
                ? 'Con estos valores no cambia ningún precio.'
                : `${changes.length} precios van a cambiar.`}
            </p>
          </div>
          <Button variant="primary" onClick={apply} disabled={changes.length === 0}>
            {changes.length === 0 ? 'Aplicar' : `Aplicar a ${changes.length} precios`}
          </Button>
        </div>

        {changes.length > 0 && (
          <div className="panel-table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th scope="col">Artículo</th>
                  <th scope="col">Presentación</th>
                  <th scope="col">Ahora</th>
                  <th scope="col">Queda en</th>
                  <th scope="col">Por unidad</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => (
                  <tr key={c.formatId}>
                    <th scope="row">
                      {c.productName}
                      {c.variantLabel && (
                        <span className="panel-slug panel-muted">{c.variantLabel}</span>
                      )}
                    </th>
                    <td>{c.formatLabel}</td>
                    <td className="panel-muted">
                      {c.fromUyu === null ? 'sin total' : formatUYU(c.fromUyu)}
                    </td>
                    <td>
                      <strong>{c.toUyu === null ? 'sin total' : formatUYU(c.toUyu)}</strong>
                    </td>
                    {/* Sin color de alarma: que un precio suba es lo que se
                        pidió, no un problema. La flecha alcanza para leer la
                        dirección de un vistazo en una tabla de 58 filas. */}
                    <td className="price-unit-cell">
                      <span className="panel-muted">{formatUYU(c.fromUnitUyu)}</span>
                      <span
                        className="price-arrow"
                        data-dir={c.toUnitUyu >= c.fromUnitUyu ? 'sube' : 'baja'}
                        aria-hidden="true"
                      >
                        <Icon name="caret-up" size={12} />
                      </span>
                      <span className="sr-only">
                        {c.toUnitUyu >= c.fromUnitUyu ? 'sube a' : 'baja a'}
                      </span>
                      <strong>{formatUYU(c.toUnitUyu)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="panel-note">
        <Icon name="info" size={17} />
        <span>
          El precio por unidad se recalcula solo a partir del total, así que la cuenta siempre
          cierra. Si te arrepentís, con «Restaurar catálogo original» en el menú de la izquierda
          vuelve todo como estaba.
        </span>
      </p>
    </>
  )
}
