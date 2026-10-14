// Conexión al navegador por CDP, compartida por todas las auditorías.
//
// Se usa un navegador de verdad y no una simulación porque las cosas que
// interesan —contraste real tras aplicar el CSS, desborde tras el layout,
// tiempos de pintado— sólo existen después de que un motor de render haga su
// trabajo. Un análisis estático del código no las ve.
//
// No hay dependencias: CDP es WebSocket + JSON, y Node ya trae los dos.

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { platform } from 'node:os'

const CANDIDATOS = {
  win32: [
    'C:/Program Files (x86)/Microsoft/EdgeCore',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
}

/** Busca un Chrome o Edge instalado. `AUDIT_BROWSER` lo pisa. */
export function buscarNavegador() {
  if (process.env.AUDIT_BROWSER) return process.env.AUDIT_BROWSER

  for (const ruta of CANDIDATOS[platform()] ?? []) {
    if (!existsSync(ruta)) continue
    // EdgeCore guarda el ejecutable dentro de una carpeta con la versión.
    if (ruta.endsWith('EdgeCore')) {
      const version = readdirSync(ruta).find((d) => /^\d+\./.test(d))
      if (version) {
        const exe = `${ruta}/${version}/msedge.exe`
        if (existsSync(exe)) return exe
      }
      continue
    }
    return ruta
  }
  return null
}

/**
 * Levanta el navegador en headless y espera a que el puerto de depuración
 * responda. Devuelve el proceso para poder cerrarlo al final.
 */
export async function lanzarNavegador({ puerto = 9222, perfil }) {
  const exe = buscarNavegador()
  if (!exe) {
    throw new Error(
      'No encontré Chrome ni Edge. Instalá uno, o indicá la ruta con AUDIT_BROWSER=/ruta/al/chrome'
    )
  }

  const proc = spawn(
    exe,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--hide-scrollbars',
      `--remote-debugging-port=${puerto}`,
      `--user-data-dir=${perfil}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  )

  const limite = Date.now() + 30_000
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/json/version`)
      if (r.ok) break
    } catch {
      // Todavía no levantó.
    }
    if (Date.now() > limite) {
      proc.kill()
      throw new Error('El navegador no abrió el puerto de depuración a tiempo.')
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return proc
}

/** Abre una sesión CDP sobre la primera pestaña. */
export async function conectar(puerto = 9222) {
  const tabs = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()
  const tab = tabs.find((t) => t.type === 'page')
  if (!tab) throw new Error('El navegador no tiene ninguna pestaña abierta.')

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  let id = 0
  const pendientes = new Map()

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pendientes.has(msg.id)) {
      pendientes.get(msg.id)(msg)
      pendientes.delete(msg.id)
    }
  })
  await new Promise((r) => ws.addEventListener('open', r))

  const send = (method, params = {}) => {
    const msgId = ++id
    ws.send(JSON.stringify({ id: msgId, method, params }))
    return new Promise((r) => pendientes.set(msgId, r)).then((m) => m.result)
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Network.enable')

  return {
    send,
    cerrar: () => ws.close(),

    /** Evalúa una expresión y devuelve su valor, o tira si la página falló. */
    async evaluar(expression, { esperarPromesa = false } = {}) {
      const r = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: esperarPromesa,
      })
      if (r.exceptionDetails) {
        throw new Error(
          r.exceptionDetails.exception?.description ?? r.exceptionDetails.text ?? 'error en la página'
        )
      }
      return r.result.value
    },

    async irA(url, espera = 2800) {
      await send('Page.navigate', { url })
      await new Promise((r) => setTimeout(r, espera))
    },

    async pantalla(ancho, alto, movil = ancho < 700) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: ancho,
        height: alto,
        deviceScaleFactor: 1,
        mobile: movil,
      })
    },

    /**
     * Emula un teléfono en 4G lenta. Sin esto la medición no dice nada: todo
     * carga desde localhost en una máquina de escritorio.
     */
    async emularMovil4G() {
      await send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      })
      await send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await this.pantalla(390, 844, true)
    },

    /**
     * Devuelve la red y la CPU a su estado normal.
     * IMPORTANTE: los overrides PERSISTEN en la pestaña entre navegaciones. Si
     * no se limpian, todo lo que venga después se ejecuta estrangulado y las
     * capturas salen en negro.
     */
    async limpiarEmulacion() {
      await send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      })
      await send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await send('Emulation.clearDeviceMetricsOverride')
    },
  }
}

/**
 * ¿El servidor está en modo desarrollo?
 *
 * Importa para el reporte: en desarrollo el JavaScript va sin minificar y pesa
 * casi el triple. Un número de "1000 KB" medido en dev al lado de uno de
 * "360 KB" medido en producción invita a conclusiones equivocadas, así que el
 * reporte tiene que decir cuál está mirando.
 *
 * La marca fiable es el cliente de recarga en caliente, que sólo existe en dev.
 */
export async function esDesarrollo(base) {
  try {
    const html = await (await fetch(base, { signal: AbortSignal.timeout(8000) })).text()
    return html.includes('hmr')
  } catch {
    return false
  }
}

/** Espera a que una URL responda HTML. */
export async function esperarServidor(base, segundos = 90) {
  const limite = Date.now() + segundos * 1000
  for (;;) {
    try {
      const r = await fetch(base, { signal: AbortSignal.timeout(5000) })
      if (r.ok) {
        const t = await r.text()
        if (t.includes('<html')) return true
      }
    } catch {
      // Todavía no.
    }
    if (Date.now() > limite) return false
    await new Promise((r) => setTimeout(r, 1000))
  }
}
