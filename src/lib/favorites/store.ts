// Store externo de "mi lista", para `useSyncExternalStore`.
//
// Mismo criterio que el carrito (ver lib/cart/store.ts): localStorage es un
// sistema externo a React y se lee con `useSyncExternalStore`, no con un efecto
// que hace setState al montar.
//
// Se guardan SLUGS, no ids: sobreviven a que el producto se recargue en la base
// con otro id, y son legibles si alguien mira el storage.

const STORAGE_KEY = 'avios.lista.v1'

export interface FavoritesSnapshot {
  slugs: readonly string[]
  hydrated: boolean
}

const SERVER_SNAPSHOT: FavoritesSnapshot = { slugs: [], hydrated: false }

// Identidad estable: `useSyncExternalStore` compara el snapshot por referencia.
let snapshot: FavoritesSnapshot = SERVER_SNAPSHOT
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

function write(slugs: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // Storage bloqueado: la lista vive en memoria hasta recargar.
  }
}

function publish(slugs: readonly string[]) {
  snapshot = { slugs, hydrated: true }
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return
  publish(read())
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    publish(read())
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('storage', onStorage)
    }
  }
}

export function getSnapshot(): FavoritesSnapshot {
  return snapshot
}

export function getServerSnapshot(): FavoritesSnapshot {
  return SERVER_SNAPSHOT
}

export function toggleFavorite(slug: string): void {
  const current = snapshot.slugs
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
  write(next)
  publish(next)
}
