// Lo que el navegador baja del catálogo, y cuándo.
//
// Dos archivos estáticos, servidos por el CDN, que se piden recién cuando hacen
// falta y una sola vez por visita:
//
//   /indice.json      una tarjeta por artículo: buscador, filtros, "ver más".
//   /datos/<slug>     un producto completo: lo que el carrito necesita para
//                     recalcular el precio de lo que tiene adentro.
//
// Acá viven las dos cachés en memoria, sin React. Los hooks que las leen están
// en CatalogProvider, que es quien sabe si hay un catálogo editado en el panel
// (en ese caso no se baja nada: el catálogo ya está en el navegador).

import type { Indice, TarjetaProducto } from './tarjeta'
import type { Product } from './types'

type Oyente = () => void

// ─── Índice ─────────────────────────────────────────────────────────────────

export type EstadoIndice =
  | { estado: 'sin-pedir' | 'cargando' | 'error'; tarjetas: null }
  | { estado: 'listo'; tarjetas: TarjetaProducto[] }

let indice: EstadoIndice = { estado: 'sin-pedir', tarjetas: null }
const oyentesIndice = new Set<Oyente>()

function publicarIndice(next: EstadoIndice) {
  indice = next
  for (const o of oyentesIndice) o()
}

export function suscribirIndice(o: Oyente): () => void {
  oyentesIndice.add(o)
  return () => oyentesIndice.delete(o)
}

export const leerIndice = (): EstadoIndice => indice
export const leerIndiceServidor = (): EstadoIndice => SIN_PEDIR
const SIN_PEDIR: EstadoIndice = { estado: 'sin-pedir', tarjetas: null }

/** Pide el índice si nadie lo pidió todavía. Es idempotente: se puede llamar de cualquier lado. */
export function pedirIndice(): void {
  if (indice.estado === 'cargando' || indice.estado === 'listo') return
  publicarIndice({ estado: 'cargando', tarjetas: null })
  fetch('/indice.json')
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<Indice>
    })
    .then((data) => publicarIndice({ estado: 'listo', tarjetas: data.tarjetas }))
    // Un error deja el estado en 'error' y la grilla sigue mostrando lo que vino
    // pre-renderizado. El próximo pedido vuelve a intentar.
    .catch(() => publicarIndice({ estado: 'error', tarjetas: null }))
}

// ─── Productos completos ────────────────────────────────────────────────────

/** slug → producto (null = el servidor dijo que no existe). */
const productos = new Map<string, Product | null>()
const enCamino = new Set<string>()
const oyentesProductos = new Set<Oyente>()
let version = 0

function avisarProductos() {
  version++
  for (const o of oyentesProductos) o()
}

export function suscribirProductos(o: Oyente): () => void {
  oyentesProductos.add(o)
  return () => oyentesProductos.delete(o)
}

export const versionProductos = (): number => version
export const versionProductosServidor = (): number => 0

export function productoEnCache(slug: string): Product | null | undefined {
  return productos.get(slug)
}

/**
 * Guarda productos que ya llegaron con la página (la ficha, por ejemplo), para
 * que agregar al carrito no tenga que volver a pedirlos.
 */
export function registrarProductos(lista: readonly Product[]): void {
  let cambio = false
  for (const p of lista) {
    if (productos.get(p.slug) !== p) {
      productos.set(p.slug, p)
      cambio = true
    }
  }
  if (cambio) avisarProductos()
}

/** Pide los que falten. Los que ya están o ya se pidieron no se repiten. */
export function pedirProductos(slugs: readonly string[]): void {
  for (const slug of slugs) {
    if (productos.has(slug) || enCamino.has(slug)) continue
    enCamino.add(slug)
    fetch(`/datos/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        // 404: el artículo se dio de baja. Se guarda null para que el carrito
        // lo descarte y avise, en vez de quedarse esperando para siempre.
        if (r.status === 404) productos.set(slug, null)
        else if (r.ok) productos.set(slug, (await r.json()) as Product)
      })
      .catch(() => {
        // Sin red: no se guarda nada y se puede volver a intentar.
      })
      .finally(() => {
        enCamino.delete(slug)
        avisarProductos()
      })
  }
}

export function estaEnCamino(slug: string): boolean {
  return enCamino.has(slug)
}
