// Enlaces rotos.
//
// Recorre las páginas, junta todos los href internos y comprueba que respondan.
// Es la comprobación más barata que existe y encuentra cosas que ni el
// compilador ni el linter ven: una categoría renombrada que dejó un enlace
// viejo en un texto, una ruta que se movió, un slug mal escrito a mano.
//
// Los enlaces externos (WhatsApp, Instagram, Google Maps) NO se comprueban:
// esos servicios bloquean peticiones automáticas y darían falsos negativos
// permanentes. Se listan aparte para poder mirarlos a ojo.

import { PANEL, SESION_PANEL, TIENDA } from './lib/rutas.mjs'

const JUNTAR = `
(() => {
  const internos = new Set()
  const externos = new Set()
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href')
    if (!href || href.startsWith('#')) continue
    if (href.startsWith('http') && !href.startsWith(location.origin)) externos.add(href.split('?')[0])
    else if (href.startsWith('/')) internos.add(href.split('#')[0].split('?')[0])
  }
  return JSON.stringify({ internos: [...internos], externos: [...externos] })
})()
`

export async function auditarEnlaces(cdp, base) {
  const internos = new Map()
  const externos = new Set()

  await cdp.limpiarEmulacion()
  await cdp.pantalla(1280, 900)

  const inaccesibles = []

  for (const ruta of [...TIENDA, ...PANEL]) {
    try {
      await cdp.irA(base + ruta, 2400)
      if (ruta.startsWith('/panel')) {
        await cdp.evaluar(SESION_PANEL)
        await cdp.irA(base + ruta, 2400)
      }
      const { internos: i, externos: e } = JSON.parse(await cdp.evaluar(JUNTAR))
      for (const href of i) {
        if (!internos.has(href)) internos.set(href, ruta)
      }
      for (const href of e) externos.add(href)
    } catch (err) {
      // Una ruta que no se pudo leer es un dato, no una razón para abandonar
      // las otras diecinueve.
      inaccesibles.push({ ruta, motivo: err.message.slice(0, 90) })
    }
  }

  const rotos = []
  for (const [href, desde] of internos) {
    try {
      const r = await fetch(base + href, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })
      // 3xx cuenta como bueno: es una redirección deliberada, no un enlace roto.
      if (r.status >= 400) rotos.push({ href, desde, estado: r.status })
    } catch (e) {
      rotos.push({ href, desde, estado: e.name === 'TimeoutError' ? 'sin respuesta' : 'error' })
    }
  }

  return { revisados: internos.size, rotos, inaccesibles, externos: [...externos].sort() }
}
