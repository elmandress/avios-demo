// Registro de búsquedas sin resultado.
//
// Cuando alguien busca "elástico" o "cierre" y el sitio no tiene nada, pasan dos
// cosas malas: se pierde esa venta, y nadie se entera de que la pidieron. Este
// registro ataca la segunda, que es la que se puede arreglar — le dice a la
// dueña qué le están pidiendo que no está publicado.
//
// Alcance honesto: sin base de datos esto vive en el navegador de CADA visitante,
// así que el panel sólo ve las búsquedas hechas desde esa misma computadora. El
// panel lo aclara en pantalla. Con Supabase conectado, la misma función escribe
// en una tabla y el dato pasa a ser de todo el tráfico.

const STORAGE_KEY = 'avios.busquedas-sin-resultado.v1'
const MAX_TERMS = 60

export interface MissedSearch {
  term: string
  count: number
  /** ISO de la última vez que alguien la buscó. */
  lastAt: string
}

export interface MissedSnapshot {
  terms: readonly MissedSearch[]
  hydrated: boolean
}

const SERVER_SNAPSHOT: MissedSnapshot = { terms: [], hydrated: false }
let snapshot: MissedSnapshot = SERVER_SNAPSHOT
const listeners = new Set<() => void>()

function read(): MissedSearch[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is MissedSearch => !!t && typeof t.term === 'string' && typeof t.count === 'number'
    )
  } catch {
    return []
  }
}

function write(terms: readonly MissedSearch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms))
  } catch {
    // Storage bloqueado: se pierde el registro, que no es crítico.
  }
}

function publish(terms: readonly MissedSearch[]) {
  snapshot = { terms, hydrated: true }
  for (const l of listeners) l()
}

export function subscribeMissed(listener: () => void): () => void {
  if (listeners.size === 0) publish(read())
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getMissedSnapshot(): MissedSnapshot {
  return snapshot
}

export function getServerMissedSnapshot(): MissedSnapshot {
  return SERVER_SNAPSHOT
}

/**
 * Registra un término que no dio resultados.
 *
 * Se normaliza a minúsculas y se recorta: "Elástico", "elastico " y "ELASTICO"
 * son la misma pregunta, y contarlas por separado esconde justamente la señal
 * que se está buscando.
 */
export function recordMissedSearch(rawTerm: string): void {
  const term = rawTerm.trim().toLowerCase().replace(/\s+/g, ' ')
  // Menos de tres letras casi siempre es alguien tipeando, no una búsqueda.
  if (term.length < 3 || term.length > 60) return

  const current = snapshot.hydrated ? [...snapshot.terms] : read()
  const i = current.findIndex((t) => t.term === term)
  const now = new Date().toISOString()

  if (i >= 0) current[i] = { ...current[i], count: current[i].count + 1, lastAt: now }
  else current.push({ term, count: 1, lastAt: now })

  current.sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
  const trimmed = current.slice(0, MAX_TERMS)

  write(trimmed)
  publish(trimmed)
}

export function clearMissedSearches(): void {
  write([])
  publish([])
}
