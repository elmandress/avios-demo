'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  MeasureUnit,
  Product,
  ProductStatus,
  SaleFormat,
  Variant,
  VariantAxis,
} from '@/lib/catalog/types'
import { UNIT_NOUN } from '@/lib/catalog/types'
import { formatUYU, formatUnitPrice, savingsPercent } from '@/lib/catalog/pricing'
import { checkCatalogIntegrity } from '@/lib/catalog/integrity'
import { compressImageToDataUrl, slugify } from '@/lib/media'
import { emptyVariant, newId, upsertProduct } from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Badge, Button, Icon } from '@/components/ui/Primitives'

// Editor de producto.
//
// Es la pantalla que justifica todo el modelo de datos: acá se ve que un
// producto tiene VARIANTES (el ancho, el color) y que cada variante tiene
// PRESENTACIONES (por metro, pieza cerrada, unidad). Si esto se entiende al
// mirarlo, el modelo está bien; si hay que explicarlo, está mal.
//
// Las tres cifras de cada presentación se mantienen coherentes solas: al tocar
// el precio de la pieza se recalcula el precio por unidad y viceversa, así que
// no se puede guardar una combinación que no cierre.

const UNIT_OPTIONS: Array<{ value: MeasureUnit; label: string }> = [
  { value: 'u', label: 'unidad' },
  { value: 'm', label: 'metro' },
  { value: 'yd', label: 'yarda' },
]

const AXIS_OPTIONS: Array<{ value: VariantAxis | ''; label: string }> = [
  { value: '', label: 'Sin eje (una sola variante)' },
  { value: 'ancho', label: 'Ancho' },
  { value: 'color', label: 'Color' },
  { value: 'medida', label: 'Medida' },
  { value: 'modelo', label: 'Modelo' },
]

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string; hint: string }> = [
  { value: 'active', label: 'Publicado', hint: 'Se ve y se puede pedir' },
  { value: 'soldout', label: 'Sin stock', hint: 'Se ve pero no se puede pedir' },
  { value: 'draft', label: 'Borrador', hint: 'No se ve en el sitio' },
]

const round = (n: number, decimals = 2) => {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

export function ProductForm({ initial, isNew }: { initial: Product; isNew: boolean }) {
  const router = useRouter()
  const { catalog } = useAdminCatalog()
  const [draft, setDraft] = useState<Product>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const patch = (p: Partial<Product>) => setDraft((d) => ({ ...d, ...p }))

  const patchVariant = (variantId: string, fn: (v: Variant) => Variant) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.id === variantId ? fn(v) : v)) }))

  const patchFormat = (variantId: string, formatId: string, fn: (f: SaleFormat) => SaleFormat) =>
    patchVariant(variantId, (v) => ({
      ...v,
      formats: v.formats.map((f) => (f.id === formatId ? fn(f) : f)),
    }))

  // Validación previa: se reusa la MISMA verificación que corre en el build, así
  // que lo que el panel deja guardar es exactamente lo que el sitio acepta.
  const problems = useMemo(() => {
    const issues = checkCatalogIntegrity({
      ...catalog,
      products: [...catalog.products.filter((p) => p.id !== draft.id), draft],
    })
    return issues.filter((i) => i.productSlug === draft.slug || i.productSlug === '')
  }, [catalog, draft])

  const save = () => {
    setError(null)
    const name = draft.name.trim()
    if (!name) return setError('Poné un nombre.')

    const slug = draft.slug.trim() || slugify(name)
    if (catalog.products.some((p) => p.slug === slug && p.id !== draft.id)) {
      return setError(`Ya hay otro producto con la dirección "${slug}". Cambiale el nombre.`)
    }
    if (draft.variants.length === 0) return setError('Agregá al menos una variante.')
    if (draft.variants.some((v) => v.formats.length === 0)) {
      return setError('Cada variante necesita al menos una forma de venderse.')
    }
    if (problems.length > 0) {
      return setError(`Hay ${problems.length} problema(s) en los precios: ${problems[0].message}`)
    }

    try {
      upsertProduct({ ...draft, name, slug })
      router.push('/panel/productos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  const addPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const added: Product['media'] = []
      for (const file of Array.from(files).slice(0, 4)) {
        added.push({
          url: await compressImageToDataUrl(file),
          alt: draft.name || null,
          position: 0,
        })
      }
      setDraft((d) => ({
        ...d,
        media: [...d.media, ...added].map((m, i) => ({ ...m, position: i })),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <Link href="/panel/productos" className="panel-back">
            ← Productos
          </Link>
          <h1>{isNew ? 'Cargar producto' : draft.name || 'Sin nombre'}</h1>
          <p>
            {isNew
              ? 'Los campos con el precio son los únicos obligatorios además del nombre.'
              : draft.slug && (
                  <Link href={`/tienda/${draft.slug}`}>Ver en el sitio →</Link>
                )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <Button variant="secondary" href="/panel/productos">
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            Guardar
          </Button>
        </div>
      </header>

      {error && (
        <div className="panel-alert" role="alert">
          <Icon name="warning" size={19} />
          <div>{error}</div>
        </div>
      )}

      {/* ── Datos generales ─────────────────────────────────────────────── */}
      <section className="panel-section">
        <h2>Datos del artículo</h2>
        <div className="panel-form-grid">
          <Field label="Nombre" hint="Como lo va a ver el cliente">
            <input
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value
                // El slug sigue al nombre mientras nadie lo haya tocado a mano:
                // cambiarlo después rompe links que ya pueden estar circulando.
                patch(isNew ? { name, slug: slugify(name) } : { name })
              }}
              placeholder="Cinta de raso doble faz"
            />
          </Field>

          <Field label="Dirección en el sitio" hint={`/tienda/${draft.slug || '…'}`}>
            <input
              value={draft.slug}
              onChange={(e) => patch({ slug: slugify(e.target.value) })}
              placeholder="cinta-de-raso-doble-faz"
            />
          </Field>

          <Field label="Categoría">
            <select
              value={draft.categorySlug}
              onChange={(e) => patch({ categorySlug: e.target.value })}
            >
              <option value="">— sin categoría —</option>
              {catalog.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={draft.status}
              onChange={(e) => patch({ status: e.target.value as ProductStatus })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Código" hint="El del catálogo en papel, si tiene">
            <input
              value={draft.sku ?? ''}
              onChange={(e) => patch({ sku: e.target.value || null })}
              placeholder="FCS-1"
            />
          </Field>

          <Field label="Material" hint="Opcional">
            <input
              value={draft.material ?? ''}
              onChange={(e) => patch({ material: e.target.value || null })}
              placeholder="Algodón"
            />
          </Field>

          <Field label="Etiqueta" hint='Opcional: "Nuevo", "Último stock"'>
            <input
              value={draft.badge ?? ''}
              onChange={(e) => patch({ badge: e.target.value || null })}
              placeholder=""
            />
          </Field>

          <Field label="Descuento propio" hint="En %, sobre este artículo solo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={0}
                max={90}
                value={draft.discountPercent}
                onChange={(e) => patch({ discountPercent: Math.min(90, Math.max(0, Number(e.target.value) || 0)) })}
                style={{ width: 90 }}
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={draft.discountActive}
                  onChange={(e) => patch({ discountActive: e.target.checked })}
                />
                Activo
              </label>
            </div>
          </Field>
        </div>

        <Field label="Descripción" hint="Qué es y para qué sirve. Dos o tres frases.">
          <textarea
            rows={4}
            value={draft.description ?? ''}
            onChange={(e) => patch({ description: e.target.value || null })}
          />
        </Field>
      </section>

      {/* ── Fotos ───────────────────────────────────────────────────────── */}
      <section className="panel-section">
        <h2>Fotos</h2>
        <p className="panel-where">
          La primera es la que se ve en la grilla. Sin fotos se dibuja la ilustración de la
          categoría. Se achican solas antes de guardarse.
        </p>

        <div className="panel-photos">
          {draft.media.map((m, i) => (
            <div key={m.url.slice(0, 40) + i} className="panel-photo">
              <Image
                src={m.url}
                alt=""
                fill
                sizes="120px"
                unoptimized={m.url.startsWith('data:')}
                style={{ objectFit: 'cover' }}
              />
              {i === 0 && <span className="panel-photo-tag">Principal</span>}
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    media: d.media.filter((_, n) => n !== i).map((x, n) => ({ ...x, position: n })),
                  }))
                }
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}

          <label className="panel-photo-add">
            <Icon name="plus" size={22} />
            <span>{busy ? 'Procesando…' : 'Agregar fotos'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => {
                void addPhoto(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      {/* ── Variantes y presentaciones ──────────────────────────────────── */}
      <section className="panel-section">
        <h2>Variantes y precios</h2>
        <p className="panel-where">
          Una <strong>variante</strong> es el ancho, el color o la medida. Cada variante puede
          venderse de varias formas: por metro, por pieza cerrada, por unidad. El precio por mayor
          va en su propia forma de venta, con el contenido que trae.
        </p>

        <Field label="Qué distingue a las variantes">
          <select
            value={draft.variants.find((v) => v.axis)?.axis ?? ''}
            onChange={(e) => {
              const axis = (e.target.value || null) as VariantAxis | null
              setDraft((d) => ({ ...d, variants: d.variants.map((v) => ({ ...v, axis })) }))
            }}
            style={{ maxWidth: 320 }}
          >
            {AXIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {draft.variants.map((variant) => (
          <VariantEditor
            key={variant.id}
            variant={variant}
            canDelete={draft.variants.length > 1}
            onChange={(fn) => patchVariant(variant.id, fn)}
            onDelete={() =>
              setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.id !== variant.id) }))
            }
            onFormatChange={(formatId, fn) => patchFormat(variant.id, formatId, fn)}
          />
        ))}

        <Button
          variant="secondary"
          onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, emptyVariant()] }))}
        >
          <Icon name="plus" size={16} /> Agregar variante
        </Button>
      </section>

      {problems.length > 0 && (
        <div className="panel-alert" role="status">
          <Icon name="warning" size={19} />
          <div>
            <strong>Revisá los precios antes de guardar</strong>
            <ul>
              {problems.map((p, i) => (
                <li key={i}>{p.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="panel-save-bar">
        <Button variant="secondary" href="/panel/productos">
          Cancelar
        </Button>
        <Button variant="primary" size="lg" onClick={save} disabled={busy}>
          Guardar producto
        </Button>
      </div>
    </>
  )
}

// ─── Variante ────────────────────────────────────────────────────────────────

function VariantEditor({
  variant,
  canDelete,
  onChange,
  onDelete,
  onFormatChange,
}: {
  variant: Variant
  canDelete: boolean
  onChange: (fn: (v: Variant) => Variant) => void
  onDelete: () => void
  onFormatChange: (formatId: string, fn: (f: SaleFormat) => SaleFormat) => void
}) {
  return (
    <div className="panel-variant-card">
      <div className="panel-variant-head">
        <Field label="Nombre de la variante" hint="Vacío si el producto no tiene variantes">
          <input
            value={variant.label}
            onChange={(e) => onChange((v) => ({ ...v, label: e.target.value }))}
            placeholder="4 mm (Nro 0)"
          />
        </Field>
        <label className="panel-inline-check">
          <input
            type="checkbox"
            checked={variant.available}
            onChange={(e) => onChange((v) => ({ ...v, available: e.target.checked }))}
          />
          Disponible
        </label>
        {canDelete && (
          <button type="button" className="panel-danger-link" onClick={onDelete}>
            Quitar variante
          </button>
        )}
      </div>

      <table className="panel-format-table">
        <thead>
          <tr>
            <th scope="col">Cómo se vende</th>
            <th scope="col">Nombre</th>
            <th scope="col">Trae</th>
            <th scope="col">Precio</th>
            <th scope="col">Por unidad</th>
            <th scope="col">Ahorro</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {variant.formats.map((format) => (
            <FormatRow
              key={format.id}
              format={format}
              variant={variant}
              canDelete={variant.formats.length > 1}
              onChange={(fn) => onFormatChange(format.id, fn)}
              onDelete={() =>
                onChange((v) => ({ ...v, formats: v.formats.filter((f) => f.id !== format.id) }))
              }
            />
          ))}
        </tbody>
      </table>

      <button
        type="button"
        className="panel-add-format"
        onClick={() =>
          onChange((v) => {
            // La forma nueva arranca como "por mayor" copiando la unidad de la
            // primera: es lo que casi siempre se está por agregar.
            const base = v.formats[0]
            return {
              ...v,
              formats: [
                ...v.formats,
                {
                  id: newId('f'),
                  tier: 'mayor',
                  label: 'Pieza cerrada',
                  unit: base?.unit ?? 'u',
                  contentQty: 10,
                  priceUyu: 0,
                  unitPriceUyu: 0,
                  available: true,
                  minQty: 1,
                },
              ],
            }
          })
        }
      >
        <Icon name="plus" size={15} /> Agregar forma de venta
      </button>
    </div>
  )
}

// ─── Presentación ────────────────────────────────────────────────────────────

function FormatRow({
  format,
  variant,
  canDelete,
  onChange,
  onDelete,
}: {
  format: SaleFormat
  variant: Variant
  canDelete: boolean
  onChange: (fn: (f: SaleFormat) => SaleFormat) => void
  onDelete: () => void
}) {
  const saving = savingsPercent(format, variant)
  const content = format.contentQty
  const unknownPack = content === null

  // Las tres cifras se mantienen coherentes desde acá: al escribir el total se
  // recalcula el precio por unidad, y al escribir el por unidad se recalcula el
  // total. Así nunca se guarda una combinación que la verificación rechace.
  const setTotal = (total: number) =>
    onChange((f) => ({
      ...f,
      priceUyu: total,
      unitPriceUyu: f.contentQty ? round(total / f.contentQty, 4) : total,
    }))

  const setUnitPrice = (unit: number) =>
    onChange((f) => ({
      ...f,
      unitPriceUyu: unit,
      priceUyu: f.contentQty === null ? null : round(unit * f.contentQty),
    }))

  const setContent = (qty: number) =>
    onChange((f) => ({
      ...f,
      contentQty: qty,
      priceUyu: round(f.unitPriceUyu * qty),
    }))

  return (
    <tr>
      <td>
        <select
          value={format.tier}
          onChange={(e) => onChange((f) => ({ ...f, tier: e.target.value as 'menor' | 'mayor' }))}
          aria-label="Por menor o por mayor"
        >
          <option value="menor">Por menor</option>
          <option value="mayor">Por mayor</option>
        </select>
      </td>
      <td>
        <input
          value={format.label}
          onChange={(e) => onChange((f) => ({ ...f, label: e.target.value }))}
          placeholder="Por metro"
          style={{ minWidth: 130 }}
        />
      </td>
      <td>
        <div className="panel-content-cell">
          <input
            type="number"
            min={0}
            step="any"
            value={unknownPack ? '' : content}
            disabled={unknownPack}
            onChange={(e) => setContent(Number(e.target.value) || 0)}
            style={{ width: 78 }}
            aria-label="Cuánto trae"
          />
          <select
            value={format.unit}
            onChange={(e) => onChange((f) => ({ ...f, unit: e.target.value as MeasureUnit }))}
            aria-label="Unidad"
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="panel-tiny-check" title="Cuando no se sabe cuántos metros trae la pieza">
            <input
              type="checkbox"
              checked={unknownPack}
              onChange={(e) =>
                onChange((f) =>
                  e.target.checked
                    ? { ...f, contentQty: null, priceUyu: null }
                    : { ...f, contentQty: 1, priceUyu: round(f.unitPriceUyu) }
                )
              }
            />
            a confirmar
          </label>
        </div>
      </td>
      <td>
        {unknownPack ? (
          <span className="panel-muted">—</span>
        ) : (
          <input
            type="number"
            min={0}
            step="any"
            value={format.priceUyu ?? 0}
            onChange={(e) => setTotal(Number(e.target.value) || 0)}
            style={{ width: 96 }}
            aria-label="Precio total"
          />
        )}
      </td>
      <td>
        <input
          type="number"
          min={0}
          step="any"
          value={format.unitPriceUyu}
          onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
          style={{ width: 96 }}
          aria-label={`Precio por ${UNIT_NOUN[format.unit].singular}`}
        />
        <span className="panel-unit-hint">
          {formatUnitPrice(format.unitPriceUyu, format.unit).replace(formatUYU(format.unitPriceUyu), '').trim()}
        </span>
      </td>
      <td>
        {saving !== null ? <Badge tone="saving">−{saving}%</Badge> : <span className="panel-muted">—</span>}
      </td>
      <td className="panel-actions">
        <label className="panel-tiny-check">
          <input
            type="checkbox"
            checked={format.available}
            onChange={(e) => onChange((f) => ({ ...f, available: e.target.checked }))}
          />
          activa
        </label>
        {canDelete && (
          <button type="button" onClick={onDelete}>
            Quitar
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Campo ───────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="panel-field">
      <span className="panel-field-label">{label}</span>
      {children}
      {hint && <span className="panel-field-hint">{hint}</span>}
    </label>
  )
}

