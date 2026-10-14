// Core Web Vitals en un teléfono simulado.
//
// Se mide contra el build de PRODUCCIÓN. En desarrollo el JavaScript va sin
// minificar y los números no significan nada.
//
// Umbrales (los de Google para "bueno"):
//   LCP <= 2500 ms   — cuándo aparece lo más grande de la pantalla
//   CLS <= 0.1       — cuánto se mueve el contenido mientras carga
//
// Cuidado con LCP: hay que registrar el observer con `buffered: true` ANTES de
// leer, o `getEntriesByType` devuelve vacío y parece que la página no tuvo LCP.

import { CLAVE } from './lib/rutas.mjs'

const LCP_OBJETIVO = 2500
const CLS_OBJETIVO = 0.1

const MEDIR = `
new Promise((resolve) => {
  let cls = 0
  let lcp = 0

  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  } catch {}

  try {
    new PerformanceObserver((l) => {
      const es = l.getEntries()
      if (es.length) lcp = es[es.length - 1].startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {}

  setTimeout(() => {
    const rs = performance.getEntriesByType('resource')
    const suma = (f) => rs.filter(f).reduce((n, r) => n + (r.transferSize || 0), 0)
    resolve(JSON.stringify({
      lcp: Math.round(lcp),
      cls: +cls.toFixed(4),
      total: suma(() => true),
      js: suma((r) => r.name.includes('/chunks/') || r.name.endsWith('.js')),
      reqs: rs.length,
    }))
  }, 1200)
})
`

export async function auditarRendimiento(cdp, base) {
  const filas = []

  for (const ruta of CLAVE) {
    // La emulación se reaplica en cada vuelta: algunos overrides se pierden al
    // navegar y sin ellos la medición queda inflada.
    await cdp.emularMovil4G()
    await cdp.send('Network.clearBrowserCache')
    await cdp.irA('about:blank', 400)
    await cdp.irA(base + ruta, 9000)

    const m = JSON.parse(await cdp.evaluar(MEDIR, { esperarPromesa: true }))
    filas.push({
      ruta,
      ...m,
      lcpOk: m.lcp > 0 && m.lcp <= LCP_OBJETIVO,
      clsOk: m.cls <= CLS_OBJETIVO,
    })
  }

  // Sin esto, todo lo que se ejecute después queda estrangulado a 4G.
  await cdp.limpiarEmulacion()
  return filas
}
