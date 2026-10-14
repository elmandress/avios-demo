'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Enlace } from './Enlace'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { BRAND } from '@/lib/env'
import { useCatalog } from './CatalogProvider'
import { useCart } from './CartProvider'
import { useFavorites } from './FavoritesProvider'
import { avios, Icon } from './ui/Primitives'

// Las sugerencias se bajan recién al abrir la lupa: traen el diccionario de
// búsqueda y el índice del catálogo, que la mayoría de las visitas no usa.
const ResultadosBusqueda = dynamic(() => import('./ResultadosBusqueda'))

// Header.
//
// Dos cambios de fondo respecto del clon:
//
// 1. Las categorías llegan por props desde el catálogo. Antes estaban escritas a
//    mano en una constante Y en la base: agregar una categoría en el panel no la
//    hacía aparecer en la navegación.
// 2. El buscador filtra en el cliente sobre el catálogo que ya bajó, en vez de
//    pegarle a /api/search. Con 20 artículos, una request por tecla es peor que
//    filtrar en memoria, y además funciona sin base.

interface NavItem {
  href: string
  label: string
  accent?: boolean
}

const NAV: NavItem[] = [
  { href: '/tienda', label: 'Catálogo' },
  { href: '/mayorista', label: 'Por mayor', accent: true },
  { href: '/nosotros', label: 'La mercería' },
  { href: '/contacto', label: 'Contacto' },
]

export function Header({ promo }: { promo: { enabled: boolean; text: string; link: string } }) {
  // Las categorías del menú salen del catálogo, no de una lista escrita a mano:
  // una categoría nueva creada en el panel aparece sola en la navegación.
  const { categories } = useCatalog()
  const pathname = usePathname()
  const router = useRouter()
  const { cart, loading: cartLoading, rawState, hasMounted, openDrawer } = useCart()
  const { count: favCount, hasMounted: favMounted } = useFavorites()

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  // Cerrar los paneles al navegar: si no, el menú mobile queda abierto encima
  // de la página nueva.
  //
  // Va en el render y no en un efecto. Es el patrón que documenta React para
  // "ajustar estado cuando cambia una prop": React descarta este render y vuelve
  // a renderizar de inmediato con el estado nuevo, sin pintar el intermedio. Con
  // un efecto, en cambio, el menú aparecía un instante sobre la página nueva.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
    setSearchOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!searchOpen) return
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [searchOpen])

  // Renglones y no unidades: un globito con "45" porque alguien pidió 45 metros
  // de una cinta se lee como 45 artículos en el carrito.
  // Mientras bajan los productos del carrito se cuenta lo guardado, para que el
  // globito no baje y vuelva a subir.
  const cartCount = !hasMounted ? 0 : cartLoading ? rawState.lines.length : cart.lineCount

  return (
    <>
      {promo.enabled && promo.text && (
        <div
          className="promo-bar"
          style={{
            background: avios.brand700,
            color: '#fff',
            textAlign: 'center',
            padding: '9px 16px',
            fontFamily: avios.fontSans,
            fontSize: 13,
            letterSpacing: '0.01em',
          }}
        >
          {promo.link ? (
            <Enlace href={promo.link} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {promo.text}
            </Enlace>
          ) : (
            promo.text
          )}
        </div>
      )}

      <header className="site-header">
        <div className="site-header-inner">
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icon name={menuOpen ? 'x' : 'list'} size={23} />
          </button>

          <Enlace href="/" className="brand-link" aria-label={`${BRAND.name} — inicio`}>
            <Image
              src="/logo.png"
              // PNG de 3 KB servido tal cual (antes, un SVG de 23 KB).
              unoptimized
              alt=""
              width={32}
              height={32}
              loading="eager"
              style={{ objectFit: 'contain' }}
            />
            <span className="brand-wordmark">{BRAND.shortName.toUpperCase()}</span>
          </Enlace>

          <nav className="nav-desktop" aria-label="Principal">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Enlace
                  key={item.href}
                  href={item.href}
                  style={{
                    fontFamily: avios.fontSans,
                    fontSize: 14.5,
                    fontWeight: active ? 600 : 400,
                    color: item.accent ? avios.saving700 : avios.ink900,
                    textDecoration: 'none',
                    borderBottom: `2px solid ${active ? avios.brand600 : 'transparent'}`,
                    paddingBottom: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Enlace>
              )
            })}
          </nav>

          <div className="header-actions" ref={searchRef}>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Buscar en el catálogo"
              aria-expanded={searchOpen}
              className="icon-button"
            >
              <Icon name="magnifying-glass" size={20} />
            </button>

            {/* Utilidad, no destino de compra: no vale una petición de
                prefetch en la carga inicial. */}
            <Enlace
              href="/mi-lista"
             
              aria-label="Mi lista"
              className="icon-button"
              style={{ position: 'relative' }}
            >
              <Icon name="bookmark" size={20} />
              {favMounted && favCount > 0 && <span className="count-badge">{favCount}</span>}
            </Enlace>

            <button
              onClick={openDrawer}
              aria-label={`Tu pedido${cartCount > 0 ? `, ${cartCount} ${cartCount === 1 ? 'artículo' : 'artículos'}` : ', vacío'}`}
              className="icon-button"
              style={{ position: 'relative' }}
            >
              <Icon name="shopping-bag" size={20} />
              {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="search-panel">
            <div className="search-panel-inner">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <Icon name="magnifying-glass" size={19} color={avios.ink500} />
                <span className="sr-only">Buscar</span>
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter lleva al catálogo con TODOS los resultados: es la
                    // misma dirección que Google conoce (SearchAction del layout).
                    if (e.key === 'Enter' && query.trim().length >= 2) {
                      router.push(`/tienda?q=${encodeURIComponent(query.trim())}`)
                    }
                  }}
                  placeholder="Cinta de raso, hilo encerado, 15 mm…"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontFamily: avios.fontSans,
                    fontSize: 16,
                    color: avios.ink900,
                    background: 'transparent',
                  }}
                />
              </label>

              <ResultadosBusqueda query={query} />
            </div>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav aria-label="Menú">
            {NAV.map((item) => (
              <Enlace key={item.href} href={item.href} className="mobile-menu-link">
                {item.label}
              </Enlace>
            ))}
            <span className="mobile-menu-heading">Categorías</span>
            {categories.map((c) => (
              <Enlace
                key={c.slug}
                href={`/tienda/${c.slug}`}
               
                className="mobile-menu-link mobile-menu-sub"
              >
                {c.name}
              </Enlace>
            ))}
            <Enlace href="/mi-lista" className="mobile-menu-link">
              Mi lista
            </Enlace>
          </nav>
        </div>
      )}
    </>
  )
}
