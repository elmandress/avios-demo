// Desborde horizontal en pantalla de teléfono.
//
// Una página que se corre para el costado en un celular se siente rota, y es el
// tipo de defecto que no aparece revisando en una pantalla grande.
//
// Se mide `document.body.scrollWidth`, NO `documentElement.scrollWidth`: con
// `body { overflow-x: hidden }` este último informa el contenido sin recortar y
// da falsos positivos con cualquier tabla que scrollea dentro de su contenedor.
// Ese falso positivo ya hizo perder un rato persiguiendo un problema inexistente.

import { PANEL, SESION_PANEL, TIENDA } from './lib/rutas.mjs'

const ANCHO = 390

const MEDIR = `
(() => {
  const vw = document.documentElement.clientWidth
  const culpables = []
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0) continue
    if (r.right > vw + 1 || r.left < -1) {
      // Un hijo de un contenedor que scrollea no es un problema: es su diseño.
      let p = el.parentElement
      let dentroDeScroll = false
      while (p && p !== document.body) {
        if (getComputedStyle(p).overflowX === 'auto' || getComputedStyle(p).overflowX === 'scroll') {
          dentroDeScroll = true
          break
        }
        p = p.parentElement
      }
      if (dentroDeScroll) continue
      culpables.push({
        tag: el.tagName.toLowerCase(),
        clase: typeof el.className === 'string' ? el.className.slice(0, 40) : '',
        ancho: Math.round(r.width),
      })
    }
  }
  return JSON.stringify({ vw, bodyW: document.body.scrollWidth, culpables: culpables.slice(0, 5) })
})()
`

export async function auditarLayout(cdp, base) {
  const filas = []
  await cdp.limpiarEmulacion()
  await cdp.pantalla(ANCHO, 844, true)

  for (const ruta of [...TIENDA, ...PANEL]) {
    try {
      await cdp.irA(base + ruta)
      if (ruta.startsWith('/panel')) {
        await cdp.evaluar(SESION_PANEL)
        await cdp.irA(base + ruta)
      }
      const m = JSON.parse(await cdp.evaluar(MEDIR))
      filas.push({ ruta, ...m, ok: m.bodyW <= m.vw })
    } catch (err) {
      filas.push({ ruta, ok: false, inaccesible: err.message.slice(0, 90), culpables: [] })
    }
  }

  return filas
}
