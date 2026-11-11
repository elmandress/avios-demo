'use client'

import { useEffect, useMemo, useState } from 'react'
import { Enlace } from '@/components/Enlace'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Category } from '@/lib/catalog/types'
import { PanelCatalogo } from '@/components/PanelCatalogo'
import { CatalogoFamilias } from '@/components/CatalogoFamilias'
import {
  camposDeTarjeta,
  TANDA,
  type TarjetaProducto,
} from '@/lib/catalog/tarjeta'
import { puntuarCampos, coincide, expandirConsulta } from '@/lib/search/match'
import { useCatalog } from '@/components/CatalogProvider'
import { useIndice } from '@/components/useIndice'
import { recordMissedSearch } from '@/lib/search/log'
import { whatsappLink } from '@/lib/cart/whatsapp'
import { BRAND } from '@/lib/env'
import { ProductCard } from '@/components/ProductCard'
import { VistosRecientes } from '@/components/VistosRecientes'
import {
  avios,
  Badge,
  Button,
  Icon,
  SectionTitle,
} from '@/components/ui/Primitives'

// Grilla de la tienda.
//
// Los filtros se rehicieron desde cero porque los heredados eran de una tienda
// de ropa. El peor era "Talle": como el precio mayorista se guardaba como filas
// de talle, la tienda ofrecía filtrar por "4 mm (Nro 0) · mayorista, pieza x100m".
//
// Los que quedan son los que un comprador de mercería realmente usa:
// categoría, búsqueda por texto, precio tope, y —el que importa para el negocio—
// "sólo con precio por mayor". Ese último no existía y es la puerta de entrada
// del cliente más valioso.
//
// Dos piezas, a propósito:
//
//   TiendaVista    lo que se ve. La pinta también el SERVIDOR, con las primeras
//                  24 tarjetas, mientras el navegador no cargó (ver
//                  TiendaPagina.tsx). Sin eso la grilla aparecía recién cuando
//                  bajaba el JavaScript: era la única página en rojo de la
//                  auditoría de velocidad.
//   TiendaClient   el estado: búsqueda, filtros, orden, "ver más". Trabaja sobre
//                  el índice liviano (/indice.json), no sobre el catálogo entero.

type SortKey = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre' | 'ahorro'

const SORT_LABELS: Record<SortKey, string> = {
  destacados: 'Relevancia',
  'precio-asc': 'Precio: de menor a mayor',
  'precio-desc': 'Precio: de mayor a menor',
  nombre: 'Nombre (A–Z)',
  ahorro: 'Más ahorro por mayor',
}

interface Filters {
  search: string
  onlyWholesale: boolean
  hideOutOfStock: boolean
  maxPrice: number
}

function matches(card: TarjetaProducto, f: Filters): boolean {
  if (f.search) {
    // La coincidencia sale del módulo compartido con el buscador del header:
    // por palabras sueltas y con el vocabulario del rubro. Ver lib/search/match.
    const tokens = expandirConsulta(f.search)
    if (tokens.length > 0 && !coincide(card.busqueda.todo, tokens)) return false
  }
  if (f.onlyWholesale && !card.precio.hasWholesale) return false
  if (f.hideOutOfStock && card.status === 'soldout') return false
  if (
    f.maxPrice > 0 &&
    (card.precio.fromUyu <= 0 || card.precio.fromUyu > f.maxPrice)
  )
    return false
  return true
}

export function TiendaClient({
  heading,
  intro,
  activeCategory = 'todo',
  iniciales,
  total,
}: {
  heading: string
  intro?: string | null
  activeCategory?: string
  iniciales: TarjetaProducto[]
  total: number
}) {
  const { categories, settings } = useCatalog()
  const router = useRouter()
  const params = useSearchParams()
  const [pedirIndice, setPedirIndice] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const search = params.get('q') ?? ''
  const sort = (
    Object.hasOwn(SORT_LABELS, params.get('orden') ?? '')
      ? params.get('orden')
      : 'destacados'
  ) as SortKey
  const keys = ['tipo', 'eje', 'presentacion', 'mayor', 'disponible', 'hasta']
  const filtrando =
    keys.some((k) => params.has(k)) || !!search || sort !== 'destacados'
  const completo = total <= iniciales.length
  const indice = useIndice(
    !completo &&
      (pedirIndice ||
        filtrando ||
        filtersOpen ||
        activeCategory === 'galones-flecos-y-borlas'),
  )
  const products = useMemo(
    () =>
      indice
        ? indice.filter(
            (c) =>
              activeCategory === 'todo' || c.categorySlug === activeCategory,
          )
        : iniciales,
    [indice, activeCategory, iniciales],
  )
  const listo = completo || indice !== null
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(`?${next.toString()}`, { scroll: false })
  }
  const aceptar = (p: TarjetaProducto, omitir = '') => {
    if (
      !matches(p, {
        search,
        onlyWholesale: omitir !== 'mayor' && params.has('mayor'),
        hideOutOfStock: omitir !== 'disponible' && params.has('disponible'),
        maxPrice: omitir === 'hasta' ? 0 : Number(params.get('hasta')) || 0,
      })
    )
      return false
    return (['tipo', 'eje', 'presentacion'] as const).every((k) => {
      const values = params.getAll(k)
      const actual = k === 'tipo' ? [p.facetas?.tipo] : (p.facetas?.[k] ?? [])
      return (
        k === omitir || !values.length || values.some((v) => actual.includes(v))
      )
    })
  }
  const visible = products
    .filter((p) => aceptar(p))
    .sort((a, b) => {
      if (sort.startsWith('precio')) {
        if (!a.precio.fromUyu) return 1
        if (!b.precio.fromUyu) return -1
        return (
          (a.precio.fromUyu - b.precio.fromUyu) *
          (sort === 'precio-desc' ? -1 : 1)
        )
      }
      if (sort === 'nombre') return a.name.localeCompare(b.name, 'es')
      if (sort === 'ahorro')
        return (
          (b.precio.bestSavingsPercent ?? 0) -
          (a.precio.bestSavingsPercent ?? 0)
        )
      if (search)
        return (
          puntuarCampos(camposDeTarjeta(a), search) -
          puntuarCampos(camposDeTarjeta(b), search)
        )
      return a.sortOrder - b.sortOrder
    })
  const [tope, setTope] = useState(TANDA)
  const clave = params.toString() + activeCategory
  const [anterior, setAnterior] = useState(clave)
  if (anterior !== clave) {
    setAnterior(clave)
    setTope(TANDA)
  }
  const noResults = listo && !visible.length && search.trim().length >= 3
  useEffect(() => {
    if (!noResults) return
    const t = setTimeout(() => recordMissedSearch(search), 1200)
    return () => clearTimeout(t)
  }, [noResults, search])
  const limpiar = () =>
    router.replace(window.location.pathname, { scroll: false })
  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    const values = next.getAll(key)
    next.delete(key)
    for (const v of values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value])
      next.append(key, v)
    router.replace(`?${next}`, { scroll: false })
  }
  const activos = keys.flatMap((k) => params.getAll(k).map((v) => ({ k, v })))
  return (
    <TiendaVista
      heading={heading}
      intro={intro}
      activeCategory={activeCategory}
      categories={categories}
      tarjetas={visible.slice(0, tope)}
      esperando={!listo && filtrando}
      conteo={listo ? `${visible.length} artículos` : `${total} artículos`}
      hayMas={listo ? visible.length > tope : total > iniciales.length}
      mostrando={`${Math.min(tope, visible.length)} de ${listo ? visible.length : total}`}
      cargandoMas={!listo && pedirIndice}
      onVerMas={() => {
        setPedirIndice(true)
        setTope((n) => n + TANDA)
      }}
      busqueda={{ valor: search, onCambio: (v) => update('q', v) }}
      filtros={{
        abiertos: filtersOpen,
        onAbrir: () => setFiltersOpen((v) => !v),
        activos: activos.length,
        orden: sort,
        onOrden: (v) => update('orden', v),
        chips: (
          <>
            <div className="subcategorias" aria-label="Tipos de pasamanería">
              {listo &&
                activeCategory === 'galones-flecos-y-borlas' &&
                [...new Set(products.map((p) => p.facetas.tipo))]
                  .filter(Boolean)
                  .map((tipo) => (
                    <button
                      key={tipo}
                      className="chip"
                      aria-pressed={params.getAll('tipo').includes(tipo)}
                      onClick={() => toggle('tipo', tipo)}
                    >
                      {tipo} ·{' '}
                      {products.filter((p) => p.facetas.tipo === tipo).length}
                    </button>
                  ))}
            </div>
            <div className="filtros-activos">
              {activos.map(({ k, v }) => (
                <button
                  className="chip"
                  key={k + v}
                  onClick={() =>
                    ['tipo', 'eje', 'presentacion'].includes(k)
                      ? toggle(k, v)
                      : update(k, '')
                  }
                >
                  {k === 'mayor'
                    ? 'Por mayor'
                    : k === 'disponible'
                      ? 'Disponibles'
                      : k === 'hasta'
                        ? `Hasta $ ${v}`
                        : v}{' '}
                  ×
                </button>
              ))}
              {activos.length > 0 && (
                <Button variant="ghost" onClick={limpiar}>
                  Limpiar todo
                </Button>
              )}
            </div>
          </>
        ),
        panel: (
          <PanelCatalogo cerrar={() => setFiltersOpen(false)}>
            <div className="facetas-panel" id="panel-filtros">
              <div className="facetas-cabecera">
                <h2>Encontrá lo que necesitás</h2>
                <Button
                  variant="secondary"
                  onClick={() => setFiltersOpen(false)}
                >
                  Cerrar filtros
                </Button>
              </div>
              {!listo ? (
                <p role="status">Cargando filtros del catálogo…</p>
              ) : (
                <>
                  {(['tipo', 'eje', 'presentacion'] as const).map((k) => {
                    const opciones = [
                      ...new Set(
                        products.flatMap((p) =>
                          k === 'tipo'
                            ? p.facetas?.tipo
                              ? [p.facetas.tipo]
                              : []
                            : (p.facetas?.[k] ?? []),
                        ),
                      ),
                    ].sort()
                    return opciones.length > 1 ? (
                      <fieldset key={k}>
                        <legend>
                          {k === 'tipo'
                            ? 'Tipo de artículo'
                            : k === 'eje'
                              ? 'Elegí por'
                              : 'Cómo se vende'}
                        </legend>
                        {opciones.map((v) => {
                          const count = products.filter(
                            (p) =>
                              aceptar(p, k) &&
                              (k === 'tipo'
                                ? p.facetas.tipo === v
                                : (p.facetas[k] as string[]).includes(v)),
                          ).length
                          return (
                            <label key={v}>
                              <input
                                type="checkbox"
                                checked={params.getAll(k).includes(v)}
                                onChange={() => toggle(k, v)}
                              />
                              {v}
                              <span>{count}</span>
                            </label>
                          )
                        })}
                      </fieldset>
                    ) : null
                  })}
                  <fieldset>
                    <legend>Compra y disponibilidad</legend>
                    {[
                      ['mayor', 'Con precio por mayor'],
                      ['disponible', 'Sólo disponibles'],
                    ].map(([k, label]) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={params.has(k)}
                          onChange={(e) =>
                            update(k, e.target.checked ? '1' : '')
                          }
                        />
                        {label}
                        <span>
                          {
                            products.filter(
                              (p) =>
                                aceptar(p, k) &&
                                (k === 'mayor'
                                  ? p.precio.hasWholesale
                                  : p.status !== 'soldout'),
                            ).length
                          }
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Precio desde, hasta ($ UYU)
                    <input
                      type="number"
                      min="1"
                      value={params.get('hasta') ?? ''}
                      onChange={(e) => update('hasta', e.target.value)}
                      placeholder="Sin tope"
                    />
                  </label>
                  <Button onClick={() => setFiltersOpen(false)}>
                    Ver {visible.length} artículos
                  </Button>
                </>
              )}
            </div>
          </PanelCatalogo>
        ),
      }}
      vacio={
        listo && !visible.length ? (
          <SinResultados
            search={search}
            categories={categories}
            askUrl={whatsappLink(
              settings.contact_whatsapp_url || BRAND.whatsappUrl,
              `¡Hola! ¿Tenés ${search.trim()}? No lo encontré en el sitio.`,
            )}
            limpiar={limpiar}
          />
        ) : null
      }
    />
  )
}

// ─── La vista ────────────────────────────────────────────────────────────────

/**
 * Lo que se ve de la grilla. Sin estado: la usan TiendaClient (con todo
 * funcionando) y el servidor (TiendaPagina), que la pinta con las primeras
 * tarjetas para que el HTML ya traiga la grilla.
 *
 * Sin `busqueda` ni `filtros`, la barra se pinta igual pero inerte: el buscador
 * es un formulario común que manda a /tienda?q=…, así que hasta funciona antes
 * de que cargue el JavaScript.
 */
export function TiendaVista({
  heading,
  intro,
  activeCategory,
  categories,
  tarjetas,
  conteo,
  hayMas,
  mostrando,
  onVerMas,
  cargandoMas = false,
  esperando = false,
  busqueda,
  filtros,
  vacio,
}: {
  heading: string
  intro?: string | null
  activeCategory: string
  categories: Category[]
  tarjetas: TarjetaProducto[]
  conteo: string
  hayMas: boolean
  mostrando: string
  onVerMas?: () => void
  /** "Ver más" ya se tocó y el índice todavía está bajando. */
  cargandoMas?: boolean
  esperando?: boolean
  busqueda?: { valor: string; onCambio: (v: string) => void }
  filtros?: {
    abiertos: boolean
    onAbrir: () => void
    activos: number
    orden: SortKey
    onOrden: (k: SortKey) => void
    chips?: React.ReactNode
    panel: React.ReactNode
  }
  vacio?: React.ReactNode
}) {
  return (
    <div
      style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 22px 80px' }}
    >
      <header style={{ marginBottom: 22 }}>
        <SectionTitle as="h1" style={{ fontSize: 32 }}>
          {heading}
        </SectionTitle>
        {intro && <p className="tienda-intro">{intro}</p>}
      </header>

      {/* Categorías: enlaces de verdad, no botones. Google tiene que poder
          llegar a cada categoría —y desde ahí a cada ficha— sin JavaScript. */}
      <p className="catalogo-migas">
        <Enlace href="/">Inicio</Enlace> /{' '}
        <Enlace href="/tienda">Catálogo</Enlace>
        {activeCategory !== 'todo' && ` / ${heading}`}
      </p>
      {activeCategory === 'todo' ? (
        <CatalogoFamilias categories={categories} />
      ) : (
        <details className="cambiar-rubro">
          <summary>Cambiar de rubro</summary>
          <CatalogoFamilias
            categories={categories}
            activeCategory={activeCategory}
          />
        </details>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="tienda-barra">
        <form
          role="search"
          action="/tienda"
          onSubmit={(e) => {
            if (busqueda) e.preventDefault()
          }}
          style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}
        >
          <label>
            <span className="sr-only">Buscar en el catálogo</span>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <Icon name="magnifying-glass" size={17} color={avios.ink500} />
            </span>
            <input
              type="search"
              name="q"
              {...(busqueda
                ? {
                    value: busqueda.valor,
                    onChange: (e) => busqueda.onCambio(e.target.value),
                  }
                : { defaultValue: '' })}
              placeholder="Buscar cinta, hilo, 15 mm…"
              className="tienda-input"
            />
          </label>
        </form>

        <button
          type="button"
          onClick={filtros?.onAbrir}
          aria-expanded={filtros?.abiertos ?? false}
          aria-controls="panel-filtros"
          className="tienda-control"
          data-activo={filtros && filtros.activos > 0 ? 'si' : undefined}
        >
          <Icon name="sliders-horizontal" size={17} />
          Filtros
          {filtros && filtros.activos > 0 && (
            <Badge tone="ink">{filtros.activos}</Badge>
          )}
        </button>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="sr-only">Ordenar por</span>
          <select
            {...(filtros
              ? {
                  value: filtros.orden,
                  onChange: (e) => filtros.onOrden(e.target.value as SortKey),
                }
              : { defaultValue: 'destacados' })}
            className="tienda-control"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtros?.chips}
      {filtros?.abiertos && filtros.panel}

      <p aria-live="polite" className="tienda-conteo">
        {esperando ? 'Buscando en todo el catálogo…' : conteo}
      </p>

      {vacio ?? (
        <>
          <div className="product-grid" aria-busy={esperando || undefined}>
            {(esperando ? [] : tarjetas).map((card, i) => (
              <ProductCard key={card.slug} card={card} priority={i < 4} />
            ))}
          </div>

          {/*
            Es "ver más" y no scroll infinito a propósito: el scroll infinito
            deja el pie inalcanzable, y ahí viven la dirección, el horario y el
            teléfono, que en una mercería de barrio es a dónde va mucha gente.
          */}
          {hayMas && (
            <div className="ver-mas">
              <Button
                variant="secondary"
                size="lg"
                onClick={onVerMas}
                disabled={!onVerMas || cargandoMas}
              >
                {cargandoMas ? 'Cargando…' : 'Ver más artículos'}
              </Button>
              <span>{mostrando}</span>
            </div>
          )}
        </>
      )}

      <VistosRecientes />
    </div>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function SinResultados({
  search,
  categories,
  askUrl,
  limpiar,
}: {
  search: string
  categories: Category[]
  askUrl: string
  limpiar: () => void
}) {
  return (
    <div className="empty-search">
      <Icon name="magnifying-glass" size={26} color={avios.ink300} />
      <h2>
        {search.trim()
          ? `No tenemos publicado «${search.trim()}»`
          : 'Nada con esos filtros'}
      </h2>
      <p>
        El local tiene bastante más de lo que está cargado en el sitio. Si lo
        necesitás, preguntanos: te contestamos si lo tenemos y a cuánto.
      </p>

      <div className="empty-search-actions">
        {search.trim() && (
          <Button variant="whatsapp" size="lg" href={askUrl}>
            <Icon name="whatsapp-logo" weight="fill" size={19} /> Preguntar por
            «{search.trim()}»
          </Button>
        )}
        <Button variant="secondary" onClick={limpiar}>
          Limpiar la búsqueda
        </Button>
      </div>

      {/* Salidas laterales: mejor mandar a una categoría que a la nada. */}
      <div className="empty-search-cats">
        <span>O mirá por categoría:</span>
        {categories.slice(0, 5).map((c) => (
          <Enlace key={c.slug} href={`/tienda/${c.slug}`}>
            {c.name}
          </Enlace>
        ))}
      </div>
    </div>
  )
}
