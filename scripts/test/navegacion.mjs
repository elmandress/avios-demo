// Buscar, filtrar y guardar: lo que hace alguien que llega sin saber
// exactamente qué quiere.

import { crearReporte } from './lib/tester.mjs'

export async function pruebaNavegacion(ctx) {
  const r = crearReporte('Búsqueda, filtros y lista')

  await ctx.irA('/tienda', { esperarA: '.product-card' })
  await ctx.limpiarNavegador()
  await ctx.irA('/tienda', { esperarA: '.product-card' })

  const total = await ctx.js(`Number(document.querySelector('.tienda-conteo').textContent.match(/\\d+/)[0])`)

  // ── Filtro por mayor ──────────────────────────────────────────────────────
  await ctx.js(`__txt('button', 'Filtros').click()`)
  await ctx.pausa(500)
  await ctx.js(`{
    const l = [...document.querySelectorAll('#panel-filtros label')]
      .find((x) => x.textContent.includes('por mayor'))
    l.querySelector('input[type=checkbox]').click()
  }`)
  await ctx.esperarQue(`location.search.includes('mayor=1') && !document.querySelector('.tienda-conteo').textContent.includes('597 artículos')`)
  const conMayor = await ctx.js(`Number(document.querySelector('.tienda-conteo').textContent.match(/\\d+/)[0])`)
  r.check(conMayor > 0 && conMayor < total, `"sólo por mayor" deja ${conMayor} de ${total}`)

  await ctx.js(`{
    const l = [...document.querySelectorAll('#panel-filtros label')]
      .find((x) => x.textContent.includes('por mayor'))
    l.querySelector('input[type=checkbox]').click()
  }`)
  await ctx.esperarQue(`!location.search.includes('mayor=') && document.querySelector('.tienda-conteo').textContent.includes('597 artículos')`)
  r.check((await ctx.js(`Number(document.querySelector('.tienda-conteo').textContent.match(/\\d+/)[0])`)) === total, 'al apagarlo vuelven todos')

  // ── Tope de precio ────────────────────────────────────────────────────────
  await ctx.js(`__set(document.querySelector('#panel-filtros input[type=number]'), 100)`)
  await ctx.esperarQue(`location.search.includes('hasta=100')`)
  const precios = await ctx.js(`
    [...document.querySelectorAll('.product-card')].map((c) => {
      const m = c.innerText.match(/\\$ ([\\d.,]+)/)
      return m ? parseFloat(m[1].replace('.', '').replace(',', '.')) : 0
    })
  `)
  r.check(
    precios.length > 0 && precios.every((p) => p <= 100),
    `el tope de precio deja ${precios.length}, ninguno sobre 100`
  )
  await ctx.js(`__set(document.querySelector('#panel-filtros input[type=number]'), '')`)
  await ctx.esperarQue(`!location.search.includes('hasta=')`)

  // ── Orden por precio ──────────────────────────────────────────────────────
  await ctx.js(`
    __set([...document.querySelectorAll('select')].find((s) => s.value === 'destacados'), 'precio-asc')
  `)
  await ctx.esperarQue(`location.search.includes('orden=precio-asc')`)
  const asc = await ctx.js(`
    [...document.querySelectorAll('.product-card')].map((c) => {
      const m = c.innerText.match(/\\$ ([\\d.,]+)/)
      return m ? parseFloat(m[1].replace('.', '').replace(',', '.')) : 0
    })
  `)
  r.check(
    asc.every((v, i) => i === 0 || asc[i - 1] <= v),
    `ordenar de menor a mayor funciona (${asc[0]} … ${asc.at(-1)})`
  )

  await ctx.js(`__txt('button', 'Cerrar filtros')?.click()`)

  // ── Búsqueda: encuentra sin tilde ─────────────────────────────────────────
  await ctx.irA('/tienda', { esperarA: 'input[type=search]' })
  await ctx.js(`__set(document.querySelector('input[type=search]'), 'elastico')`)
  await ctx.esperarQue(`location.search.includes('q=elastico')`)
  const conTilde = await ctx.js(`__n('.product-card')`)
  r.check(conTilde > 0, `"elastico" sin tilde encuentra ${conTilde} artículos con "elástico"`)

  // ── Búsqueda sin resultado: no es un callejón ─────────────────────────────
  await ctx.js(`__set(document.querySelector('input[type=search]'), 'artículo inexistente zzz')`)
  await ctx.esperarSelector('.empty-search')
  await ctx.esperarQue(`JSON.parse(localStorage.getItem('avios.busquedas-sin-resultado.v1') || '[]').length === 1`)
  const vacio = await ctx.js(`document.body.innerText`)
  r.check(vacio.includes('No tenemos publicado'), 'lo que no está lo dice sin rodeos')
  r.check(vacio.includes('Preguntar por'), 'y ofrece preguntarlo por WhatsApp con el término')

  const registrada = await ctx.js(`
    JSON.parse(localStorage.getItem('avios.busquedas-sin-resultado.v1') || '[]').length
  `)
  r.check(registrada === 1, 'la búsqueda fallida queda registrada para el panel')

  // ── Mi lista ──────────────────────────────────────────────────────────────
  await ctx.irA('/tienda', { esperarA: '.product-card' })
  await ctx.js(`
    document.querySelectorAll('button[aria-label*="lista"], button[aria-label*="Guardar"]')[0]?.click()
    true
  `)
  await ctx.pausa(700)
  r.check(
    (await ctx.js(`JSON.parse(localStorage.getItem('avios.lista.v1') || '[]').length`)) === 1,
    'guardar en mi lista funciona'
  )
  await ctx.irA('/mi-lista', { esperarA: 'main' })
  await ctx.esperarQue(`document.querySelectorAll('.product-card').length > 0`)
  r.check((await ctx.js(`__n('.product-card')`)) === 1, 'y el artículo aparece en /mi-lista')

  return r.fallas
}
