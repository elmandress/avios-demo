// Pruebas de punta a punta del sitio.
//
//   npm run test:e2e
//   npm run test:e2e -- --url=http://127.0.0.1:3000
//   npm run test:e2e -- --solo=compra
//
// Manejan el sitio en un navegador real, como una persona: hacen clic, escriben
// y leen lo que aparece en pantalla. Comprueban lo único que el sitio tiene que
// hacer bien —que el precio que se ve sea el que se cobra— y todo lo que se
// rompió alguna vez en el camino.
//
// Sin dependencias: el navegador se maneja por CDP, que es WebSocket y JSON.

import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conectar, esperarServidor, lanzarNavegador } from '../audit/lib/cdp.mjs'
import { crearContexto } from './lib/tester.mjs'
import { pruebaCompra } from './compra.mjs'
import { pruebaPanel } from './panel.mjs'
import { pruebaNavegacion } from './navegacion.mjs'

const args = process.argv.slice(2)
const arg = (n, d) => {
  const e = args.find((a) => a.startsWith(`--${n}=`))
  return e ? e.split('=')[1] : d
}

// localhost y no 127.0.0.1: en desarrollo Next sólo hidrata desde el origen
// con el que arrancó. Desde otro, la página carga entera pero queda inerte,
// y el fallo es silencioso. Ver allowedDevOrigins en next.config.ts.
const BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '')
const SOLO = arg('solo', null)
const PUERTO = Number(arg('puerto', '9223'))
const PERFIL = join(tmpdir(), `avios-test-${process.pid}`)

const verde = (s) => `\x1b[32m${s}\x1b[0m`
const rojo = (s) => `\x1b[31m${s}\x1b[0m`
const gris = (s) => `\x1b[90m${s}\x1b[0m`

const SUITES = [
  { nombre: 'compra', fn: pruebaCompra },
  { nombre: 'panel', fn: pruebaPanel },
  { nombre: 'navegacion', fn: pruebaNavegacion },
]

process.stdout.write(gris(`Esperando ${BASE} … `))
if (!(await esperarServidor(BASE, 60))) {
  console.log(rojo('no responde'))
  console.log(gris('  Levantá el sitio: npm run dev'))
  process.exit(1)
}
console.log(verde('listo'))

const navegador = await lanzarNavegador({ puerto: PUERTO, perfil: PERFIL })
const cdp = await conectar(PUERTO)
let fallas = 0

try {
  await cdp.limpiarEmulacion()
  await cdp.pantalla(1280, 900)
  const ctx = crearContexto(cdp, BASE)

  for (const suite of SUITES) {
    if (SOLO && SOLO !== suite.nombre) continue
    try {
      fallas += await suite.fn(ctx)
    } catch (e) {
      fallas++
      console.log(`  ${rojo('ERROR')} la prueba "${suite.nombre}" se cortó: ${e.message}`)
    }
  }
} finally {
  cdp.cerrar()
  navegador.kill()
  try {
    rmSync(PERFIL, { recursive: true, force: true })
  } catch {
    // En Windows el perfil temporal a veces queda tomado; no importa.
  }
}

console.log(
  fallas === 0 ? `\n${verde('Todas las pruebas pasaron.')}\n` : `\n${rojo(`${fallas} prueba(s) fallaron.`)}\n`
)
process.exit(fallas === 0 ? 0 : 1)
