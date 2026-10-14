// El mensaje con el que abre la burbuja de WhatsApp, según dónde está el
// visitante.
//
// Patrón de Dahila: en la ficha, la burbuja verde abre WhatsApp con el
// artículo y la variante ya escritos ("Quería consultar por Cinta gross (15
// mm)"), en vez de un "estoy viendo el sitio" que obliga a explicar todo de
// nuevo. Fuera de la ficha vuelve al mensaje general.

type Oyente = () => void

let mensaje: string | null = null
const oyentes = new Set<Oyente>()

export function fijarConsulta(nuevo: string | null): void {
  if (nuevo === mensaje) return
  mensaje = nuevo
  for (const o of oyentes) o()
}

export function suscribirConsulta(o: Oyente): () => void {
  oyentes.add(o)
  return () => oyentes.delete(o)
}

export const leerConsulta = (): string | null => mensaje
export const leerConsultaServidor = (): string | null => null
