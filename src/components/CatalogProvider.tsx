'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import type { Catalog, Category, Discount, Product } from '@/lib/catalog/types'
import {
  getServerSnapshot,
  getSnapshot,
  registerBaseCatalog,
  subscribe,
} from '@/lib/admin/store'

// El catálogo que ve el navegador.
//
// Es lo que hace que la demo se sienta real: si Alejandra cambia un precio en el
// panel y después abre la tienda, el precio cambió. Sin esto el panel sería una
// maqueta que no mueve nada.
//
// Cómo funciona: el servidor pre-renderiza con el catálogo del archivo (por eso
// las páginas siguen siendo estáticas y el HTML que recibe Google está completo)
// y, ya en el navegador, este provider lo reemplaza por el catálogo editado si
// existe. `useSyncExternalStore` con `getServerSnapshot` garantiza que la
// primera pintada coincida con el HTML del servidor y no rompa la hidratación.
//
// Cuando exista la base, este provider se borra: el servidor ya va a servir el
// catálogo bueno y no hará falta ningún reemplazo en el cliente.

interface CatalogContextValue {
  products: Product[]
  categories: Category[]
  discounts: Discount[]
  settings: Record<string, string>
  /**
   * Cuándo se tocó este catálogo por última vez. El panel lo sella en cada
   * edición (ver `mutate` en admin/store.ts) y de acá sale el "Precios al …"
   * de la lista imprimible: una lista de precios sin fecha no sirve.
   */
  generatedAt: string
  /** true si lo que se está viendo tiene ediciones locales del panel. */
  edited: boolean
  productBySlug: (slug: string) => Product | null
  categoryBySlug: (slug: string) => Category | null
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined)

export function CatalogProvider({
  serverCatalog,
  children,
}: {
  serverCatalog: Catalog
  children: React.ReactNode
}) {
  // El store sólo guarda las EDICIONES; el catálogo del archivo lo aporta el
  // servidor. Se registra antes de suscribirse para que cualquier mutación
  // posterior tenga sobre qué aplicarse.
  registerBaseCatalog(serverCatalog)

  const { editedCatalog, edited, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  // Antes de hidratar se usa lo que mandó el servidor, para que el primer render
  // del cliente sea idéntico al HTML y React no tire un error de hidratación.
  const active = hydrated && edited && editedCatalog ? editedCatalog : serverCatalog

  const value = useMemo<CatalogContextValue>(() => {
    const bySlug = new Map(active.products.map((p) => [p.slug, p]))
    const catBySlug = new Map(active.categories.map((c) => [c.slug, c]))
    return {
      products: active.products,
      categories: [...active.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      discounts: active.discounts,
      settings: active.settings,
      generatedAt: active.generatedAt,
      edited: hydrated && edited,
      productBySlug: (slug) => bySlug.get(slug) ?? null,
      categoryBySlug: (slug) => catBySlug.get(slug) ?? null,
    }
  }, [active, edited, hydrated])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>')
  return ctx
}

/**
 * Versión tolerante para componentes que también se usan fuera del provider
 * (el panel, por ejemplo, monta sus propias tarjetas de producto).
 */
export function useOptionalCatalog(): CatalogContextValue | null {
  return useContext(CatalogContext) ?? null
}
