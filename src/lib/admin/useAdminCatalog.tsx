'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Catalog } from '@/lib/catalog/types'
import { getServerSnapshot, getSnapshot, registerBaseCatalog, subscribe } from './store'

// El catálogo editable, para las pantallas del panel.
//
// Igual que en el resto del sitio, localStorage se lee con
// `useSyncExternalStore` y no con un efecto: el panel muta el catálogo desde
// muchos lugares y esto hace que todas las pantallas abiertas se enteren del
// cambio sin pasar estado de una a otra.
//
// El catálogo BASE entra por contexto desde el layout del panel, que es de
// servidor y ya lo leyó. NO se importa `DEMO_CATALOG` en ningún módulo de
// cliente: eso metía las 56 KB del catálogo dentro del JavaScript de todo el
// sitio, encima de venir ya en el HTML (ver el comentario en store.ts).

const BaseCatalogContext = createContext<Catalog | null>(null)

export function AdminCatalogProvider({
  baseCatalog,
  children,
}: {
  baseCatalog: Catalog
  children: React.ReactNode
}) {
  // Se registra en el store para que las mutaciones sepan sobre qué aplicarse.
  registerBaseCatalog(baseCatalog)
  return <BaseCatalogContext.Provider value={baseCatalog}>{children}</BaseCatalogContext.Provider>
}

export function useAdminCatalog(): { catalog: Catalog; edited: boolean; hydrated: boolean } {
  const base = useContext(BaseCatalogContext)
  if (!base) {
    throw new Error('useAdminCatalog debe usarse dentro de <AdminCatalogProvider>')
  }

  const { editedCatalog, edited, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  return {
    catalog: hydrated && edited && editedCatalog ? editedCatalog : base,
    edited,
    hydrated,
  }
}
