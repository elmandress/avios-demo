// Detecta tokens de diseño que llegaron vacíos al HTML.
//
// Por qué existe esta comprobación: los tokens vivían dentro de un módulo
// `'use client'`. Cuando un componente de SERVIDOR importa un valor de un módulo
// de cliente, Next no le entrega el objeto sino una referencia, así que
// `avios.brand600` valía `undefined` sin que nada fallara. El HTML salía con
// `border: 1px solid undefined` y `linear-gradient(160deg, undefined 0%, ...)`.
//
// Se veía: ilustraciones invisibles, separadores que no se dibujaban, bordes que
// faltaban. Ni TypeScript ni el linter lo detectan — sólo mirar el HTML lo hace.
//
// Corre sobre el HTML pre-renderizado del build, no sobre el servidor: es más
// rápido y no depende de que haya algo levantado.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SOSPECHOSOS = [
  'solid undefined',
  'undefined 0%',
  'undefined 100%',
  ': undefined',
  ':undefined;',
  'NaNpx',
  'undefinedpx',
]

function htmlDelBuild(dir, encontrados = []) {
  if (!existsSync(dir)) return encontrados
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) htmlDelBuild(ruta, encontrados)
    else if (entrada.name.endsWith('.html')) encontrados.push(ruta)
  }
  return encontrados
}

export function auditarTokens(raiz = '.next/server/app') {
  const archivos = htmlDelBuild(raiz)
  if (archivos.length === 0) {
    return { sinBuild: true, archivos: 0, fallas: [] }
  }

  const fallas = []
  for (const archivo of archivos) {
    const html = readFileSync(archivo, 'utf8')
    for (const patron of SOSPECHOSOS) {
      const n = html.split(patron).length - 1
      if (n > 0) {
        fallas.push({ archivo: archivo.replace(raiz, '') || '/', patron, n })
      }
    }
  }

  return { sinBuild: false, archivos: archivos.length, fallas }
}
