// Catálogo editable del panel — el NÚCLEO: estado, lectura y suscripción.
//
// Está separado de las operaciones de edición (store.ts) por peso: la tienda
// sólo necesita saber si hay un catálogo editado para mostrarlo, y esto lo
// carga CADA página del sitio. Las funciones de editar, borrar y ajustar
// precios son sólo del panel y viajan sólo con el panel.
//
// Lo que sigue es la explicación original del store.
//
// Catálogo editable del panel.
//
// El sitio no tiene base de datos todavía (ver src/lib/catalog/index.ts). Para
// que el panel se pueda USAR de verdad en la demo —cargar un producto, cambiar
// un precio, crear una categoría— las ediciones se guardan en el navegador.
//
// Decisión: no se guarda un "diff" contra el catálogo base sino el CATÁLOGO
// ENTERO, copiado la primera vez que alguien edita algo. Un diff obliga a
// inventar semántica de parches (¿qué significa borrar un producto que existe en
// la base?) y a resolver conflictos cuando el archivo base cambia. Copiar el
// catálogo entero son ~30 KB en un almacenamiento de 5 MB, y "Restaurar" vuelve
// a null en una línea.
//
// Consecuencia honesta, que el panel dice en pantalla: las ediciones viven en
// ESE navegador. No se publican para el visitante, no se sincronizan entre
// dispositivos y se van si se borran los datos del sitio. Con la base conectada,
// estas mismas pantallas escriben en Supabase y el cambio sale publicado.

import type { Catalog } from '@/lib/catalog/types'

const STORAGE_KEY = 'avios.panel.catalogo.v1'

export interface AdminSnapshot {
  /** Las ediciones guardadas, o null si el catálogo está sin tocar. */
  editedCatalog: Catalog | null
  /** true cuando hay ediciones guardadas encima del catálogo base. */
  edited: boolean
  /** false hasta leer localStorage — evita parpadeo en la primera pintada. */
  hydrated: boolean
}

const BASE: AdminSnapshot = { editedCatalog: null, edited: false, hydrated: false }

/**
 * El catálogo del archivo, aportado por quien renderiza.
 *
 * NO se importa `DEMO_CATALOG` acá a propósito: este módulo lo consume el
 * CatalogProvider, que es de cliente, así que importarlo metía las 56 KB del
 * catálogo dentro del JavaScript de todas las rutas de la tienda — encima de
 * venir ya en el HTML del servidor.
 *
 * Lo registran los layouts (de servidor, que ya lo leyeron para pre-renderizar)
 * antes de que se pueda mutar nada.
 */
let baseCatalog: Catalog | null = null

export function registerBaseCatalog(catalog: Catalog): void {
  baseCatalog = catalog
}

/** El catálogo sobre el que se aplica la próxima edición. */
export function currentCatalog(): Catalog {
  const c = snapshot.editedCatalog ?? baseCatalog
  if (!c) {
    throw new Error(
      'No hay catálogo base registrado: falta llamar a registerBaseCatalog() desde el layout.'
    )
  }
  return c
}

// `useSyncExternalStore` compara por identidad: el snapshot se guarda y sólo se
// reemplaza cuando cambia de verdad.
let snapshot: AdminSnapshot = BASE
const listeners = new Set<() => void>()

function read(): Catalog | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // Validación mínima: si el guardado quedó de una versión anterior del
    // formato, se descarta y se vuelve al catálogo del archivo. Es preferible
    // perder ediciones de demo a renderizar un catálogo a medias.
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Catalog).products) ||
      !Array.isArray((parsed as Catalog).categories)
    ) {
      return null
    }
    return parsed as Catalog
  } catch {
    return null
  }
}

export function write(catalog: Catalog | null) {
  try {
    if (catalog === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog))
  } catch (e) {
    // Cuota llena (típicamente por fotos en base64) o storage bloqueado.
    // Se avisa fuerte: si no, el usuario cree que guardó y no guardó.
    console.error('No se pudo guardar el catálogo del panel', e)
    throw new Error(
      'No se pudo guardar. Puede que el navegador esté sin espacio: probá con fotos más chicas o restaurá el catálogo de la demo.'
    )
  }
}

export function publish(catalog: Catalog | null) {
  snapshot = {
    editedCatalog: catalog,
    edited: catalog !== null,
    hydrated: true,
  }
  for (const l of listeners) l()
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) publish(read())
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    try {
      publish(read())
    } catch {
      publish(null)
    }
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function getSnapshot(): AdminSnapshot {
  return snapshot
}

/** En el servidor siempre el catálogo del archivo: es lo que se pre-renderiza. */
export function getServerSnapshot(): AdminSnapshot {
  return BASE
}

