'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Product, SaleFormat, Variant } from '@/lib/catalog/types'
import { resolveCart, type ResolvedCart } from '@/lib/cart/resolve'
import { getServerSnapshot, getSnapshot, setCart, subscribe } from '@/lib/cart/store'
import { EMPTY_CART, MAX_QTY_PER_LINE, lineKey, type CartLine, type CartState } from '@/lib/cart/types'
import { useCatalog, useProductos } from './CatalogProvider'
import { track } from '@/lib/analytics'
import { avios } from './ui/Primitives'

// Carrito del lado del cliente.
//
// El clon lo tenía contra Supabase: cada `addToCart` era un POST a /api/cart que
// escribía una fila. Con eso venían una tabla `cart_items` sin RLS posible (un
// visitante anónimo no tiene sesión que scopear), una ruta de servicio para
// tapar ese agujero, y un carrito que dejaba de existir si la base fallaba.
//
// Para una tienda que cobra por WhatsApp, ese servidor no compra nada: el pedido
// se cierra en el chat, no hay tabla de órdenes, y nadie necesita el carrito en
// otro dispositivo. Guardarlo en el navegador es más simple, funciona sin
// conexión, no expone datos de nadie, y no depende de que la base esté sana.
//
// Lo que se guarda es sólo la ELECCIÓN (producto, variante, presentación,
// cantidad). Los precios se recalculan contra el catálogo en cada render, así
// que un carrito viejo nunca muestra un precio viejo. La persistencia vive en
// lib/cart/store.ts; acá queda la API que consumen los componentes.

interface CartContextValue {
  cart: ResolvedCart
  /**
   * true mientras falta bajar algún producto del carrito para calcular su
   * precio. En ese lapso las líneas pendientes no se muestran ni se cuentan como
   * "dadas de baja": todavía no se sabe.
   */
  loading: boolean
  /** El estado guardado, sin resolver contra el catálogo. Para el respaldo del último pedido. */
  rawState: CartState
  /** Reemplaza el carrito entero. La usa "volver a pedir lo mismo". */
  replaceCart: (next: CartState) => void
  /** false hasta que se leyó localStorage — evita el parpadeo del contador. */
  hasMounted: boolean
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  add: (
    product: Product,
    variant: Variant,
    format: SaleFormat,
    qty?: number,
    opts?: { openDrawer?: boolean }
  ) => void
  setQty: (line: CartLine, qty: number) => void
  remove: (line: CartLine) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Los descuentos salen del catálogo del cliente y los productos se piden de a
  // uno, sólo los que están en el carrito (ver useProductos): si el precio se
  // editó en el panel, el carrito tiene que cobrar el precio nuevo, y ya no hace
  // falta que el navegador tenga el catálogo entero para saberlo.
  const { discounts } = useCatalog()
  const { state, hydrated } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { productos: products, pendiente } = useProductos(state.lines.map((l) => l.productSlug))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const add = useCallback<CartContextValue['add']>(
    (product, variant, format, qty = 1, opts) => {
      if (format.priceUyu === null) {
        // Presentación sin precio publicado (la medida de la pieza está a
        // confirmar): no se puede poner en el carrito, se consulta por WhatsApp.
        flash('Esa presentación se coordina por WhatsApp')
        return
      }
      const key = lineKey({ productSlug: product.slug, variantId: variant.id, formatId: format.id })
      const amount = Math.max(format.minQty, Math.round(qty))

      setCart((prev) => {
        const exists = prev.lines.some((l) => lineKey(l) === key)
        const lines = exists
          ? prev.lines.map((l) =>
              lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + amount) } : l
            )
          : [
              ...prev.lines,
              {
                productSlug: product.slug,
                variantId: variant.id,
                formatId: format.id,
                qty: Math.min(MAX_QTY_PER_LINE, amount),
                addedAt: Date.now(),
              },
            ]
        return { v: 1, lines }
      })

      track('add_to_cart', { product: product.slug, format: format.id, qty: amount })
      if (opts?.openDrawer !== false) setDrawerOpen(true)
    },
    [flash]
  )

  const setQty = useCallback<CartContextValue['setQty']>((line, qty) => {
    const key = lineKey(line)
    const clamped = Math.min(MAX_QTY_PER_LINE, Math.max(0, Math.round(qty)))
    setCart((prev) => ({
      v: 1,
      lines:
        clamped === 0
          ? prev.lines.filter((l) => lineKey(l) !== key)
          : prev.lines.map((l) => (lineKey(l) === key ? { ...l, qty: clamped } : l)),
    }))
  }, [])

  const remove = useCallback<CartContextValue['remove']>((line) => {
    const key = lineKey(line)
    setCart((prev) => ({ v: 1, lines: prev.lines.filter((l) => lineKey(l) !== key) }))
  }, [])

  const clear = useCallback(() => setCart(() => EMPTY_CART), [])

  // Reemplazar el carrito entero, para "volver a pedir lo mismo". Se valida con
  // el mismo parser en `ultimo-pedido.ts`, así que acá llega ya limpio; lo que
  // no exista en el catálogo lo descarta `resolveCart` al mostrarlo.
  const replaceCart = useCallback((next: CartState) => setCart(() => next), [])

  // `resolveCart` es puro y barato (decenas de líneas contra decenas de
  // productos), así que se recalcula con cada cambio en vez de cachearse.
  const cart = useMemo(() => {
    // Mientras falte algún producto, sólo se resuelven las líneas que ya tienen
    // sus datos; las otras esperan en vez de contarse como dadas de baja.
    const listos = new Set(products.map((p) => p.slug))
    const lines = pendiente ? state.lines.filter((l) => listos.has(l.productSlug)) : state.lines
    return resolveCart(lines, products, discounts)
  }, [state.lines, products, discounts, pendiente])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading: pendiente,
      rawState: state,
      hasMounted: hydrated,
      drawerOpen,
      openDrawer,
      closeDrawer,
      add,
      setQty,
      remove,
      clear,
      replaceCart,
    }),
    [cart, pendiente, state, hydrated, drawerOpen, openDrawer, closeDrawer, add, setQty, remove, clear, replaceCart]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 22px)',
          transform: `translateX(-50%) translateY(${toast ? '0' : '14px'})`,
          zIndex: 131,
          background: avios.ink900,
          color: '#fff',
          padding: '11px 18px',
          borderRadius: 999,
          fontFamily: avios.fontSans,
          fontSize: 13.5,
          boxShadow: avios.shadowMd,
          opacity: toast ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 200ms ease, transform 200ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {toast ?? ''}
      </div>
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
