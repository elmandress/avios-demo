// La planilla se baja, se vuelve a subir, y el catálogo queda igual.
//
// Es la prueba que sostiene la promesa más cara del panel: que se puede cargar
// un catálogo de cientos de artículos desde Excel en vez de a mano. Si la ida y
// vuelta no cierra, la promesa es humo.
//
// También se prueba el lector de números, porque ahí está el error silencioso
// más caro: Excel en español escribe "1.234,56" y en inglés "1234.56". Leer mal
// uno de los dos convierte $ 1.234 en $ 1,234 y nadie lo nota hasta que alguien
// cobra de menos.

import { DEMO_CATALOG } from '@/lib/catalog/data.ts'
import { catalogoACSV } from '@/lib/admin/respaldo.ts'
import { leerCSV, leerNumero, previsualizarImportacion } from '@/lib/admin/importar.ts'

let fallos = 0
const check = (ok, texto) => {
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${texto}`)
}

console.log('\nNúmeros de planilla\n')

const NUMEROS = [
  ['13', 13],
  ['3,96', 3.96],
  ['3.96', 3.96],
  ['1.234,56', 1234.56],
  ['1,234.56', 1234.56],
  ['1.234', 1234],       // punto de miles, no decimal
  ['1,234', 1234],       // coma de miles, no decimal
  ['$ 396', 396],
  ['  28  ', 28],
  ['', null],
  ['abc', null],
]
for (const [entrada, esperado] of NUMEROS) {
  const r = leerNumero(entrada)
  check(r === esperado, `"${entrada}" → ${r} (esperado ${esperado})`)
}

console.log('\nSeparadores\n')

const conComas = 'a,b,c\n1,2,3'
const conPuntoYComa = 'a;b;c\n1;2;3'
check(leerCSV(conComas)[1].length === 3, 'lee CSV separado por comas')
check(leerCSV(conPuntoYComa)[1].length === 3, 'lee CSV separado por punto y coma (Excel en español)')
check(
  leerCSV('"a,con coma","b"\n"1","2"')[0][0] === 'a,con coma',
  'una coma dentro de comillas no parte la celda'
)
check(
  leerCSV('"dice ""hola"""\n"x"')[0][0] === 'dice "hola"',
  'las comillas dobles se leen como una'
)

console.log('\nIda y vuelta con el catálogo real\n')

const csv = catalogoACSV(DEMO_CATALOG)
// Se importa contra un catálogo vacío de productos: así todo tiene que entrar
// como nuevo y se comprueba que la planilla sola alcanza para reconstruirlo.
const vacio = { ...DEMO_CATALOG, products: [] }
const r = previsualizarImportacion(csv, vacio)

check(r.ok, r.ok ? 'la planilla se acepta entera' : `RECHAZADA: ${r.errores[0]?.motivo}`)
// La planilla es una fila por PRECIO: los artículos "a consultar", que el
// catálogo trae sin precio, no tienen fila y por eso no vuelven por acá.
const conPrecio = DEMO_CATALOG.products.filter((p) => p.variants.some((v) => v.formats.length > 0)).length
check(r.nuevos.length === conPrecio, `entran los ${conPrecio} artículos con precio (entraron ${r.nuevos.length})`)

const preciosOriginal = DEMO_CATALOG.products.reduce(
  (n, p) => n + p.variants.reduce((m, v) => m + v.formats.length, 0),
  0
)
check(r.precios === preciosOriginal, `entran los ${preciosOriginal} precios (entraron ${r.precios})`)

// Lo importante no es el conteo: es que los NÚMEROS lleguen intactos.
if (r.catalogo) {
  const original = new Map(DEMO_CATALOG.products.map((p) => [p.name, p]))
  let comparados = 0
  let distintos = 0
  for (const p of r.catalogo.products) {
    const o = original.get(p.name)
    if (!o) continue
    const precios = (x) =>
      x.variants.flatMap((v) => v.formats.map((f) => `${v.label}|${f.label}|${f.priceUyu}|${f.unitPriceUyu}|${f.contentQty}|${f.unit}|${f.tier}`))
    const a = precios(o).sort().join('\n')
    const b = precios(p).sort().join('\n')
    comparados++
    if (a !== b) {
      distintos++
      if (distintos === 1) console.log(`\n        primer desvío en «${p.name}»:\n${b}\n        esperado:\n${a}\n`)
    }
  }
  check(distintos === 0, `los precios vuelven idénticos en los ${comparados} artículos`)
}

console.log('\nLo que tiene que rechazar\n')

const MALAS = [
  ['planilla vacía', 'Artículo,Presentación,Precio'],
  ['sin las columnas mínimas', 'Nombre,Valor\nCinta,13'],
  ['fila sin precio', 'Artículo,Presentación,Unidad,Precio\nCinta,Por metro,m,'],
  ['fila sin artículo', 'Artículo,Presentación,Unidad,Precio\n,Por metro,m,13'],
  ['unidad inventada', 'Artículo,Presentación,Unidad,Precio\nCinta,Por metro,kilos,13'],
  ['precio negativo', 'Artículo,Presentación,Unidad,Precio\nCinta,Por metro,m,-5'],
]
for (const [nombre, contenido] of MALAS) {
  const x = previsualizarImportacion(contenido, vacio)
  check(!x.ok, `rechaza ${nombre} — "${x.errores[0]?.motivo.slice(0, 70)}…"`)
}

console.log('\nNo borra lo que la planilla no menciona\n')

const parcial = [
  'Categoría,Artículo,Código,Variante,Presentación,Unidad,Contenido,Precio,Precio por unidad,Por mayor,Estado',
  'Cintas,Cinta raso doble faz,,4 mm (Nro 0),Por metro,m,1,15,15,no,publicado',
].join('\n')
const p = previsualizarImportacion(parcial, DEMO_CATALOG)
check(p.ok, 'acepta una planilla con un solo artículo')
check(p.actualizados.length === 1, 'lo marca como actualización, no como alta')
check(
  p.intactos === DEMO_CATALOG.products.length - 1,
  `deja intactos los otros ${DEMO_CATALOG.products.length - 1} artículos (dejó ${p.intactos})`
)
if (p.catalogo) {
  const raso = p.catalogo.products.find((x) => x.name === 'Cinta raso doble faz')
  check(raso?.media.length > 0, 'conserva las fotos, que la planilla no trae')
  check(raso?.variants[0].formats[0].priceUyu === 15, 'aplica el precio nuevo')
}

console.log(`\n${fallos === 0 ? 'Todo verde.' : `${fallos} fallo(s).`}\n`)
process.exit(fallos === 0 ? 0 : 1)
