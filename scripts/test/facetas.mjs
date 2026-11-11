import { readFileSync } from 'node:fs'
import { crearReporte } from './lib/tester.mjs'
export async function pruebaFacetas(ctx) {
  const r = crearReporte('Catálogo facetado y modelos')
  await ctx.irA('/tienda/galones-flecos-y-borlas?tipo=Flecos', {
    esperarA: '.subcategorias button',
  })
  await ctx.esperarQue(
    `document.querySelector('.tienda-conteo').textContent.includes('14 artículos')`,
  )
  r.check(
    await ctx.js(
      `[...document.querySelectorAll('.product-card')].every(c => c.textContent.includes('Fleco'))`,
    ),
    'El enlace compartido restaura los 14 flecos',
  )
  await ctx.js(`__txt('button','Filtros').click()`)
  await ctx.esperarSelector('dialog[open]')
  r.check(
    await ctx.js(
      `document.querySelector('dialog').contains(document.activeElement)`,
    ),
    'El foco entra al panel modal',
  )
  await ctx.js(
    `__txt('#panel-filtros label','color').querySelector('input').click()`,
  )
  await ctx.esperarQue(`location.search.includes('eje=color')`)
  r.check(
    await ctx.js(
      `Number(document.querySelector('.tienda-conteo').textContent.match(/\\d+/)[0]) === 7`,
    ),
    'Tipo y eje se combinan: siete flecos con colores seleccionables',
  )
  await ctx.js(`__txt('button','Cerrar filtros').click()`)
  await ctx.irA('/tienda/galones-flecos-y-borlas?tipo=Flecos&eje=color', {
    esperarA: '.subcategorias button',
  })
  await ctx.esperarQue(
    `document.querySelector('.tienda-conteo').textContent.includes('7 artículos')`,
  )
  r.check(
    await ctx.js(
      `document.querySelectorAll('.filtros-activos .chip').length === 2`,
    ),
    'Una recarga conserva ambos filtros y sus chips',
  )
  await ctx.irA('/tienda/marroqui-m2-2-5-cm', { esperarA: '.variant-search' })
  await ctx.js(`__set(document.querySelector('.variant-search'), '91')`)
  await ctx.pausa(400)
  r.check(
    await ctx.js(
      `[...document.querySelectorAll('button[role=radio]')].filter(b => b.textContent.includes('91')).length === 1`,
    ),
    'Se puede encontrar el modelo 91 sin recorrer la lista',
  )
  await ctx.js(`__txt('button[role=radio]', 'N 91').click()`)
  await ctx.esperarQue(`document.body.innerText.includes('Elegiste: N 91')`)
  await ctx.js(`__txt('button', 'Agregar al pedido').click()`)
  await ctx.esperarQue(
    `JSON.parse(localStorage.getItem('avios.cart.v1') || '{"lines":[]}').lines.length > 0`,
  )
  await ctx.irA('/carrito', { esperarA: '.pedido-articulos img' })
  const products = JSON.parse(
    readFileSync(
      new URL('../../src/lib/catalog/catalogo-pdf.json', import.meta.url),
      'utf8',
    ),
  ).products
  const modelo = products.find((p) => p.slug === 'marroqui-m2-2-5-cm')
  const variante = modelo.variants.find((v) => v.label === 'N 91')
  const foto = modelo.media[variante.mediaIndex].url
  r.check(
    await ctx.js(
      `decodeURIComponent(document.querySelector('.pedido-articulos img').src).includes(${JSON.stringify(foto)})`,
    ),
    'El pedido muestra la foto del modelo 91 elegido, no la primera foto del artículo',
  )

  return r.fallas
}
