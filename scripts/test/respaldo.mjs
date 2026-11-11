// El respaldo se baja y se vuelve a cargar sin perder nada.
//
// Es la comprobación que sostiene una promesa comercial: "el catálogo es tuyo,
// te lo llevás cuando quieras". Si el JSON no vuelve a entrar, esa frase es
// mentira, y es el tipo de mentira que se descubre el peor día.

import { DEMO_CATALOG } from '@/lib/catalog/data.ts'
import { catalogoACSV, leerRespaldo } from '@/lib/admin/respaldo.ts'

let fallos = 0
const check = (ok, texto) => {
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'}  ${texto}`)
}

console.log('\nRespaldo JSON: ida y vuelta\n')

const serializado = JSON.stringify(DEMO_CATALOG, null, 2)
const vuelta = leerRespaldo(serializado)

check(vuelta.ok, `se acepta el respaldo — ${vuelta.mensaje}`)
check(
  vuelta.catalogo?.products.length === DEMO_CATALOG.products.length,
  `vuelven los ${DEMO_CATALOG.products.length} artículos`
)

const preciosOriginal = DEMO_CATALOG.products.reduce(
  (n, p) => n + p.variants.reduce((m, v) => m + v.formats.length, 0),
  0
)
const preciosVuelta = (vuelta.catalogo?.products ?? []).reduce(
  (n, p) => n + p.variants.reduce((m, v) => m + v.formats.length, 0),
  0
)
check(preciosVuelta === preciosOriginal, `vuelven los ${preciosOriginal} precios`)

check(
  vuelta.catalogo?.generatedAt === DEMO_CATALOG.generatedAt,
  'la fecha del catálogo se conserva (no se pisa con la de hoy)'
)

check(
  Object.keys(vuelta.catalogo?.settings ?? {}).length ===
    Object.keys(DEMO_CATALOG.settings).length,
  'vuelven los textos del sitio'
)

console.log('\nRespaldo JSON: lo que tiene que rechazar\n')

const MALOS = [
  ['texto suelto', 'esto no es json'],
  ['json que no es catálogo', '{"hola":1}'],
  ['catálogo vacío', '{"products":[],"categories":[]}'],
  ['formato viejo', '{"products":[{"nombre":"x"}],"categories":[]}'],
  ['nulo', 'null'],
]

for (const [nombre, contenido] of MALOS) {
  const r = leerRespaldo(contenido)
  check(!r.ok, `rechaza ${nombre} — "${r.mensaje}"`)
}

console.log('\nPlanilla CSV\n')

const csv = catalogoACSV(DEMO_CATALOG)
const lineas = csv.split('\r\n').filter(Boolean)

check(csv.charCodeAt(0) === 0xfeff, 'arranca con BOM (Excel abre bien las tildes)')
check(
  lineas.length === preciosOriginal + 1,
  `una fila por precio más el encabezado (${lineas.length} = ${preciosOriginal} + 1)`
)

// Las comillas se duplican y las comas no rompen la fila: si esto falla, la
// planilla se abre con las columnas corridas y no se nota hasta que alguien
// factura con el precio equivocado.
const columnasEncabezado = lineas[0].split('","').length
const malFormadas = lineas.filter((l) => l.split('","').length !== columnasEncabezado)
check(malFormadas.length === 0, `las ${lineas.length} filas tienen ${columnasEncabezado} columnas`)

check(csv.includes('Cordón de algodón'), 'los acentos sobreviven')
check(csv.includes('"sí"'), 'la columna "Por mayor" marca las piezas cerradas')

console.log(`\n${fallos === 0 ? 'Todo verde.' : `${fallos} fallo(s).`}\n`)
process.exit(fallos === 0 ? 0 : 1)
