'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { tarjetasDe, type TarjetaProducto } from '@/lib/catalog/tarjeta'
import { leerIndice, leerIndiceServidor, pedirIndice, suscribirIndice } from '@/lib/catalog/cliente'
import { useCatalog } from './CatalogProvider'

// Vive aparte de CatalogProvider por peso: arrastra la búsqueda (con su
// diccionario del rubro) y las tarjetas, que sólo hacen falta en el catálogo,
// en "mi lista" y cuando se abre el buscador. CatalogProvider lo carga cada
// página del sitio.

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

