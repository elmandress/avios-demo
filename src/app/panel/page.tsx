'use client'

import Link from 'next/link'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { BRAND } from '@/lib/env'
import { Icon } from '@/components/ui/Primitives'

export default function PanelHome() {
  const { catalog, edited } = useAdminCatalog()
  const active = catalog.products.filter((p) => p.status === 'active')

  const variantCount = catalog.products.reduce((n, p) => n + p.variants.length, 0)
  const formatCount = catalog.products.reduce(
    (n, p) => n + p.variants.reduce((m, v) => m + v.formats.length, 0),
    0
  )
  const withWholesale = active.filter((p) => summarisePrice(p, catalog.discounts).hasWholesale)
  const withoutPhoto = catalog.products.filter((p) => p.media.length === 0)
  const needingReview = catalog.products.filter((p) => p.needsReview.length > 0)
  const orphans = catalog.products.filter(
    (p) => !catalog.categories.some((c) => c.slug === p.categorySlug)
  )

  const prices = active.map((p) => summarisePrice(p, catalog.discounts).fromUyu).filter((n) => n > 0)
  const cheapest = prices.length > 0 ? Math.min(...prices) : 0
  const dearest = prices.length > 0 ? Math.max(...prices) : 0

  return (
    <>
      <header className="panel-header">
        <h1>Resumen</h1>
        <p>
          Lo que hay cargado hoy en el catálogo
          {edited && ' · con tus ediciones aplicadas'}.
        </p>
      </header>

      <div className="panel-stats">
        <Stat label="Artículos publicados" value={active.length} />
        <Stat label="Variantes" value={variantCount} hint="Anchos, colores y medidas" />
        <Stat label="Presentaciones" value={formatCount} hint="Formas de comprar cada variante" />
        <Stat label="Con precio por mayor" value={withWholesale.length} tone="saving" />
        <Stat label="Categorías" value={catalog.categories.length} />
        <Stat
          label="Rango de precios"
          value={prices.length > 0 ? `${formatUYU(cheapest)} – ${formatUYU(dearest)}` : '—'}
          hint="Del más barato al más caro, por menor"
        />
      </div>

      <section className="panel-section">
        <h2>Acciones rápidas</h2>
        <div className="panel-quick">
          <Link href="/mostrador">
            <Icon name="magnifying-glass-plus" size={18} /> Abrir el mostrador
          </Link>
          <Link href="/panel/productos/nuevo">
            <Icon name="plus" size={18} /> Cargar un producto
          </Link>
          <Link href="/panel/categorias">
            <Icon name="list" size={18} /> Crear una categoría
          </Link>
          <Link href="/panel/precios">
            <Icon name="arrow-clockwise" size={18} /> Subir o bajar precios
          </Link>
          <Link href="/panel/publicar">
            <Icon name="instagram-logo" size={18} /> Armar una publicación
          </Link>
          <Link href="/panel/descuentos">
            <Icon name="tag" size={18} /> Armar un descuento
          </Link>
          <Link href="/lista-de-precios">
            <Icon name="printer" size={18} /> Imprimir la lista de precios
          </Link>
          <Link href="/panel/textos">
            <Icon name="chat-text" size={18} /> Cambiar los textos
          </Link>
        </div>
      </section>

      {/* Pendientes: lo que el sitio necesita de Alejandra para quedar redondo. */}
      <section className="panel-section">
        <h2>Pendientes</h2>
        <ul className="panel-todo">
          {/* No es un pendiente "de carga": es el dato de negocio más caro si
              sale mal — un número equivocado manda los pedidos a la nada. */}
          <Todo done={false}>
            Hay dos teléfonos en circulación
            <small>
              El sitio usa <strong>{BRAND.phoneDisplay}</strong> (el del relevamiento del
              catálogo), pero el flyer de la mercería anuncia{' '}
              <strong>{BRAND.phoneAlternate}</strong>. Todos los botones de WhatsApp apuntan al
              primero. Confirmar cuál es el bueno antes de publicar.
            </small>
          </Todo>

          <Todo done={withoutPhoto.length === 0} count={withoutPhoto.length}>
            {withoutPhoto.length === 0
              ? 'Todos los artículos tienen foto'
              : `${withoutPhoto.length} artículos sin foto propia`}
            {withoutPhoto.length > 0 && (
              <small>
                Mientras tanto se muestra una ilustración de la categoría. Se cargan desde la ficha
                de cada producto: {withoutPhoto.slice(0, 6).map((p) => p.name).join(', ')}
                {withoutPhoto.length > 6 && ` y ${withoutPhoto.length - 6} más`}.
              </small>
            )}
          </Todo>

          <Todo done={needingReview.length === 0} count={needingReview.length}>
            {needingReview.length === 0
              ? 'No hay datos pendientes de confirmar'
              : `${needingReview.length} artículos con un dato a confirmar`}
            {needingReview.length > 0 && (
              <small>
                Datos que no estaban en el catálogo en papel y se interpretaron. Están marcados uno
                por uno en <Link href="/panel/productos">Productos</Link>.
              </small>
            )}
          </Todo>

          {orphans.length > 0 && (
            <Todo done={false} count={orphans.length}>
              {orphans.length} artículos sin categoría
              <small>
                Quedaron sueltos al borrar una categoría. Asignales una desde su ficha o no van a
                aparecer en la navegación.
              </small>
            </Todo>
          )}

          <Todo done={!!catalog.settings.wholesale_min_order?.trim()}>
            {catalog.settings.wholesale_min_order?.trim()
              ? 'Mínimo de compra por mayor definido'
              : 'Falta definir el mínimo de compra por mayor'}
            {!catalog.settings.wholesale_min_order?.trim() && (
              <small>
                Hasta que se defina, la página de mayorista dice que no hay mínimo publicado e
                invita a preguntarlo. Se carga en{' '}
                <Link href="/panel/textos">Textos del sitio</Link>.
              </small>
            )}
          </Todo>
        </ul>
      </section>

      <section className="panel-section">
        <h2>Cómo funciona esta demo</h2>
        <p className="panel-note">
          <Icon name="info" size={17} />
          <span>
            Todo lo que edites acá se guarda <strong>en este navegador</strong> y la tienda lo
            muestra al instante — probá cambiar un precio y abrir la ficha. Todavía no se publica
            para los visitantes ni se sincroniza entre dispositivos: eso llega cuando conectemos la
            base de datos, sin cambiar estas pantallas.
          </span>
        </p>
      </section>
    </>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'saving'
}) {
  return (
    <div className="panel-stat" data-tone={tone}>
      <span className="panel-stat-value">{value}</span>
      <span className="panel-stat-label">{label}</span>
      {hint && <span className="panel-stat-hint">{hint}</span>}
    </div>
  )
}

function Todo({
  done,
  count,
  children,
}: {
  done: boolean
  count?: number
  children: React.ReactNode
}) {
  return (
    <li data-done={done}>
      <Icon name={done ? 'check' : 'warning'} size={18} />
      <span>{children}</span>
      {!done && count !== undefined && count > 0 && <b>{count}</b>}
    </li>
  )
}
