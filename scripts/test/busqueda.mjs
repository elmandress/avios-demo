// La búsqueda encuentra lo que la gente escribe.
//
// Casos sacados de cómo se pide esto en el mostrador y en Instagram, no de lo
// que dice el catálogo. Cada caso es una venta que hoy se perdía o se ganaba.
//
// El bloque final es tan importante como el resto: son búsquedas que TIENEN que
// seguir sin resultado, porque Avíos no vende eso. Si el diccionario empieza a
// devolver algo para "cierre", alguien cruza la ciudad al pedo y además se
// pierde el dato de que se lo están pidiendo (queda registrado en /panel).

import { DEMO_CATALOG } from '@/lib/catalog/data.ts'
import { coincide, expandirConsulta, textoDeProducto, puntuar } from '@/lib/search/match.ts'

const productos = DEMO_CATALOG.products.filter((p) => p.status !== 'draft')
const nombreCategoria = new Map(DEMO_CATALOG.categories.map((c) => [c.slug, c.name]))

function buscar(consulta) {
  const tokens = expandirConsulta(consulta)
  if (tokens.length === 0) return []
  return productos
    .filter((p) => coincide(textoDeProducto(p, nombreCategoria.get(p.categorySlug)), tokens))
    .map((p) => p.name)
}

/** Casos que tienen que encontrar algo, y qué. */
const ENCUENTRA = [
  // Multi-palabra: lo que rompía antes, porque exigía la frase pegada.
  ['cinta gross 15', 'Cinta gross'],
  ['gross 22', 'Cinta gross'],
  ['raso nro 9', 'Cinta raso doble faz'],
  ['hilo encerado cono', 'Hilo encerado'],
  ['tul 15', null],
  ['cordon calzado lurex', 'Cordón para calzado con lúrex 120 cm'],
  ['elastico negro 20', 'Elástico negro'],
  ['marroqui 5 cm', 'Marroquí M3 5 cm'],

  // Por código, como busca el mayorista.
  ['G 144-13', 'Galón para pegar G 144-13'],
  ['TC-128', null],
  ['0713-49', null],
  ['M2', 'Marroquí M2 2,5 cm'],

  // Vocabulario del rubro y de la calle.
  ['saten', 'Cinta raso doble faz'],
  ['satin', 'Cinta raso doble faz'],
  ['grosgrain', 'Cinta gross'],
  ['piolin', 'Cordón de algodón'],
  ['agujetas', null],
  ['cordones de zapatos', null],
  ['humita', 'Moño negro en caja'],
  ['corbatin', 'Moño negro en caja'],
  ['suspensores', null],
  ['acerico', null],
  ['clips para tela', 'Pinza para tela'],
  ['reglas de molderia', 'Caja de reglas de costura 8 piezas'],
  ['patronaje', 'Caja de reglas de costura 8 piezas'],
  ['tull', null],
  ['reflectante', 'Cinta reflectiva 5 cm'],
  ['chaleco', 'Cinta reflectiva 5 cm'],
  ['boobtape', 'Adhesivo para la piel Bob Tape (levanta busto)'],
  ['macrame', 'Hilo para macramé'],
  ['plantillas', 'Plantilla multitalles'],
  ['abrojo', null],
  ['encaje', null],
  ['goma', 'Elástico blanco'],
  ['ganchillo', null],
  ['vincha', null],
  ['pegamento', null],
  ['imperdible', null],

  // Búsqueda por categoría: de las más frecuentes.
  ['cintas', null],
  ['herramientas', null],
  ['hilos', null],
  ['galones', null],
  ['puntillas', null],

  // Sin tilde, como se escribe en un teléfono.
  ['cordon', null],
  ['molderia', 'Caja de reglas de costura 8 piezas'],
  ['elastico', 'Elástico blanco'],

  // Los números se comparan como palabra entera: "4 mm" NO puede traer la de
  // 40 mm.
  ['4 mm', 'Cinta raso doble faz'],

  // El tul es una tela y se vende por metro.
  ['tul por metro', 'Tul 15 cm de ancho'],

  // Lo que la muestra de 20 artículos no tenía y el catálogo completo sí.
  ['aguja de tejer', 'Aguja de tejer'],
  ['lana', null],
  ['elastico por metro', 'Elástico blanco'],
]

/**
 * Búsquedas que Avíos NO puede contestar: no están en su catálogo. Tienen que
 * seguir vacías, para que el sitio ofrezca preguntar por WhatsApp y la búsqueda
 * quede registrada en /panel.
 */
const NO_ENCUENTRA = ['cremallera', 'zipper', 'botones de nacar', 'maniqui', 'xyzxyz']

let fallos = 0

console.log('\nEncuentra lo que se busca\n')
for (const [consulta, debeIncluir] of ENCUENTRA) {
  const r = buscar(consulta)
  const ok = debeIncluir ? r.includes(debeIncluir) : r.length > 0
  if (!ok) fallos++
  const detalle = r.length === 0 ? 'nada' : r.length === 1 ? r[0] : `${r.length}: ${r.slice(0, 3).join(', ')}`
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${consulta.padEnd(24)} → ${detalle}`)
}

console.log('\nNo inventa lo que no se vende\n')
for (const consulta of NO_ENCUENTRA) {
  const r = buscar(consulta)
  const ok = r.length === 0
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${consulta.padEnd(24) } → ${ok ? 'sin resultados (correcto)' : r.join(', ')}`)
}

// Los números se comparan como palabra entera. En una mercería donde los
// anchos son 4, 7, 10, 15, 22 y 40, tratarlos como subcadena hace que cada
// búsqueda por medida devuelva las medidas equivocadas.
console.log('\nNúmeros como palabra entera\n')

for (const [consulta, noDebeTraer] of [
  ['4 mm', 'Cinta gross'],
  ['7 mm', 'Cinta reflectiva 5 cm'],
]) {
  const r = buscar(consulta)
  const ok = !r.includes(noDebeTraer)
  if (!ok) fallos++
  console.log(
    `  ${ok ? 'ok  ' : 'FALLA'}  ${consulta.padEnd(24)} → no arrastra «${noDebeTraer}»`
  )
}

{
  const r = buscar('40 mm')
  const ok = r.length > 0
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${'40 mm'.padEnd(24)} → ${r.join(', ') || 'nada'}`)
}

// El buscador del header ordena con `puntuar`. Lo literal tiene que ganarle
// siempre a lo que llegó por sinónimo, o la primera sugerencia es la equivocada.
console.log('\nOrden de las sugerencias\n')
const gross = productos.find((p) => p.name === 'Cinta gross')
const raso = productos.find((p) => p.name === 'Cinta raso doble faz')
const pGross = puntuar(gross, 'gross', nombreCategoria.get(gross.categorySlug))
const pRasoPorSinonimo = puntuar(raso, 'saten', nombreCategoria.get(raso.categorySlug))
const literalGana = pGross < pRasoPorSinonimo
if (!literalGana) fallos++
console.log(
  `  ${literalGana ? 'ok  ' : 'FALLA'}  literal (${pGross}) antes que sinónimo (${pRasoPorSinonimo})`
)

console.log(`\n${fallos === 0 ? 'Todo verde.' : `${fallos} fallo(s).`}\n`)
process.exit(fallos === 0 ? 0 : 1)
