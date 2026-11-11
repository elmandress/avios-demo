// El panel: que la puerta funcione, que se pueda editar, y —lo que hace que la
// demo se sienta real— que la tienda refleje la edición al instante.

import { crearReporte, tienePrecio } from './lib/tester.mjs'

export async function pruebaPanel(ctx) {
  const r = crearReporte('Panel de administración')

  await ctx.irA('/panel', { esperarA: '.panel-gate, .panel' })
  await ctx.limpiarNavegador()
  await ctx.irA('/panel', { esperarA: '.panel-login' })

  // ── La puerta ─────────────────────────────────────────────────────────────
  r.check(
    await ctx.js(`document.body.innerText.includes('Entrar al panel')`),
    'sin sesión pide credenciales',
  )

  await ctx.js(`{
    const i = document.querySelectorAll('.panel-login input')
    __set(i[0], 'admin'); __set(i[1], 'incorrecta')
    document.querySelector('.panel-login button[type=submit]').click()
  }`)
  await ctx.pausa(500)
  r.check(
    await ctx.js(`document.body.innerText.includes('incorrectos')`),
    'rechaza una contraseña equivocada',
  )

  await ctx.js(`{
    const i = document.querySelectorAll('.panel-login input')
    __set(i[0], 'admin'); __set(i[1], 'admin')
    document.querySelector('.panel-login button[type=submit]').click()
  }`)
  await ctx.pausa(900)
  r.check(
    await ctx.js(`document.body.innerText.includes('Resumen')`),
    'entra con admin/admin',
  )

  // ── Editar un precio ──────────────────────────────────────────────────────
  await ctx.irA('/panel/productos', { esperarA: '.panel-table' })
  const href = await ctx.js(`
    __txt('a.panel-product-cell', 'Cinta raso doble faz').getAttribute('href')
  `)
  await ctx.irA(href, { esperarA: '.panel-format-table' })
  r.check(
    await ctx.js(`document.body.innerText.includes('Variantes y precios')`),
    'abre el editor con variantes y presentaciones',
  )

  await ctx.js(`{
    const fila = document.querySelectorAll('.panel-format-table tbody tr')[0]
    __set(fila.querySelectorAll('input[type=number]')[1], 99)
  }`)
  await ctx.pausa(400)

  // El precio por unidad se recalcula solo desde el total.
  const unitario = await ctx.js(`
    document.querySelectorAll('.panel-format-table tbody tr')[0]
      .querySelectorAll('input[type=number]')[2].value
  `)
  r.check(
    Number(unitario) === 99,
    `el precio por unidad se recalcula solo (${unitario})`,
  )

  await ctx.js(`__txt('button', 'Guardar producto').click()`)
  await ctx.esperarQue(`location.pathname === '/panel/productos'`)
  r.check(
    await ctx.js(`location.pathname === '/panel/productos'`),
    'guarda y vuelve a la lista',
  )

  // ── La tienda tiene que reflejarlo ────────────────────────────────────────
  await ctx.irA('/tienda/cinta-raso-doble-faz', {
    esperarA: 'input[type=number]',
  })
  r.check(
    tienePrecio(await ctx.js(`document.body.innerText`), 99),
    'la ficha muestra el precio editado ($ 99)',
  )

  // El "desde" de la grilla es el más barato POR MENOR: al subir el de 4 mm a
  // $ 99, pasa a mandar el de 7 mm ($ 15).
  await ctx.irA('/tienda/cintas', { esperarA: '.product-card' })
  const tarjeta = await ctx.js(
    `__txt('.product-card', 'Cinta raso doble faz')?.innerText ?? ''`,
  )
  r.check(
    tienePrecio(tarjeta, 15) && !tienePrecio(tarjeta, 13),
    'la grilla recalcula el "desde" con el precio nuevo',
  )

  await ctx.irA('/', { esperarA: '.hero-merch .product-card' })
  await ctx.esperarQue(
    `__txt('.hero-merch .product-card', 'Cinta raso doble faz').innerText.includes('$ 15')`,
  )
  const portada = await ctx.js(
    `__txt('.hero-merch .product-card', 'Cinta raso doble faz').innerText`,
  )
  r.check(
    tienePrecio(portada, 15) && !tienePrecio(portada, 13),
    'la portada refleja también el precio editado en el panel',
  )

  // ── Ajuste masivo de precios ──────────────────────────────────────────────
  await ctx.irA('/panel/precios', { esperarA: '.price-form' })
  const cambios = await ctx.js(`
    (document.body.innerText.match(/(\\d+) precios van a cambiar/) ?? [])[1] ?? '0'
  `)
  r.check(
    Number(cambios) > 40,
    `la vista previa lista ${cambios} precios antes de aplicar nada`,
  )

  r.check(
    await ctx.js(
      `document.querySelectorAll('.panel-table tbody tr').length === 50`,
    ),
    'la vista previa muestra 50 renglones sin renderizar los miles de precios',
  )
  await ctx.js(`__txt('button', 'Siguientes').click()`)
  await ctx.esperarQue(
    `document.querySelector('nav[aria-label="Páginas de la vista previa"]').textContent.includes('Viendo 51')`,
  )
  r.check(
    await ctx.js(
      `document.querySelectorAll('.panel-table tbody tr').length === 50`,
    ),
    'la página siguiente conserva un máximo de 50 renglones',
  )

  // ── Restaurar deja todo como estaba ───────────────────────────────────────
  await ctx.js(`localStorage.removeItem('avios.panel.catalogo.v1'); true`)
  await ctx.irA('/tienda/cinta-raso-doble-faz')
  r.check(
    tienePrecio(await ctx.js(`document.body.innerText`), 13),
    'restaurar devuelve el catálogo original',
  )

  return r.fallas
}
