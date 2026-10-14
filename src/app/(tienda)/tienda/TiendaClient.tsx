'use client'

import { useEffect, useMemo, useState } from 'react'
import { Enlace } from '@/components/Enlace'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Category } from '@/lib/catalog/types'
import { TANDA, type TarjetaProducto } from '@/lib/catalog/tarjeta'
import { coincide, expandirConsulta } from '@/lib/search/match'
import { useCatalog } from '@/components/CatalogProvider'
import { useIndice } from '@/components/useIndice'
import { recordMissedSearch } from '@/lib/search/log'
import { whatsappLink } from '@/lib/cart/whatsapp'
import { BRAND } from '@/lib/env'
import { ProductCard } from '@/components/ProductCard'
import { VistosRecientes } from '@/components/VistosRecientes'
import { avios, Badge, Button, Icon, SectionTitle } from '@/components/ui/Primitives'

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

type SortKey = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre'

const SORT_LABELS: Record<SortKey, string> = {
  destacados: 'Orden de la tienda',
  'precio-asc': 'Precio: de menor a mayor',
  'precio-desc': 'Precio: de mayor a menor',
  nombre: 'Nombre (A–Z)',
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
  if (f.maxPrice > 0 && card.precio.fromUyu > f.maxPrice) return false
  return true
}

export function TiendaClient({
  activeCategory = 'todo',
  heading,
  intro,
  iniciales,
  total,
}: {
  activeCategory?: string
  heading: string
  intro?: string | null
  /** Las primeras tarjetas de esta categoría, pre-renderizadas en el servidor. */
  iniciales: TarjetaProducto[]
  /** Cuántos artículos tiene la categoría en total. */
  total: number
}) {
  const { categories, settings } = useCatalog()
  const router = useRouter()

  // El índice completo llega aparte. Mientras tanto se trabaja con lo que vino
  // pre-renderizado, que es exactamente lo que ya se está viendo.
  const indice = useIndice(true)
  const products = useMemo(
    () =>
      indice
        ? indice.filter((c) => activeCategory === 'todo' || c.categorySlug === activeCategory)
        : iniciales,
    [indice, iniciales, activeCategory]
  )
  const cantidadTotal = indice ? products.length : total

  // La búsqueda vive en la URL, no sólo en el estado.
  //
  // Tres razones, y la primera es que el sitio ya lo prometía: el JSON-LD del
  // layout declara un SearchAction apuntando a /tienda?q={término}, así que
  // Google puede mandar tráfico a esa dirección. Las otras dos son de uso
  // diario: una búsqueda se puede COMPARTIR (el link que quien atiende le pega
  // al cliente en el chat lleva el resultado, no la tienda entera), y el botón
  // de volver del navegador deshace la búsqueda en vez de sacarte del sitio.
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [onlyWholesale, setOnlyWholesale] = useState(false)
  const [hideOutOfStock, setHideOutOfStock] = useState(false)
  const [maxPrice, setMaxPrice] = useState(0)
  const [sort, setSort] = useState<SortKey>('destacados')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Techo del control de precio: el "desde" más caro de la categoría,
  // redondeado hacia arriba. Derivarlo evita un tope fijo que deje productos
  // fuera de rango el día que entre un artículo más caro.
  const priceCeiling = useMemo(() => {
    const highest = Math.max(0, ...products.map((p) => p.precio.fromUyu))
    return Math.ceil(highest / 100) * 100
  }, [products])

  // Al cambiar de categoría, los filtros locales se reinician: mantener "sólo
  // por mayor" al saltar de Cintas a Herramientas devolvía cero resultados sin
  // explicar por qué. En el render, no en un efecto (patrón de React para
  // ajustar estado cuando cambia una prop).
  const [lastCategory, setLastCategory] = useState(activeCategory)
  if (lastCategory !== activeCategory) {
    setLastCategory(activeCategory)
    setSearch('')
    setOnlyWholesale(false)
    setHideOutOfStock(false)
    setMaxPrice(0)
  }

  const filters: Filters = { search, onlyWholesale, hideOutOfStock, maxPrice }

  const visible = useMemo(() => {
    const list = products.filter((p) => matches(p, filters))
    switch (sort) {
      case 'precio-asc':
        return [...list].sort((a, b) => a.precio.fromUyu - b.precio.fromUyu)
      case 'precio-desc':
        return [...list].sort((a, b) => b.precio.fromUyu - a.precio.fromUyu)
      case 'nombre':
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      default:
        return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    // `filters` se reconstruye en cada render; las dependencias reales son sus
    // campos, que sí son primitivos y estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, onlyWholesale, hideOutOfStock, maxPrice, sort])

  // Cuántas tarjetas se pintan. Al cambiar los filtros se vuelve al principio:
  // quedarse en "mostrando 96" después de una búsqueda que devuelve 3
  // resultados no significa nada. En el render y no en un efecto: es el patrón
  // de React para ajustar estado cuando cambia otro.
  const [tope, setTope] = useState(TANDA)
  const claveFiltros = `${search}|${onlyWholesale}|${hideOutOfStock}|${maxPrice}|${sort}`
  const [ultimaClave, setUltimaClave] = useState(claveFiltros)
  if (ultimaClave !== claveFiltros) {
    setUltimaClave(claveFiltros)
    setTope(TANDA)
  }

  const mostrados = useMemo(() => visible.slice(0, tope), [visible, tope])
  const wholesaleCount = useMemo(() => products.filter((p) => p.precio.hasWholesale).length, [products])
  const activeFilterCount = [onlyWholesale, hideOutOfStock, maxPrice > 0].filter(Boolean).length

  // La URL sigue a lo que se escribe, con retardo. `replace` y no `push`: con
  // push, cada tecla dejaría una entrada en el historial.
  useEffect(() => {
    const t = setTimeout(() => {
      const actual = searchParams.get('q') ?? ''
      if (actual === search) return
      const params = new URLSearchParams(searchParams.toString())
      if (search.trim()) params.set('q', search.trim())
      else params.delete('q')
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false })
    }, 400)
    return () => clearTimeout(t)
  }, [search, searchParams, router])

  // Registrar la búsqueda que no encontró nada, para que la dueña vea qué le
  // están pidiendo. Sólo con el índice completo: sin él, "no está entre las
  // primeras 24" no quiere decir "no lo tenemos".
  const noResults = indice !== null && visible.length === 0 && search.trim().length >= 3
  useEffect(() => {
    if (!noResults) return
    const t = setTimeout(() => recordMissedSearch(search), 1200)
    return () => clearTimeout(t)
  }, [noResults, search])

  const limpiar = () => {
    setSearch('')
    setOnlyWholesale(false)
    setHideOutOfStock(false)
    setMaxPrice(0)
  }

  const filtrando = search.trim() !== '' || activeFilterCount > 0

  return (
    <TiendaVista
      heading={heading}
      intro={intro}
      activeCategory={activeCategory}
      categories={categories}
      tarjetas={mostrados}
      // Hasta que llega el índice, buscar o filtrar sobre las primeras 24 sería
      // mentir con el conteo: se espera.
      esperando={indice === null && filtrando}
      conteo={
        visible.length === cantidadTotal || !indice
          ? `${cantidadTotal} artículos`
          : `${visible.length} de ${cantidadTotal} artículos`
      }
      hayMas={indice ? visible.length > mostrados.length : total > iniciales.length}
      mostrando={`${mostrados.length} de ${indice ? visible.length : total}`}
      onVerMas={indice ? () => setTope((n) => n + TANDA) : undefined}
      busqueda={{
        valor: search,
        onCambio: setSearch,
      }}
      filtros={{
        abiertos: filtersOpen,
        onAbrir: () => setFiltersOpen((v) => !v),
        activos: activeFilterCount,
        orden: sort,
        onOrden: setSort,
        panel: (
          <PanelFiltros
            onlyWholesale={onlyWholesale}
            setOnlyWholesale={setOnlyWholesale}
            wholesaleCount={wholesaleCount}
            hideOutOfStock={hideOutOfStock}
            setHideOutOfStock={setHideOutOfStock}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            priceCeiling={priceCeiling}
            activeFilterCount={activeFilterCount}
            limpiar={() => {
              setOnlyWholesale(false)
              setHideOutOfStock(false)
              setMaxPrice(0)
            }}
          />
        ),
      }}
      vacio={
        indice !== null && visible.length === 0 ? (
          <SinResultados
            search={search}
            categories={categories}
            askUrl={whatsappLink(
              settings.contact_whatsapp_url || BRAND.whatsappUrl,
              `¡Hola! ¿Tenés ${search.trim()}? No lo encontré en el sitio.`
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
  esperando?: boolean
  busqueda?: { valor: string; onCambio: (v: string) => void }
  filtros?: {
    abiertos: boolean
    onAbrir: () => void
    activos: number
    orden: SortKey
    onOrden: (k: SortKey) => void
    panel: React.ReactNode
  }
  vacio?: React.ReactNode
}) {
  const ordenadas = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 22px 80px' }}>
      <header style={{ marginBottom: 22 }}>
        <SectionTitle as="h1" style={{ fontSize: 32 }}>
          {heading}
        </SectionTitle>
        {intro && <p className="tienda-intro">{intro}</p>}
      </header>

      {/* Categorías: enlaces de verdad, no botones. Google tiene que poder
          llegar a cada categoría —y desde ahí a cada ficha— sin JavaScript. */}
      <nav aria-label="Categorías" style={{ marginBottom: 18 }}>
        <div className="chip-row">
          <Enlace href="/tienda" className="chip" aria-current={activeCategory === 'todo' ? 'page' : undefined}>
            Todo
          </Enlace>
          {ordenadas.map((c) => (
            <Enlace
              key={c.slug}
              href={`/tienda/${c.slug}`}
              className="chip"
              aria-current={activeCategory === c.slug ? 'page' : undefined}
            >
              {c.name}
            </Enlace>
          ))}
        </div>
      </nav>

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
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            >
              <Icon name="magnifying-glass" size={17} color={avios.ink500} />
            </span>
            <input
              type="search"
              name="q"
              {...(busqueda
                ? { value: busqueda.valor, onChange: (e) => busqueda.onCambio(e.target.value) }
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
          {filtros && filtros.activos > 0 && <Badge tone="ink">{filtros.activos}</Badge>}
        </button>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="sr-only">Ordenar por</span>
          <select
            {...(filtros
              ? { value: filtros.orden, onChange: (e) => filtros.onOrden(e.target.value as SortKey) }
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

      {filtros?.abiertos && filtros.panel}

      <p aria-live="polite" className="tienda-conteo">
        {esperando ? 'Buscando en todo el catálogo…' : conteo}
      </p>

      {vacio ?? (
        <>
          <div className="product-grid" aria-busy={esperando || undefined}>
            {tarjetas.map((card, i) => (
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
              <Button variant="secondary" size="lg" onClick={onVerMas} disabled={!onVerMas}>
                {onVerMas ? 'Ver más artículos' : 'Cargando…'}
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

function PanelFiltros({
  onlyWholesale,
  setOnlyWholesale,
  wholesaleCount,
  hideOutOfStock,
  setHideOutOfStock,
  maxPrice,
  setMaxPrice,
  priceCeiling,
  activeFilterCount,
  limpiar,
}: {
  onlyWholesale: boolean
  setOnlyWholesale: (v: boolean) => void
  wholesaleCount: number
  hideOutOfStock: boolean
  setHideOutOfStock: (v: boolean) => void
  maxPrice: number
  setMaxPrice: (v: number) => void
  priceCeiling: number
  activeFilterCount: number
  limpiar: () => void
}) {
  return (
    <div id="panel-filtros" className="tienda-filtros">
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={onlyWholesale}
          onChange={(e) => setOnlyWholesale(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: avios.saving600 }}
        />
        <span style={{ fontFamily: avios.fontSans, fontSize: 14.5, color: avios.ink900 }}>
          Sólo con precio por mayor <span style={{ color: avios.ink500 }}>({wholesaleCount})</span>
        </span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={hideOutOfStock}
          onChange={(e) => setHideOutOfStock(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: avios.brand600 }}
        />
        <span style={{ fontFamily: avios.fontSans, fontSize: 14.5, color: avios.ink900 }}>
          Sólo disponibles
        </span>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 220 }}>
        <span style={{ fontFamily: avios.fontSans, fontSize: 13.5, color: avios.ink700 }}>
          Precio desde, hasta{' '}
          <strong>{maxPrice > 0 ? `$ ${maxPrice.toLocaleString('es-UY')}` : 'sin tope'}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={priceCeiling}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          style={{ accentColor: avios.brand600 }}
        />
      </label>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={limpiar}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}

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
      <h2>{search.trim() ? `No tenemos publicado «${search.trim()}»` : 'Nada con esos filtros'}</h2>
      <p>
        El local tiene bastante más de lo que está cargado en el sitio. Si lo necesitás, preguntanos:
        te contestamos si lo tenemos y a cuánto.
      </p>

      <div className="empty-search-actions">
        {search.trim() && (
          <Button variant="whatsapp" size="lg" href={askUrl}>
            <Icon name="whatsapp-logo" weight="fill" size={19} /> Preguntar por «{search.trim()}»
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
