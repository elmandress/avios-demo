// Auditoría del sitio: accesibilidad, rendimiento, layout en móvil y tokens.
//
//   npm run audit                  contra http://127.0.0.1:3000
//   npm run audit -- --url=...     contra otra dirección
//   npm run audit -- --solo=a11y   una sola auditoría
//
// Necesita el sitio andando. Para números de rendimiento que signifiquen algo,
// contra el build de producción:
//
//   npm run build && npx next start -H 127.0.0.1 -p 3000
//   npm run audit
//
// Devuelve código de salida distinto de cero si algo falla, así sirve en CI.

import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conectar, esDesarrollo, esperarServidor, lanzarNavegador } from './lib/cdp.mjs'
import { auditarAccesibilidad } from './a11y.mjs'
import { auditarRendimiento } from './vitals.mjs'
import { auditarLayout } from './layout.mjs'
import { auditarEnlaces } from './enlaces.mjs'
import { auditarTokens } from './tokens.mjs'

const args = process.argv.slice(2)
const arg = (nombre, porDefecto) => {
  const encontrado = args.find((a) => a.startsWith(`--${nombre}=`))
  return encontrado ? encontrado.split('=')[1] : porDefecto
}

// localhost y no 127.0.0.1: en desarrollo Next sólo hidrata desde el origen
// con el que arrancó. Desde otro, la página carga entera pero queda inerte,
// y el fallo es silencioso. Ver allowedDevOrigins en next.config.ts.
const BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '')
const SOLO = arg('solo', null)
const PUERTO_CDP = Number(arg('puerto', '9222'))
const PERFIL = join(tmpdir(), `avios-audit-${process.pid}`)

const corre = (nombre) => !SOLO || SOLO === nombre

const verde = (s) => `\x1b[32m${s}\x1b[0m`
const rojo = (s) => `\x1b[31m${s}\x1b[0m`
const gris = (s) => `\x1b[90m${s}\x1b[0m`
const titulo = (s) => console.log(`\n\x1b[1m${s}\x1b[0m\n${'─'.repeat(s.length)}`)

let fallas = 0

// ── Tokens: no necesita navegador ni servidor ───────────────────────────────
if (corre('tokens')) {
  titulo('Tokens en el HTML del build')
  const r = auditarTokens()
  if (r.sinBuild) {
    console.log(gris('  sin build todavía — corré `npm run build` para incluir esta comprobación'))
  } else if (r.fallas.length === 0) {
    console.log(`  ${verde('OK')} ${r.archivos} páginas, ningún valor vacío`)
  } else {
    fallas++
    console.log(`  ${rojo('FALLA')} valores sin resolver en el HTML:`)
    for (const f of r.fallas.slice(0, 12)) {
      console.log(`    ${f.archivo}: ${f.n} × "${f.patron}"`)
    }
    console.log(gris('    Suele ser un token importado desde un módulo de cliente hacia'))
    console.log(gris('    un componente de servidor. Ver scripts/audit/tokens.mjs'))
  }
}

// ── El resto necesita el sitio andando ──────────────────────────────────────
const necesitaNavegador = corre('a11y') || corre('vitals') || corre('layout') || corre('enlaces')

if (necesitaNavegador) {
  process.stdout.write(gris(`\nEsperando ${BASE} … `))
  if (!(await esperarServidor(BASE, 60))) {
    console.log(rojo('no responde'))
    console.log(gris('  Levantá el sitio con: npm run dev'))
    process.exit(1)
  }
  console.log(verde('listo'))

  const enDesarrollo = await esDesarrollo(BASE)

  const navegador = await lanzarNavegador({ puerto: PUERTO_CDP, perfil: PERFIL })
  const cdp = await conectar(PUERTO_CDP)

  try {
    if (corre('a11y')) {
      titulo('Accesibilidad (axe-core, WCAG 2.1 AA)')
      const r = await auditarAccesibilidad(cdp, BASE)
      if (r.inaccesibles?.length) {
        fallas++
        for (const i of r.inaccesibles) {
          console.log(`  ${rojo('SIN LEER')} ${i.ruta} — ${i.motivo}`)
        }
      }
      if (r.porRegla.size === 0 && !r.inaccesibles?.length) {
        console.log(`  ${verde('OK')} ${r.rutas} rutas, ninguna violación`)
      } else if (r.porRegla.size > 0) {
        fallas++
        for (const [regla, n] of [...r.porRegla].sort((a, b) => b[1] - a[1])) {
          console.log(`  ${rojo('FALLA')} ${String(n).padStart(4)} × ${regla}`)
        }
        for (const d of r.detalle.slice(0, 6)) {
          console.log(gris(`    ${d.ruta} — ${d.ayuda}`))
          console.log(gris(`      ${d.ejemplo}`))
        }
      }
    }

    if (corre('layout')) {
      titulo('Layout en teléfono (390 px)')
      const filas = await auditarLayout(cdp, BASE)
      const malas = filas.filter((f) => !f.ok)
      if (malas.length === 0) {
        console.log(`  ${verde('OK')} ${filas.length} rutas, ninguna se corre para el costado`)
      } else {
        fallas++
        for (const f of malas) {
          if (f.inaccesible) {
            console.log(`  ${rojo('SIN LEER')} ${f.ruta} — ${f.inaccesible}`)
            continue
          }
          console.log(`  ${rojo('FALLA')} ${f.ruta} — body ${f.bodyW}px en pantalla de ${f.vw}px`)
          for (const c of f.culpables) {
            console.log(gris(`      ${c.tag}.${c.clase} = ${c.ancho}px`))
          }
        }
      }
    }

    if (corre('enlaces')) {
      titulo('Enlaces internos')
      const r = await auditarEnlaces(cdp, BASE)
      if (r.inaccesibles?.length) {
        fallas++
        for (const i of r.inaccesibles) {
          console.log(`  ${rojo('SIN LEER')} ${i.ruta} — ${i.motivo}`)
        }
      }
      if (r.rotos.length === 0) {
        console.log(`  ${verde('OK')} ${r.revisados} destinos distintos, ninguno roto`)
      } else {
        fallas++
        for (const l of r.rotos) {
          console.log(`  ${rojo('ROTO')} ${l.href} (${l.estado}) — enlazado desde ${l.desde}`)
        }
      }
      console.log(gris(`  externos (no se comprueban): ${r.externos.length}`))
      for (const e of r.externos) console.log(gris(`    ${e}`))
    }

    if (corre('vitals')) {
      titulo('Rendimiento (4G lenta, CPU 4×, caché vacía)')
      const filas = await auditarRendimiento(cdp, BASE)
      const kb = (n) => `${Math.round(n / 1024)} KB`
      console.log(
        gris(
          '  ruta'.padEnd(34) + 'LCP'.padStart(9) + 'CLS'.padStart(9) + 'peso'.padStart(10) + 'reqs'.padStart(7)
        )
      )
      for (const f of filas) {
        const lcp = f.lcpOk ? verde(`${f.lcp}ms`) : rojo(`${f.lcp}ms`)
        const cls = f.clsOk ? verde(String(f.cls)) : rojo(String(f.cls))
        if (!f.lcpOk || !f.clsOk) fallas++
        console.log(
          '  ' + f.ruta.padEnd(32) +
            lcp.padStart(18) + cls.padStart(18) +
            kb(f.total).padStart(10) + String(f.reqs).padStart(7)
        )
      }
      console.log(gris('  objetivo: LCP ≤ 2500 ms · CLS ≤ 0,1'))
      if (enDesarrollo) {
        console.log(
          rojo('  ⚠ Medido contra el servidor de DESARROLLO: el JavaScript va sin')
        )
        console.log(
          rojo('    minificar y pesa cerca del triple. Para números reales:')
        )
        console.log(gris('      npm run build && npx next start'))
      }
    }
  } finally {
    cdp.cerrar()
    navegador.kill()
    try {
      rmSync(PERFIL, { recursive: true, force: true })
    } catch {
      // El perfil temporal a veces queda tomado en Windows; no importa.
    }
  }
}

console.log(
  fallas === 0
    ? `\n${verde('Auditoría en verde.')}\n`
    : `\n${rojo(`Auditoría con ${fallas} problema(s).`)}\n`
)
process.exit(fallas === 0 ? 0 : 1)
