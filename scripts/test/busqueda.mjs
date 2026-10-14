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
  ['raso 38', 'Cinta de raso doble faz'],
  ['hilo encerado cono', 'Hilo encerado'],
  ['tul 15', null], // cualquiera de los dos tules sirve
  ['cordon calzado lurex', 'Cordón para calzado con lúrex'],

  // Vocabulario del rubro y de la calle.
  ['saten', 'Cinta de raso doble faz'],
  ['satin', 'Cinta de raso doble faz'],
  ['grosgrain', 'Cinta gross'],
  ['piolin', 'Cordón de algodón'],
  ['pasadores', null],
  ['agujetas', null],
  ['cordones de zapatos', null],
  ['humita', 'Moño formal de etiqueta'],
  ['corbatin', 'Moño formal de etiqueta'],
  ['suspensores', null],
  ['acerico', null],
  ['clips para tela', 'Pinza para tela'],
  ['reglas de molderia', 'Caja de reglas para moldería'],
  ['patronaje', 'Caja de reglas para moldería'],
  ['tull', null],
  ['reflectante', 'Cinta reflectiva de seguridad'],
  ['chaleco', 'Cinta reflectiva de seguridad'],
  ['boobtape', 'Adhesivo para la piel (boob tape)'],
  ['macrame', null],
  ['plantillas', 'Plantilla multitalle'],

  // Búsqueda por categoría: de las más frecuentes y no funcionaba.
  ['cintas', null],
  ['herramientas', null],
  ['hilos', null],

  // Sin tilde, como se escribe en un teléfono.
  ['cordon', null],
  ['molderia', 'Caja de reglas para moldería'],

  // Los números se comparan como palabra entera: "4 mm" NO puede traer la de
  // 40 mm. En una mercería con anchos 4, 7, 10, 15, 22 y 40, tratarlos como
  // subcadena convierte cada búsqueda por medida en la lista equivocada.
  ['4 mm', 'Cinta de raso doble faz'],

  // El tul es una tela y se vende por metro: este resultado es correcto.
  ['tela por metro', 'Tul liso · 15 cm'],
]

/**
 * Búsquedas que Avíos NO puede contestar. Tienen que seguir vacías.
 *
 * "tela por metro" estuvo acá y fue un error de esta lista, no del buscador:
 * devolvía los dos tules, y el tul ES una tela que se vende por metro. La
 * respuesta correcta era la del código. Quedó como caso de los que SÍ encuentran.
 */
const NO_ENCUENTRA = [
  'cierre',
  'cremallera',
  'lana',
  'aguja de tejer',
  'boton',
  'maquina de coser',
  'elastico por metro',
]

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
  ['7 mm', 'Cinta reflectiva de seguridad'],
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
const raso = productos.find((p) => p.name === 'Cinta de raso doble faz')
const pGross = puntuar(gross, 'gross', nombreCategoria.get(gross.categorySlug))
const pRasoPorSinonimo = puntuar(raso, 'saten', nombreCategoria.get(raso.categorySlug))
const literalGana = pGross < pRasoPorSinonimo
if (!literalGana) fallos++
console.log(
  `  ${literalGana ? 'ok  ' : 'FALLA'}  literal (${pGross}) antes que sinónimo (${pRasoPorSinonimo})`
)

console.log(`\n${fallos === 0 ? 'Todo verde.' : `${fallos} fallo(s).`}\n`)
process.exit(fallos === 0 ? 0 : 1)
