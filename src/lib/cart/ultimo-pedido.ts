// El pedido anterior, para poder repetirlo.
//
// De todo lo que la investigación de portales B2B mide, esto es lo que más
// mueve: poner un botón de "volver a pedir lo mismo" sube los pedidos repetidos
// alrededor de un tercio, y baja el tiempo de armar un pedido de minutos a
// segundos.
//
// Y encaja exacto con la clientela de una mercería. Una modista o un taller no
// descubre productos: repite. Compra el mismo hilo, la misma cinta y el mismo
// elástico todos los meses, y hoy eso significa volver a escribir la misma lista
// por WhatsApp, artículo por artículo, o revolver la conversación para encontrar
// el pedido de la vez pasada.
//
// Se guarda en el navegador y no en una cuenta, a propósito: pedirle a una
// modista que se registre para poder repetir un pedido cuesta más clientes de
// los que gana. Con la base conectada esto pasa a ser historial de verdad,
// asociado al teléfono, y sobrevive a cambiar de dispositivo.
//
// Guarda la ELECCIÓN, no los precios: exactamente el mismo criterio que el
// carrito. Un pedido de hace dos meses con los precios de hace dos meses es una
// forma silenciosa de cobrar mal.

import { parseCartState, type CartState } from './types'

const STORAGE_KEY = 'avios.ultimo-pedido.v1'

export interface UltimoPedido {
  state: CartState
  /** Cuándo se mandó, en ISO. Sirve para decir "hace tres semanas". */
  enviadoEn: string
}

export function guardarUltimoPedido(state: CartState): void {
  if (state.lines.length === 0) return
  try {
    const dato: UltimoPedido = { state, enviadoEn: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dato))
  } catch {
    // Sin storage no hay historial. No es motivo para romper el envío.
  }
}

export function leerUltimoPedido(): UltimoPedido | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { state, enviadoEn } = parsed as Partial<UltimoPedido>
    if (typeof enviadoEn !== 'string') return null

    // Se revalida con el mismo parser que el carrito: un guardado de una versión
    // vieja del formato se descarta en vez de renderizarse a medias.
    const limpio = parseCartState(JSON.stringify(state))
    if (limpio.lines.length === 0) return null

    return { state: limpio, enviadoEn }
  } catch {
    return null
  }
}

export function olvidarUltimoPedido(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ya no estaba.
  }
}

/** "hace 3 días" / "hace 2 semanas" / "el 14 de agosto". */
export function haceCuanto(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  if (dias < 14) return 'hace una semana'
  if (dias < 31) return `hace ${Math.floor(dias / 7)} semanas`

  // Más de un mes: la fecha exacta dice más que "hace 6 semanas".
  return `el ${d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })}`
}
