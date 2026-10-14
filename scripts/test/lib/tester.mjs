// Utilidades para las pruebas de punta a punta.
//
// Manejan el sitio en un navegador real, como lo haría una persona. No hay
// framework: CDP más unas pocas ayudas alcanzan, y así no se agrega una
// dependencia que después hay que mantener.

/** Se inyecta en cada página antes de operar sobre ella. */
export const AYUDAS = `
// Escribir en un input controlado por React necesita el setter nativo del
// prototipo más un evento: asignar .value a secas no dispara el onChange.
window.__set = (el, v) => {
  const proto =
    el.tagName === 'SELECT' ? HTMLSelectElement.prototype
    : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}
window.__txt = (sel, t) =>
  [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(t))
window.__n = (sel) => document.querySelectorAll(sel).length
`

/** Lleva la cuenta de los resultados de una tanda de pruebas. */
export function crearReporte(nombre) {
  const verde = (s) => `\x1b[32m${s}\x1b[0m`
  const rojo = (s) => `\x1b[31m${s}\x1b[0m`
  const gris = (s) => `\x1b[90m${s}\x1b[0m`
  let fallas = 0

  console.log(`\n\x1b[1m${nombre}\x1b[0m\n${'─'.repeat(nombre.length)}`)

  return {
    check(condicion, etiqueta) {
      if (!condicion) fallas++
      console.log(`  ${condicion ? verde('OK') : rojo('MAL')}  ${etiqueta}`)
    },
    nota(texto) {
      console.log(gris(`       ${texto}`))
    },
    get fallas() {
      return fallas
    },
  }
}

/** Envuelve una sesión CDP con lo que necesitan las pruebas. */
export function crearContexto(cdp, base) {
  const ctx = {
    /**
     * Navega y espera a que React haya HIDRATADO, no un tiempo fijo.
     *
     * Dormir un número mágico de milisegundos es la receta para pruebas que
     * pasan en una máquina y fallan en otra: en desarrollo Next compila cada
     * ruta la primera vez que se pide y puede tardar varios segundos. Acá se
     * espera a que aparezca algo que sólo existe después de hidratar.
     */
    async irA(ruta, { esperarA = 'body', minimo = 400 } = {}) {
      await cdp.irA(base + ruta, minimo)
      await ctx.esperarSelector(esperarA)
      await ctx.esperarHidratacion(esperarA)
      await cdp.evaluar(AYUDAS)
    },

    /**
     * Espera a que React se haya enganchado al elemento.
     *
     * Sin esto las pruebas fallan de forma intermitente y por una razón
     * engañosa: el HTML llega del servidor ya renderizado, así que el input
     * EXISTE desde el primer milisegundo, pero React todavía no le puso los
     * handlers. Un evento disparado en esa ventana no hace nada y parece un bug
     * del sitio cuando es un problema de la prueba.
     *
     * React deja una propiedad interna (`__reactFiber$…`) en cada nodo que
     * maneja. Si está, la hidratación ya pasó por ahí.
     */
    async esperarHidratacion(selector = 'body', ms = 25_000) {
      const expr = `
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)})
          if (!el) return false
          return Object.keys(el).some((k) => k.startsWith('__react'))
        })()
      `
      const limite = Date.now() + ms
      for (;;) {
        if (await cdp.evaluar(expr)) return
        if (Date.now() > limite) {
          throw new Error(`"${selector}" nunca hidrató en ${ms / 1000}s`)
        }
        await new Promise((r) => setTimeout(r, 200))
      }
    },

    /** Espera hasta que el selector exista, o se rinde con un error claro. */
    async esperarSelector(selector, ms = 25_000) {
      const limite = Date.now() + ms
      for (;;) {
        const hay = await cdp.evaluar(`!!document.querySelector(${JSON.stringify(selector)})`)
        if (hay) return
        if (Date.now() > limite) {
          throw new Error(`No apareció "${selector}" en ${ms / 1000}s`)
        }
        await new Promise((r) => setTimeout(r, 250))
      }
    },

    /** Espera a que una expresión sea verdadera. Para estados, no para nodos. */
    async esperarQue(expresion, ms = 15_000) {
      const limite = Date.now() + ms
      for (;;) {
        if (await cdp.evaluar(expresion)) return true
        if (Date.now() > limite) return false
        await new Promise((r) => setTimeout(r, 200))
      }
    },

    js: (expr, opts) => cdp.evaluar(expr, opts),
    pausa: (ms) => new Promise((r) => setTimeout(r, ms)),
    async tecla(key) {
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key,
        code: key,
        windowsVirtualKeyCode: key === 'Escape' ? 27 : 0,
      })
    },
    /** Vacía el estado guardado: cada prueba arranca de cero. */
    async limpiarNavegador() {
      await cdp.evaluar(`
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch {}
        true
      `)
    },
    base,
  }

  return ctx
}
