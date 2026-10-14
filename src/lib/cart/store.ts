// Store externo del carrito, para `useSyncExternalStore`.
//
// El carrito vive en localStorage, que es un sistema EXTERNO a React: el
// servidor no lo conoce, otra pestaña puede cambiarlo, y el usuario puede
// borrarlo. La forma correcta de leer algo así desde React es
// `useSyncExternalStore`, no un `useEffect` que hace setState al montar.
//
// La diferencia no es de estilo. Con el efecto, el primer render pinta un
// carrito vacío, el efecto corre, y React vuelve a renderizar: un parpadeo en el
// contador del header en cada carga, y un render en cascada. Con esto, React
// lee el estado hidratado en el mismo commit y el HTML del servidor
// (`getServerSnapshot`) es explícitamente el carrito vacío, que es la verdad
// para el servidor.
//
// El estado vive a nivel de módulo, no de componente: el header, el panel
// lateral y la página del pedido leen todos el mismo objeto sin pasarse props.

import { EMPTY_CART, parseCartState, type CartState } from './types'

const STORAGE_KEY = 'avios.cart.v1'

export interface CartSnapshot {
  state: CartState
  /** false hasta que se leyó localStorage; evita el parpadeo del contador. */
  hydrated: boolean
}

const SERVER_SNAPSHOT: CartSnapshot = { state: EMPTY_CART, hydrated: false }

// `useSyncExternalStore` compara el resultado de getSnapshot por identidad: si
// devolviera un objeto nuevo en cada llamada, React entraría en un bucle de
// renders. Por eso el snapshot se guarda y sólo se reemplaza al cambiar de
// verdad.
let snapshot: CartSnapshot = SERVER_SNAPSHOT
const listeners = new Set<() => void>()

function read(): CartState {
  try {
    return parseCartState(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Modo privado o storage bloqueado: el carrito vive sólo en memoria.
    return EMPTY_CART
  }
}

function write(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sin storage el carrito sigue funcionando hasta recargar la página.
  }
}

function publish(state: CartState) {
  snapshot = { state, hydrated: true }
  for (const listener of listeners) listener()
}

/** Cambio llegado de OTRA pestaña: se refleja acá sin volver a escribir. */
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return
  publish(parseCartState(event.newValue))
}

export function subscribe(listener: () => void): () => void {
  // El primer suscriptor hidrata y engancha la sincronización entre pestañas.
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

export function getSnapshot(): CartSnapshot {
  return snapshot
}

export function getServerSnapshot(): CartSnapshot {
  return SERVER_SNAPSHOT
}

/** Único punto de escritura: persiste y avisa a todos los suscriptores. */
export function setCart(updater: (prev: CartState) => CartState): void {
  const next = updater(snapshot.state)
  write(next)
  publish(next)
}
