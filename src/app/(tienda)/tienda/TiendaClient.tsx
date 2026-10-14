'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Discount, Product } from '@/lib/catalog/types'
import { summarisePrice } from '@/lib/catalog/pricing'
import { coincide, expandirConsulta, textoDeProducto } from '@/lib/search/match'
import { useCatalog } from '@/components/CatalogProvider'
import { recordMissedSearch } from '@/lib/search/log'
import { whatsappLink } from '@/lib/cart/whatsapp'
import { BRAND } from '@/lib/env'
import { ProductCard } from '@/components/ProductCard'
import { avios, Badge, Button, Chip, Icon, SectionTitle } from '@/components/ui/Primitives'

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

type SortKey = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre'

const SORT_LABELS: Record<SortKey, string> = {
  destacados: 'Orden de la tienda',
  'precio-asc': 'Precio: de menor a mayor',
  'precio-desc': 'Precio: de mayor a menor',
  nombre: 'Nombre (A–Z)',
}

// El filtrado por categoría NO está acá: se hace antes, al armar `products`,
// porque la categoría viene de la URL y no de un control de esta pantalla.
// Antes este tipo tenía un campo `category` que siempre valía 'todo' y una rama
// que nunca se evaluaba.
interface Filters {
  search: string
  onlyWholesale: boolean
  hideOutOfStock: boolean
  maxPrice: number
}

function matches(
  product: Product,
  f: Filters,
  discounts: readonly Discount[],
  /** slug → nombre de categoría: "cintas" tiene que encontrar la categoría. */
  categoryNames: Map<string, string>
): boolean {
  if (f.search) {
    // La coincidencia sale del módulo compartido con el buscador del header:
    // por palabras sueltas y con el vocabulario del rubro. Ver lib/search/match.
    const tokens = expandirConsulta(f.search)
    const texto = textoDeProducto(product, categoryNames.get(product.categorySlug))
    if (tokens.length > 0 && !coincide(texto, tokens)) return false
  }

  const price = summarisePrice(product, discounts)
  if (f.onlyWholesale && !price.hasWholesale) return false
  if (f.hideOutOfStock && product.status === 'soldout') return false
  if (f.maxPrice > 0 && price.fromUyu > f.maxPrice) return false

  return true
}

export function TiendaClient({
  activeCategory = 'todo',
  heading,
  intro,
}: {
  activeCategory?: string
  heading: string
  intro?: string | null
}) {
  // El catálogo sale del provider y no de props: así la grilla refleja lo que se
  // haya editado en el panel, y el filtrado por categoría se deriva acá en vez
  // de venir cocinado del servidor.
  const { products: allProducts, categories, discounts, settings } = useCatalog()
  const products = useMemo(
    () =>
      allProducts
        .filter((p) => p.status !== 'draft')
        .filter((p) => activeCategory === 'todo' || p.categorySlug === activeCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allProducts, activeCategory]
  )
  const router = useRouter()

  // La búsqueda vive en la URL, no sólo en el estado.
  //
  // Tres razones, y la primera es que el sitio ya lo prometía: el JSON-LD del
  // layout declara un SearchAction apuntando a /tienda?q={término}, así que
  // Google puede mandar tráfico a esa dirección. Hasta ahora ese parámetro no
  // hacía nada — le estábamos prometiendo a Google algo que no existía.
  //
  // Las otras dos son de uso diario: una búsqueda se puede COMPARTIR (el link
  // que quien atiende le pega al cliente en el chat lleva el resultado, no la
  // tienda entera), y el botón de volver del navegador deshace la búsqueda en
  // vez de sacarte del sitio.
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [onlyWholesale, setOnlyWholesale] = useState(false)
  const [hideOutOfStock, setHideOutOfStock] = useState(false)
  const [maxPrice, setMaxPrice] = useState(0)
  const [sort, setSort] = useState<SortKey>('destacados')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Techo del control de precio: el "desde" más caro del catálogo, redondeado
  // hacia arriba. Derivarlo evita un tope fijo que deje productos fuera de rango
  // el día que entre un artículo más caro.
  const priceCeiling = useMemo(() => {
    const highest = Math.max(0, ...products.map((p) => summarisePrice(p, discounts).fromUyu))
    return Math.ceil(highest / 100) * 100
  }, [products, discounts])

  // Al cambiar de categoría por URL, los filtros locales se reinician: mantener
  // "sólo por mayor" al saltar de Cintas a Herramientas devolvía cero resultados
  // sin explicar por qué.
  //
  // En el render, no en un efecto: es el patrón de React para ajustar estado
  // cuando cambia una prop. Con un efecto, la grilla se pintaba una vez con los
  // filtros viejos aplicados a la categoría nueva.
  const [lastCategory, setLastCategory] = useState(activeCategory)
  if (lastCategory !== activeCategory) {
    setLastCategory(activeCategory)
    setSearch('')
    setOnlyWholesale(false)
    setHideOutOfStock(false)
    setMaxPrice(0)
  }

  const filters: Filters = { search, onlyWholesale, hideOutOfStock, maxPrice }

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.name])),
    [categories]
  )

  const visible = useMemo(() => {
    const list = products.filter((p) => matches(p, filters, discounts, categoryNames))
    const withPrice = list.map((p) => ({ p, price: summarisePrice(p, discounts) }))
    switch (sort) {
      case 'precio-asc':
        withPrice.sort((a, b) => a.price.fromUyu - b.price.fromUyu)
        break
      case 'precio-desc':
        withPrice.sort((a, b) => b.price.fromUyu - a.price.fromUyu)
        break
      case 'nombre':
        withPrice.sort((a, b) => a.p.name.localeCompare(b.p.name, 'es'))
        break
      default:
        withPrice.sort((a, b) => a.p.sortOrder - b.p.sortOrder)
    }
    return withPrice.map((x) => x.p)
    // `filters` se reconstruye en cada render; las dependencias reales son sus
    // campos, que sí son primitivos y estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, discounts, categoryNames, search, onlyWholesale, hideOutOfStock, maxPrice, sort])

  // Cuántas tarjetas se pintan. 24 entra en tres pantallas de teléfono y en
  // dos de escritorio: alcanza para que se vea que hay catálogo, sin pagar el
  // costo de renderizar el resto.
  const TANDA = 24
  const [tope, setTope] = useState(TANDA)
  const verMas = () => setTope((n) => n + TANDA)

  // Al cambiar los filtros se vuelve al principio: quedarse en "mostrando 96"
  // después de una búsqueda que devuelve 3 resultados no significa nada.
  //
  // En el render y no en un efecto, como el resto de este archivo.
  const claveFiltros = `${search}|${onlyWholesale}|${hideOutOfStock}|${maxPrice}|${sort}`
  const [ultimaClave, setUltimaClave] = useState(claveFiltros)
  if (ultimaClave !== claveFiltros) {
    setUltimaClave(claveFiltros)
    setTope(TANDA)
  }

  const mostrados = useMemo(() => visible.slice(0, tope), [visible, tope])

  const wholesaleCount = useMemo(
    () => products.filter((p) => summarisePrice(p, discounts).hasWholesale).length,
    [products, discounts]
  )

  const activeFilterCount = [onlyWholesale, hideOutOfStock, maxPrice > 0].filter(Boolean).length

  // La URL sigue a lo que se escribe, con retardo.
  //
  // `replace` y no `push`: con push, cada tecla dejaría una entrada en el
  // historial y el botón de volver tendría que apretarse una vez por letra.
  // El retardo es el mismo criterio que el registro de búsquedas: sin él se
  // escribirían c, ci, cin… en la barra de direcciones.
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
  // están pidiendo. Se espera a que el visitante deje de tipear: sin el retardo
  // se anotaría "c", "ci", "cin"… en vez de "cinta".
  const noResults = visible.length === 0 && search.trim().length >= 3
  useEffect(() => {
    if (!noResults) return
    const t = setTimeout(() => recordMissedSearch(search), 1200)
    return () => clearTimeout(t)
  }, [noResults, search])

  const askUrl = whatsappLink(
    settings.contact_whatsapp_url || BRAND.whatsappUrl,
    `¡Hola! ¿Tenés ${search.trim()}? No lo encontré en el sitio.`
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 22px 80px' }}>
      <header style={{ marginBottom: 24 }}>
        <SectionTitle as="h1" style={{ fontSize: 32 }}>
          {heading}
        </SectionTitle>
        {intro && (
          <p
            style={{
              fontFamily: avios.fontSans,
              fontSize: 15.5,
              lineHeight: 1.65,
              color: avios.ink700,
              margin: '10px 0 0',
              maxWidth: 640,
            }}
          >
            {intro}
          </p>
        )}
      </header>

      {/* Categorías */}
      <nav aria-label="Categorías" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip on={activeCategory === 'todo'} onClick={() => router.push('/tienda')}>
            Todo
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              on={activeCategory === c.slug}
              onClick={() => router.push(`/tienda/${c.slug}`)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </nav>

      {/* Barra de búsqueda y filtros */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: `1px solid ${avios.border}`,
          marginBottom: 22,
        }}
      >
        <label style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <span className="sr-only">Buscar en el catálogo</span>
          <span
            aria-hidden
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            <Icon name="magnifying-glass" size={17} color={avios.ink500} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cinta, hilo, 15 mm…"
            style={{
              width: '100%',
              height: 44,
              padding: '0 14px 0 38px',
              borderRadius: 9,
              border: `1px solid ${avios.borderStrong}`,
              fontFamily: avios.fontSans,
              fontSize: 15,
              color: avios.ink900,
              background: '#fff',
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="panel-filtros"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 16px',
            borderRadius: 9,
            border: `1px solid ${activeFilterCount > 0 ? avios.brand600 : avios.borderStrong}`,
            background: activeFilterCount > 0 ? avios.brand50 : '#fff',
            fontFamily: avios.fontSans,
            fontSize: 14,
            color: avios.ink900,
            cursor: 'pointer',
          }}
        >
          <Icon name="sliders-horizontal" size={17} />
          Filtros
          {activeFilterCount > 0 && <Badge tone="ink">{activeFilterCount}</Badge>}
        </button>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="sr-only">Ordenar por</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              height: 44,
              padding: '0 12px',
              borderRadius: 9,
              border: `1px solid ${avios.borderStrong}`,
              fontFamily: avios.fontSans,
              fontSize: 14,
              color: avios.ink900,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtersOpen && (
        <div
          id="panel-filtros"
          style={{
            display: 'flex',
            gap: 26,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            padding: '18px 20px',
            marginBottom: 24,
            background: avios.paper50,
            border: `1px solid ${avios.border}`,
            borderRadius: 12,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyWholesale}
              onChange={(e) => setOnlyWholesale(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: avios.saving600 }}
            />
            <span style={{ fontFamily: avios.fontSans, fontSize: 14.5, color: avios.ink900 }}>
              Sólo con precio por mayor{' '}
              <span style={{ color: avios.ink500 }}>({wholesaleCount})</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOnlyWholesale(false)
                setHideOutOfStock(false)
                setMaxPrice(0)
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <p
        aria-live="polite"
        style={{ fontFamily: avios.fontSans, fontSize: 13.5, color: avios.ink500, margin: '0 0 18px' }}
      >
        {visible.length === products.length
          ? `${products.length} artículos`
          : `${visible.length} de ${products.length} artículos`}
      </p>

      {visible.length === 0 ? (
        <div className="empty-search">
          <Icon name="magnifying-glass" size={26} color={avios.ink300} />
          <h2>
            {search.trim()
              ? `No tenemos publicado «${search.trim()}»`
              : 'Nada con esos filtros'}
          </h2>
          <p>
            El local tiene bastante más de lo que está cargado en el sitio. Si lo necesitás,
            preguntanos: te contestamos si lo tenemos y a cuánto.
          </p>

          <div className="empty-search-actions">
            {search.trim() && (
              <Button variant="whatsapp" size="lg" href={askUrl}>
                <Icon name="whatsapp-logo" weight="fill" size={19} /> Preguntar por «
                {search.trim()}»
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setOnlyWholesale(false)
                setHideOutOfStock(false)
                setMaxPrice(0)
              }}
            >
              Limpiar la búsqueda
            </Button>
          </div>

          {/* Salidas laterales: mejor mandar a una categoría que a la nada. */}
          <div className="empty-search-cats">
            <span>O mirá por categoría:</span>
            {categories.slice(0, 5).map((c) => (
              <button key={c.slug} type="button" onClick={() => router.push(`/tienda/${c.slug}`)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {mostrados.map((p, i) => (
              <ProductCard key={p.id} product={p} discounts={discounts} priority={i < 4} />
            ))}
          </div>

          {/*
            Con el catálogo completo cargado —cientos de artículos— pintar todo
            de una son cientos de tarjetas y cientos de imágenes en el primer
            render. En un teléfono eso es un LCP malo y memoria de más para ver
            los seis primeros.

            Es "ver más" y no scroll infinito a propósito: el scroll infinito
            deja el pie inalcanzable, y ahí viven la dirección, el horario y el
            teléfono, que en una mercería de barrio es a dónde va mucha gente.
          */}
          {visible.length > mostrados.length && (
            <div className="ver-mas">
              <Button variant="secondary" size="lg" onClick={verMas}>
                Ver más artículos
              </Button>
              <span>
                {mostrados.length} de {visible.length}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
