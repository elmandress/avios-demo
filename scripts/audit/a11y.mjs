// Auditoría de accesibilidad con axe-core.
//
// Objetivo: CERO violaciones. No es una meta burocrática — la primera pasada
// encontró 204 fallos de contraste en texto que efectivamente no se leía bien
// en un teléfono al sol, que es desde donde compra la mitad de la gente.
//
// axe se inyecta como EXPRESIÓN evaluada y no como <script>: así la Content
// Security Policy del sitio no lo bloquea y no hay que relajar nada para poder
// auditar.

import { readFileSync, existsSync } from 'node:fs'
import { PANEL, SESION_PANEL, TIENDA } from './lib/rutas.mjs'

const AXE_LOCAL = new URL('./lib/axe.min.js', import.meta.url)
const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'

async function cargarAxe() {
  if (existsSync(AXE_LOCAL)) return readFileSync(AXE_LOCAL, 'utf8')
  // Se baja una sola vez y queda en el repo para poder auditar sin conexión.
  const r = await fetch(AXE_CDN)
  if (!r.ok) throw new Error(`No pude bajar axe-core (${r.status}). Guardalo en scripts/audit/lib/axe.min.js`)
  const src = await r.text()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(AXE_LOCAL, src)
  return src
}

export async function auditarAccesibilidad(cdp, base) {
  const axe = await cargarAxe()
  const rutas = [...TIENDA, ...PANEL]
  const porRegla = new Map()
  const detalle = []

  await cdp.limpiarEmulacion()
  await cdp.pantalla(1280, 900)

  const inaccesibles = []

  for (const ruta of rutas) {
    try {
      await cdp.irA(base + ruta)

      if (ruta.startsWith('/panel')) {
        await cdp.evaluar(SESION_PANEL)
        await cdp.irA(base + ruta)
      }

      await cdp.evaluar(axe)

    const crudo = await cdp.evaluar(
      `axe.run(document, {
        resultTypes: ['violations'],
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }).then((r) => JSON.stringify(r.violations.map((v) => ({
        id: v.id,
        impacto: v.impact,
        ayuda: v.help,
        nodos: v.nodes.length,
        ejemplo: v.nodes[0] ? v.nodes[0].html.slice(0, 120) : '',
      }))))`,
      { esperarPromesa: true }
    )

      for (const v of JSON.parse(crudo)) {
        porRegla.set(v.id, (porRegla.get(v.id) ?? 0) + v.nodos)
        detalle.push({ ruta, ...v })
      }
    } catch (err) {
      inaccesibles.push({ ruta, motivo: err.message.slice(0, 90) })
    }
  }

  return { rutas: rutas.length, porRegla, detalle, inaccesibles }
}
