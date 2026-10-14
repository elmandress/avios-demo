'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  toggleFavorite,
} from '@/lib/favorites/store'

// Mi lista.
//
// Antes eran "Favoritos" contra una tabla de Supabase scopeada por cookie, con
// el mismo problema de RLS que el carrito. Acá vive en el navegador.
//
// El nombre cambió a propósito: en una mercería esto no es una wishlist de
// deseo, es la lista de compra de un proyecto —o la de reposición de un taller—
// que se arma en varias sesiones y se pasa al pedido cuando está completa.

interface FavoritesContextValue {
  slugs: readonly string[]
  /** O(1) para el marcador de cada tarjeta de la grilla. */
  has: (slug: string) => boolean
  toggle: (slug: string) => void
  count: number
  hasMounted: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { slugs, hydrated } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const set = useMemo(() => new Set(slugs), [slugs])
  const has = useCallback((slug: string) => set.has(slug), [set])

  const value = useMemo<FavoritesContextValue>(
    () => ({
      slugs,
      has,
      toggle: toggleFavorite,
      count: slugs.length,
      hasMounted: hydrated,
    }),
    [slugs, has, hydrated]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites debe usarse dentro de <FavoritesProvider>')
  return ctx
}
