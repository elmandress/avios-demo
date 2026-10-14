// Puerta del panel — DEMO, NO ES SEGURIDAD.
//
// ⚠️ LEER ANTES DE PUBLICAR ESTO CON DATOS REALES ⚠️
//
// Esto NO protege nada. Las credenciales están escritas en el código, así que
// viajan al navegador de cualquiera que abra el sitio; el "candado" es una
// variable en sessionStorage que se cambia desde la consola en cinco segundos;
// y no hay servidor validando nada, porque no hay servidor.
//
// Existe por una sola razón: que en la reunión con Alejandra se pueda mostrar
// la pantalla de acceso y que el panel se sienta como lo que va a ser. Nada más.
//
// Lo que hay que hacer antes de que exista UN dato real detrás:
//   1. Auth de verdad (Supabase Auth es el camino natural, ya está el paquete).
//   2. La sesión en una cookie httpOnly, verificada en el servidor.
//   3. Row Level Security en la base — la puerta del navegador no alcanza:
//      quien conozca la URL de la API entra por ahí sin pasar por acá.
//
// Mientras tanto el panel NO expone nada sensible: sirve el mismo catálogo
// público que la tienda, y sus ediciones no salen de ese navegador.

/** Credenciales de la demo. Deliberadamente triviales y públicas. */
export const DEMO_USER = 'admin'
export const DEMO_PASSWORD = 'admin'

const SESSION_KEY = 'avios.panel.sesion.v1'

export function checkCredentials(user: string, password: string): boolean {
  return user.trim().toLowerCase() === DEMO_USER && password === DEMO_PASSWORD
}

export function openSession(): void {
  try {
    // sessionStorage y no localStorage: la sesión muere al cerrar la pestaña,
    // que para una demo que se muestra en una reunión es el comportamiento
    // menos sorprendente.
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Storage bloqueado: la sesión vive en memoria hasta recargar.
  }
}

export function closeSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* nada que hacer */
  }
}

export function hasSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

// ─── Suscripción a la sesión ─────────────────────────────────────────────────
//
// sessionStorage es un sistema externo a React, igual que el carrito: se lee con
// `useSyncExternalStore` y no con un efecto que hace setState al montar. Así el
// primer render del cliente coincide con el HTML del servidor (siempre "sin
// sesión") y no hay un parpadeo del panel antes de decidir si mostrar el login.

let snapshot = { authed: false, checked: false }
const listeners = new Set<() => void>()

const SERVER_SNAPSHOT = { authed: false, checked: false }

function publish() {
  snapshot = { authed: hasSession(), checked: true }
  for (const l of listeners) l()
}

export function subscribeSession(listener: () => void): () => void {
  if (listeners.size === 0) publish()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSessionSnapshot() {
  return snapshot
}

export function getServerSessionSnapshot() {
  return SERVER_SNAPSHOT
}

/** Después de abrir o cerrar sesión hay que avisarle a los suscriptores. */
export function notifySessionChange(): void {
  publish()
}
