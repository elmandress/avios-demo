// "Viste hace poco": los últimos artículos que se abrieron, en este navegador.
//
// Viene de Dahila, donde la tira "Viste hace poco" de /tienda es de lo más
// tocado: quien compara tres cintas va y viene entre fichas, y sin esto tiene
// que volver a buscarlas.
//
// Se guarda la TARJETA (nombre, foto, slug), no el producto: no se muestra
// precio, así que una tarjeta de hace una semana nunca anuncia un precio viejo.
// El precio se ve al entrar a la ficha, que siempre está al día.

import type { TarjetaProducto } from './catalog/tarjeta'

const CLAVE = 'avios.vistos.v1'
const MAXIMO = 8

export type Visto = Pick<TarjetaProducto, 'slug' | 'name' | 'categorySlug' | 'photo'>

const VACIO: Visto[] = []
let actual: Visto[] = VACIO
let leido = false
const oyentes = new Set<() => void>()

function leer(): Visto[] {
  try {
    const raw = localStorage.getItem(CLAVE)
    const lista: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(lista)) return VACIO
    return lista.filter(
      (v): v is Visto => typeof v === 'object' && v !== null && typeof v.slug === 'string' && typeof v.name === 'string'
    )
  } catch {
    return VACIO
  }
}

export function recordarVisto(card: TarjetaProducto): void {
  const nuevo: Visto = { slug: card.slug, name: card.name, categorySlug: card.categorySlug, photo: card.photo }
  const previo = leido ? actual : leer()
  actual = [nuevo, ...previo.filter((v) => v.slug !== card.slug)].slice(0, MAXIMO)
  leido = true
  try {
    localStorage.setItem(CLAVE, JSON.stringify(actual))
  } catch {
    // Sin espacio o bloqueado: la tira simplemente no aparece.
  }
  for (const o of oyentes) o()
}

export function suscribirVistos(o: () => void): () => void {
  if (!leido) {
    actual = leer()
    leido = true
  }
  oyentes.add(o)
  return () => oyentes.delete(o)
}

export const leerVistos = (): Visto[] => actual
export const leerVistosServidor = (): Visto[] => VACIO
