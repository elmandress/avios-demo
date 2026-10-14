'use client'

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Catalog, Category, Discount, Product } from '@/lib/catalog/types'
import { tarjetasDe, type TarjetaProducto } from '@/lib/catalog/tarjeta'
import {
  leerIndice,
  leerIndiceServidor,
  pedirIndice,
  pedirProductos,
  productoEnCache,
  suscribirIndice,
  suscribirProductos,
  versionProductos,
  versionProductosServidor,
} from '@/lib/catalog/cliente'
import { getServerSnapshot, getSnapshot, subscribe } from '@/lib/admin/store'

// El catálogo que ve el navegador.
//
// Antes este provider recibía el catálogo ENTERO del layout, y con él viajaban
// todas las variantes y precios dentro de cada página del sitio. Con 20
// artículos no se notaba; con miles era el problema principal del proyecto
// (ver AVIOS-PLAN.md, Fase 2).
//
// Ahora recibe sólo lo chico y compartido —categorías, descuentos, textos— y lo
// demás se pide cuando hace falta (lib/catalog/cliente.ts):
//
//   useIndice()     tarjetas livianas de todos los artículos
//   useProductos()  productos completos, de a uno, para el carrito
//
// Las ediciones del panel siguen funcionando igual: el panel guarda en el
// navegador una copia COMPLETA del catálogo editado (lib/admin/store.ts). Si
// existe, todo sale de ahí y no se baja nada. Es lo que hace que la demo se
// sienta real: Alejandra cambia un precio en el panel y la tienda cambia.

/** Lo que el layout manda en cada página: chico a propósito. */
export interface CatalogoBase {
  categories: Category[]
  discounts: Discount[]
  settings: Record<string, string>
  generatedAt: string
}

interface CatalogContextValue extends CatalogoBase {
  /** true si lo que se está viendo tiene ediciones locales del panel. */
  edited: boolean
  /** El catálogo completo editado en el panel (sólo demo), o null. */
  overlay: Catalog | null
  categoryBySlug: (slug: string) => Category | null
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined)

export function CatalogProvider({
  base,
  children,
}: {
  base: CatalogoBase
  children: React.ReactNode
}) {
  const { editedCatalog, edited, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  // Antes de hidratar se usa lo que mandó el servidor, para que el primer render
  // del cliente sea idéntico al HTML y React no tire un error de hidratación.
  const overlay = hydrated && edited && editedCatalog ? editedCatalog : null

  const value = useMemo<CatalogContextValue>(() => {
    const fuente = overlay ?? base
    const categories = [...fuente.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const catBySlug = new Map(categories.map((c) => [c.slug, c]))
    return {
      categories,
      discounts: fuente.discounts,
      settings: overlay ? overlay.settings : base.settings,
      generatedAt: overlay ? overlay.generatedAt : base.generatedAt,
      edited: overlay !== null,
      overlay,
      categoryBySlug: (slug) => catBySlug.get(slug) ?? null,
    }
  }, [overlay, base])

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

/**
 * Las tarjetas de todo el catálogo, o null mientras no llegaron.
 *
 * `activar` en false no pide nada: el header lo pasa recién cuando se abre el
 * buscador, así quien entra a /contacto no baja el índice.
 */
export function useIndice(activar = true): TarjetaProducto[] | null {
  const { overlay } = useCatalog()
  const estado = useSyncExternalStore(suscribirIndice, leerIndice, leerIndiceServidor)

  useEffect(() => {
    if (activar && !overlay) pedirIndice()
  }, [activar, overlay])

  const delPanel = useMemo(() => (overlay ? tarjetasDe(overlay) : null), [overlay])
  return delPanel ?? estado.tarjetas
}

/**
 * Productos completos por slug, para el carrito.
 *
 * Devuelve los que ya están, y `pendiente` mientras falte alguno: así quien lo
 * usa puede esperar en vez de dar por "dado de baja" algo que todavía no llegó.
 */
export function useProductos(slugs: readonly string[]): {
  productos: Product[]
  pendiente: boolean
} {
  const { overlay } = useCatalog()
  const version = useSyncExternalStore(suscribirProductos, versionProductos, versionProductosServidor)
  const clave = [...new Set(slugs)].sort().join('|')

  useEffect(() => {
    if (!overlay && clave) pedirProductos(clave.split('|'))
  }, [clave, overlay])

  return useMemo(() => {
    const lista = clave ? clave.split('|') : []
    if (overlay) {
      return { productos: overlay.products.filter((p) => lista.includes(p.slug)), pendiente: false }
    }
    const productos: Product[] = []
    let pendiente = false
    for (const slug of lista) {
      const p = productoEnCache(slug)
      if (p === undefined) pendiente = true
      else if (p) productos.push(p)
    }
    return { productos, pendiente }
    // `version` es la señal de que la caché cambió: sin ella no se recalcula.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, overlay, version])
}
