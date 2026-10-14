// El flujo de compra completo, que es lo único que el sitio tiene que hacer
// bien: elegir, ver el precio correcto, y que ese mismo precio llegue al pedido.
//
// El bug que originó toda la reforma vivía exactamente acá: el mensaje de
// WhatsApp cobraba $ 7,92 por dos piezas de 100 metros que valían $ 792.

import { crearReporte, tienePrecio } from './lib/tester.mjs'

export async function pruebaCompra(ctx) {
  const r = crearReporte('Flujo de compra')

  // ── Precio en la grilla ───────────────────────────────────────────────────
  await ctx.irA('/tienda', { esperarA: '.product-card' })
  await ctx.limpiarNavegador()
  await ctx.irA('/tienda', { esperarA: '.product-card' })

  const tarjetas = await ctx.js(`__n('.product-card')`)
  r.check(tarjetas === 20, `la grilla lista los 20 artículos (${tarjetas})`)

  const tarjetaRaso = await ctx.js(`__txt('.product-card', 'Cinta de raso doble faz')?.innerText ?? ''`)
  r.check(tienePrecio(tarjetaRaso, 13), 'la cinta de raso muestra "desde $ 13 el metro"')

  // ── Selección en la ficha ─────────────────────────────────────────────────
  await ctx.irA('/tienda/cinta-raso-doble-faz', { esperarA: 'input[type=number]' })

  r.check(tienePrecio(await ctx.js(`document.body.innerText`), 13), 'la ficha abre en la presentación por menor')

  const porMayor = await ctx.js(`
    document.body.innerText.includes('$ 396') &&
    document.body.innerText.includes('$ 3,96 el metro')
  `)
  r.check(porMayor, 'y muestra la pieza cerrada a $ 396 ($ 3,96 el metro)')

  const ahorro = await ctx.js(`document.body.innerText.includes('Ahorrás 70%')`)
  r.check(ahorro, 'con el ahorro calculado (70%)')

  // ── El recibo previo ──────────────────────────────────────────────────────
  await ctx.js(`__set(document.querySelector('input[type=number]'), 3)`)
  const recibo = await ctx.esperarQue(`document.body.innerText.includes('Vas a pedir 3 metros')`)
  r.check(recibo, 'el bloque "Vas a pedir" dice la cantidad y la unidad')

  // ── El aviso de pieza cerrada ─────────────────────────────────────────────
  await ctx.js(`__set(document.querySelector('input[type=number]'), 45)`)
  await ctx.esperarQue(`!!document.querySelector('.upgrade-hint')`)
  const aviso = await ctx.js(`document.querySelector('.upgrade-hint').innerText`)
  r.check(
    aviso.includes('189') && aviso.includes('55 m'),
    'con 45 m avisa que la pieza sale $ 189 menos y trae 55 m más'
  )
  r.nota(aviso.replace(/\n+/g, ' · ').slice(0, 110))

  // Con 1 metro no debe aparecer: el salto queda demasiado lejos.
  await ctx.js(`__set(document.querySelector('input[type=number]'), 1)`)
  const sinAviso = await ctx.esperarQue(`!document.querySelector('.upgrade-hint')`)
  r.check(sinAviso, 'con 1 metro no aparece — el salto queda lejos y empujaría a gastar de más')

  // ── Carrito y mensaje ─────────────────────────────────────────────────────
  // Se pasa a la pieza cerrada y se piden dos: el caso que el modelo viejo
  // cobraba mal por dos órdenes de magnitud.
  await ctx.js(`{
    const opciones = [...document.querySelectorAll('button[role=radio]')]
    const mayor = opciones.find((c) => c.innerText.includes('Pieza cerrada'))
    if (mayor) mayor.click()
  }`)
  await ctx.esperarQue(`document.body.innerText.includes('CANTIDAD · PIEZAS')`)

  await ctx.js(`__set(document.querySelector('input[type=number]'), 2)`)
  await ctx.esperarQue(`document.body.innerText.includes('Vas a pedir 2 piezas')`)

  await ctx.js(`__txt('button', 'Agregar al pedido').click()`)
  await ctx.esperarQue(`(JSON.parse(localStorage.getItem('avios.cart.v1') || '{"lines":[]}').lines || []).length === 1`)

  await ctx.irA('/carrito', { esperarA: '[class*=cart], main' })
  await ctx.esperarQue(`document.body.innerText.includes('Tu pedido')`)
  const carrito = await ctx.js(`document.body.innerText`)
  r.check(carrito.includes('$ 792'), 'el carrito cobra $ 792 por 2 piezas — no $ 7,92')
  r.check(carrito.includes('200 m'), 'y aclara que son 200 m en total')
  r.check(carrito.includes('1 artículo'), 'cuenta 1 artículo, no 2 unidades sueltas')

  // ── La vista previa del mensaje ───────────────────────────────────────────
  // Es la pieza que hace verificable todo lo anterior: el texto que se manda
  // tiene que decir los mismos números que la pantalla.
  await ctx.js(`document.querySelector('.msg-preview-toggle').click()`)
  await ctx.esperarQue(`!!document.querySelector('.msg-preview-body pre')`)
  const texto = await ctx.js(`document.querySelector('.msg-preview-body pre').innerText`)

  r.check(texto.includes('$ 792'), 'el mensaje cobra el mismo total que la pantalla')
  r.check(texto.includes('200 m'), 'y detalla el contenido total')
  r.check(texto.includes('Pieza cerrada'), 'y nombra la presentación elegida')
  r.check(!texto.includes('localhost'), 'sin direcciones de localhost adentro')

  const boton = await ctx.js(`
    !![...document.querySelectorAll('a,button')].find((e) => e.textContent.includes('Enviar el pedido'))
  `)
  r.check(boton, 'y el botón de enviar está listo')

  return r.fallas
}
