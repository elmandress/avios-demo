// El índice liviano dice lo mismo que el catálogo completo.
//
// Desde que la grilla y el buscador trabajan sobre tarjetas (/indice.json) y no
// sobre los productos enteros, hay dos cosas que no se pueden desalinear:
//
// 1. El precio. La tarjeta guarda el "desde" ya calculado; tiene que ser
//    exactamente el de pricing.ts, o la grilla anuncia un precio y la ficha
//    cobra otro — que es el error que originó toda la reforma.
// 2. La búsqueda. Buscar en las tarjetas tiene que dar lo mismo que buscar en
//    los productos, o vuelve "la sugerencia lo muestra y la grilla dice que no".

import { DEMO_CATALOG } from '@/lib/catalog/data'
import { summarisePrice } from '@/lib/catalog/pricing'
import { camposDeTarjeta, tarjetasDe } from '@/lib/catalog/tarjeta'
import { coincide, expandirConsulta, puntuar, puntuarCampos, textoDeProducto } from '@/lib/search/match'

let fallos = 0
const check = (ok, texto) => {
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${texto}`)
}

const productos = DEMO_CATALOG.products.filter((p) => p.status !== 'draft')
const tarjetas = tarjetasDe(DEMO_CATALOG)
const porSlug = new Map(tarjetas.map((t) => [t.slug, t]))
const categoria = new Map(DEMO_CATALOG.categories.map((c) => [c.slug, c.name]))

console.log('\nPrecio de la tarjeta = precio de pricing.ts\n')
// Con y sin el descuento de la demo prendido: el descuento entra al "desde".
for (const descuentos of [DEMO_CATALOG.discounts, DEMO_CATALOG.discounts.map((d) => ({ ...d, active: true }))]) {
  const conDescuento = descuentos.some((d) => d.active)
  const tarjetasD = new Map(tarjetasDe({ ...DEMO_CATALOG, discounts: descuentos }).map((t) => [t.slug, t]))
  const distintos = productos.filter((p) => {
    const esperado = summarisePrice(p, descuentos)
    const t = tarjetasD.get(p.slug)
    return (
      !t ||
      t.precio.fromUyu !== esperado.fromUyu ||
      t.precio.fromListUyu !== esperado.fromListUyu ||
      t.precio.hasWholesale !== esperado.hasWholesale ||
      t.precio.discountPercent !== esperado.discountPercent
    )
  })
  check(
    distintos.length === 0,
    `${productos.length} artículos, ${conDescuento ? 'con' : 'sin'} descuento: ${distintos.length} distintos${distintos.length ? ' — ' + distintos.map((p) => p.name).join(', ') : ''}`
  )
}

console.log('\nBuscar en tarjetas = buscar en productos\n')
const CONSULTAS = [
  'cinta gross 15', 'raso 38', 'hilo encerado cono', 'piolin', 'saten', 'lurex',
  '4 mm', '40 mm', 'pieza', 'rollito', 'cintas', 'herramientas', 'FCS-1', 'negro',
  'elastico', 'tul 15', 'cierre', 'boton', 'xyz',
]
for (const q of CONSULTAS) {
  const tokens = expandirConsulta(q)
  const enProductos = productos
    .filter((p) => tokens.length > 0 && coincide(textoDeProducto(p, categoria.get(p.categorySlug)), tokens))
    .map((p) => p.slug)
  const enTarjetas = tarjetas
    .filter((t) => tokens.length > 0 && coincide(t.busqueda.todo, tokens))
    .map((t) => t.slug)
  const iguales = enProductos.join() === enTarjetas.join()

  // El orden de las sugerencias también: mismo puntaje, artículo por artículo.
  const puntajeDistinto = productos.find(
    (p) => puntuar(p, q, categoria.get(p.categorySlug)) !== puntuarCampos(camposDeTarjeta(porSlug.get(p.slug)), q)
  )
  check(
    iguales && !puntajeDistinto,
    `"${q}" → ${enTarjetas.length} en ambos${puntajeDistinto ? ` (puntaje distinto en ${puntajeDistinto.name})` : ''}`
  )
}

// La taxonomía cubre el catálogo sin tocar su JSON generado.
const galones = tarjetas.filter(t => t.categorySlug === 'galones-flecos-y-borlas')
check(galones.length === 198 && galones.every(t => t.facetas.tipo), 'Los 198 galones tienen un tipo, incluido el grupo residual')
check(galones.filter(t => t.name.startsWith('Fleco')).every(t => t.facetas.tipo === 'Flecos'), 'Los flecos con strass siguen siendo flecos')
check(tarjetas.every(t => Array.isArray(t.facetas.eje) && Array.isArray(t.facetas.presentacion)), 'Facetas serializables en todas las tarjetas')
check(!JSON.stringify(tarjetas).includes('unitPriceUyu'), 'El índice no contiene las presentaciones completas')

console.log(`\n${fallos === 0 ? 'Todo verde.' : `${fallos} fallo(s).`}\n`)
process.exit(fallos === 0 ? 0 : 1)
