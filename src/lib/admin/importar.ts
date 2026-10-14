// Importar el catálogo desde una planilla.
//
// Por qué esta es la pieza que decide si el proyecto es viable: Avíos tiene
// cientos de artículos. A precio de mercado, cargar un catálogo de ese tamaño a
// mano —título, descripción, medidas, precios, categoría— se cotiza por SKU y
// da una cifra mayor que el sitio entero. Cargarlos uno por uno en un panel,
// aunque el panel sea bueno, son semanas.
//
// La planilla ya existe del otro lado: `respaldo.ts` la exporta. Esto la lee de
// vuelta, así que el camino es de ida y de vuelta con el mismo archivo. Alejandra
// puede bajar la planilla, trabajarla en Excel con el catálogo en papel al lado
// —o mandársela a alguien para que la complete— y subirla.
//
// Tres reglas que hacen que se pueda confiar:
//
//   1. NUNCA se aplica a medias. Si una fila está mal, no entra ninguna. Un
//      catálogo importado a la mitad es peor que no haber importado.
//   2. Se muestra qué va a pasar ANTES de que pase: cuántos se crean, cuántos
//      se actualizan, y el detalle de cada error con su número de fila.
//   3. No inventa. Una celda vacía en Precio es un error, no un cero.

import type {
  Catalog,
  Category,
  MeasureUnit,
  Product,
  SaleFormat,
  Variant,
} from '@/lib/catalog/types'
import { slugify, normalizeText } from '@/lib/media'

// ─── Lectura del CSV ─────────────────────────────────────────────────────────

/**
 * Parser de CSV que respeta comillas.
 *
 * No se usa `split(',')`: los nombres traen comas ("Cinta de raso, doble faz")
 * y las descripciones traen comillas. Una planilla exportada de Excel es CSV
 * bien formado y hay que leerlo como tal, no adivinarlo.
 *
 * Acepta separador coma o punto y coma: Excel en español exporta con punto y
 * coma según la configuración regional, y esa es la causa número uno de "no me
 * anda el archivo".
 */
export function leerCSV(texto: string): string[][] {
  // El BOM que escribe nuestro propio exportador quedaría pegado a la primera
  // celda del encabezado y "Categoría" no coincidiría con nada.
  const limpio = texto.replace(/^﻿/, '')

  const separador = detectarSeparador(limpio)
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let enComillas = false

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]

    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          celda += '"'
          i++
        } else {
          enComillas = false
        }
      } else {
        celda += c
      }
      continue
    }

    if (c === '"') {
      enComillas = true
    } else if (c === separador) {
      fila.push(celda)
      celda = ''
    } else if (c === '\n') {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
    } else if (c !== '\r') {
      celda += c
    }
  }

  if (celda !== '' || fila.length > 0) {
    fila.push(celda)
    filas.push(fila)
  }

  return filas.filter((f) => f.some((c) => c.trim() !== ''))
}

/** Coma o punto y coma, según cuál aparezca más en la primera línea. */
function detectarSeparador(texto: string): string {
  const primera = texto.split('\n')[0] ?? ''
  const comas = (primera.match(/,/g) ?? []).length
  const puntoYComa = (primera.match(/;/g) ?? []).length
  return puntoYComa > comas ? ';' : ','
}

// ─── Interpretación de cada celda ────────────────────────────────────────────

/**
 * Un número de una planilla.
 *
 * Excel en español escribe "1.234,56": punto de miles y coma decimal. En inglés
 * escribe "1234.56". Se aceptan las dos, porque el archivo puede venir de
 * cualquiera de las dos configuraciones y el usuario no tiene por qué saberlo.
 */
export function leerNumero(bruto: string): number | null {
  const s = bruto.trim().replace(/\s|\$/g, '')
  if (s === '') return null

  let normalizado: string
  const tieneComa = s.includes(',')
  const tienePunto = s.includes('.')

  if (tieneComa && tienePunto) {
    // El separador decimal es el que aparece más a la derecha.
    normalizado = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '')
  } else if (tieneComa) {
    // "1,50" es un decimal; "1,234" con tres cifras después es miles.
    const decimales = s.length - s.lastIndexOf(',') - 1
    normalizado = decimales === 3 ? s.replace(/,/g, '') : s.replace(',', '.')
  } else {
    // "1.234" con tres cifras después del punto es miles, no decimal.
    const decimales = tienePunto ? s.length - s.lastIndexOf('.') - 1 : 0
    normalizado = tienePunto && decimales === 3 ? s.replace(/\./g, '') : s
  }

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

const UNIDADES: Record<string, MeasureUnit> = {
  m: 'm',
  metro: 'm',
  metros: 'm',
  yd: 'yd',
  yarda: 'yd',
  yardas: 'yd',
  u: 'u',
  unidad: 'u',
  unidades: 'u',
}

function leerUnidad(bruto: string): MeasureUnit | null {
  return UNIDADES[normalizeText(bruto)] ?? null
}

const SI = new Set(['si', 'sí', 'x', 'true', '1', 'mayor', 'por mayor'])

// ─── El resultado ────────────────────────────────────────────────────────────

export interface ErrorFila {
  fila: number
  motivo: string
}

export interface ResumenImportacion {
  ok: boolean
  /** Artículos que no existían y se van a crear. */
  nuevos: string[]
  /** Artículos que existen y se van a reemplazar. */
  actualizados: string[]
  /** Categorías que no existen y se van a crear. */
  categoriasNuevas: string[]
  /** Artículos del catálogo actual que la planilla NO menciona: no se tocan. */
  intactos: number
  precios: number
  errores: ErrorFila[]
  /** El catálogo resultante, sólo si no hay errores. */
  catalogo?: Catalog
}

const COLUMNAS_MINIMAS = ['artículo', 'presentación', 'precio']

/**
 * Lee la planilla y devuelve qué pasaría, sin aplicar nada.
 *
 * La importación es por artículo, no destructiva: lo que la planilla no
 * menciona queda como está. Borrar por omisión sería la manera más rápida de
 * que alguien pierda medio catálogo por subir el archivo equivocado.
 */
export function previsualizarImportacion(texto: string, actual: Catalog): ResumenImportacion {
  const filas = leerCSV(texto)
  const errores: ErrorFila[] = []

  if (filas.length < 2) {
    return vacio([{ fila: 0, motivo: 'La planilla no tiene filas de datos.' }])
  }

  // ── Encabezado ──
  const encabezado = filas[0].map((c) => normalizeText(c))
  const col = (nombre: string) => encabezado.indexOf(normalizeText(nombre))

  const faltantes = COLUMNAS_MINIMAS.filter((c) => col(c) < 0)
  if (faltantes.length > 0) {
    return vacio([
      {
        fila: 1,
        motivo: `Faltan columnas obligatorias: ${faltantes.join(', ')}. Bajá la planilla desde Respaldo y usá ese formato.`,
      },
    ])
  }

  const iCategoria = col('categoría')
  const iArticulo = col('artículo')
  const iCodigo = col('código')
  const iVariante = col('variante')
  const iPresentacion = col('presentación')
  const iUnidad = col('unidad')
  const iContenido = col('contenido')
  const iPrecio = col('precio')
  const iPrecioUnidad = col('precio por unidad')
  const iMayor = col('por mayor')
  const iEstado = col('estado')

  // ── Agrupar: artículo → variante → presentaciones ──
  interface FilaLeida {
    fila: number
    categoria: string
    articulo: string
    codigo: string
    variante: string
    presentacion: string
    unidad: MeasureUnit
    contenido: number | null
    precio: number | null
    precioUnidad: number
    mayor: boolean
    estado: Product['status']
  }

  const leidas: FilaLeida[] = []

  for (let f = 1; f < filas.length; f++) {
    const r = filas[f]
    const numeroDeFila = f + 1 // como lo numera Excel
    const celda = (i: number) => (i >= 0 && i < r.length ? r[i].trim() : '')

    const articulo = celda(iArticulo)
    if (articulo === '') {
      errores.push({ fila: numeroDeFila, motivo: 'Falta el nombre del artículo.' })
      continue
    }

    const presentacion = celda(iPresentacion)
    if (presentacion === '') {
      errores.push({
        fila: numeroDeFila,
        motivo: `«${articulo}»: falta la presentación (por ejemplo "Por metro" o "Pieza cerrada · 100 m").`,
      })
      continue
    }

    const unidadBruta = celda(iUnidad) || 'u'
    const unidad = leerUnidad(unidadBruta)
    if (!unidad) {
      errores.push({
        fila: numeroDeFila,
        motivo: `«${articulo}»: unidad «${unidadBruta}» no reconocida. Usá m, yd o u.`,
      })
      continue
    }

    const contenido = leerNumero(celda(iContenido))
    const precio = leerNumero(celda(iPrecio))
    const precioUnidadCelda = leerNumero(celda(iPrecioUnidad))

    // El precio por unidad se deriva si no vino; si no hay ni precio ni
    // contenido, no hay de dónde sacarlo y eso sí es un error.
    let precioUnidad: number | null = precioUnidadCelda
    if (precioUnidad === null) {
      if (precio !== null && contenido !== null && contenido > 0) {
        precioUnidad = Math.round((precio / contenido) * 100) / 100
      } else if (precio !== null) {
        precioUnidad = precio
      }
    }

    if (precioUnidad === null) {
      errores.push({
        fila: numeroDeFila,
        motivo: `«${articulo}»: falta el precio. Si todavía no lo sabés, dejá la fila afuera — el sitio no inventa precios.`,
      })
      continue
    }

    if (precioUnidad < 0 || (precio !== null && precio < 0)) {
      errores.push({ fila: numeroDeFila, motivo: `«${articulo}»: hay un precio negativo.` })
      continue
    }

    const estadoBruto = normalizeText(celda(iEstado))
    const estado: Product['status'] =
      estadoBruto === 'sin stock' ? 'soldout' : estadoBruto === 'borrador' ? 'draft' : 'active'

    leidas.push({
      fila: numeroDeFila,
      categoria: celda(iCategoria),
      articulo,
      codigo: celda(iCodigo),
      variante: celda(iVariante),
      presentacion,
      unidad,
      contenido,
      precio,
      precioUnidad,
      mayor: SI.has(normalizeText(celda(iMayor))),
      estado,
    })
  }

  if (errores.length > 0) {
    return vacio(errores)
  }

  // ── Categorías ──
  const categoriasPorNombre = new Map(actual.categories.map((c) => [normalizeText(c.name), c]))
  const categoriasPorSlug = new Map(actual.categories.map((c) => [c.slug, c]))
  const categoriasNuevas: Category[] = []

  const resolverCategoria = (nombre: string): Category => {
    const clave = normalizeText(nombre)
    const existente = categoriasPorNombre.get(clave)
    if (existente) return existente

    const slug = slugify(nombre) || 'sin-categoria'
    const yaCreada = categoriasNuevas.find((c) => c.slug === slug)
    if (yaCreada) return yaCreada

    const nueva: Category = {
      id: `cat-${slug}-${Date.now().toString(36)}`,
      slug: categoriasPorSlug.has(slug) ? `${slug}-2` : slug,
      name: nombre,
      description: null,
      sortOrder: actual.categories.length + categoriasNuevas.length + 1,
    }
    categoriasNuevas.push(nueva)
    categoriasPorNombre.set(clave, nueva)
    return nueva
  }

  // ── Armar los productos ──
  const porArticulo = new Map<string, FilaLeida[]>()
  for (const l of leidas) {
    const clave = normalizeText(l.articulo)
    const lista = porArticulo.get(clave)
    if (lista) lista.push(l)
    else porArticulo.set(clave, [l])
  }

  const existentesPorNombre = new Map(actual.products.map((p) => [normalizeText(p.name), p]))
  const nuevos: string[] = []
  const actualizados: string[] = []
  const productosResultado: Product[] = []
  let precios = 0

  for (const [clave, grupo] of porArticulo) {
    const primera = grupo[0]
    const previo = existentesPorNombre.get(clave)

    // Sin categoría en la planilla se hereda la que ya tenía; si es nuevo y no
    // trae ninguna, cae en una categoría explícita en vez de quedar huérfano.
    const nombreCategoria =
      primera.categoria ||
      (previo ? (categoriasPorSlug.get(previo.categorySlug)?.name ?? 'Sin categoría') : 'Sin categoría')
    const categoria = resolverCategoria(nombreCategoria)

    // Variantes, en el orden en que aparecen en la planilla.
    const porVariante = new Map<string, FilaLeida[]>()
    for (const l of grupo) {
      const k = l.variante
      const lista = porVariante.get(k)
      if (lista) lista.push(l)
      else porVariante.set(k, [l])
    }

    const base = slugify(primera.articulo) || `articulo-${porArticulo.size}`
    const variants: Variant[] = []
    let n = 0

    for (const [etiqueta, deLaVariante] of porVariante) {
      const formats: SaleFormat[] = deLaVariante.map((l, j): SaleFormat => {
        precios++
        return {
          id: `f-${base}-${n}-${j}`,
          tier: l.mayor ? 'mayor' : 'menor',
          label: l.presentacion,
          unit: l.unidad,
          contentQty: l.contenido,
          priceUyu: l.precio,
          unitPriceUyu: l.precioUnidad,
          available: true,
          minQty: 1,
        }
      })

      // Por menor primero: es el orden que espera el resto del sistema, y el que
      // hace que `referenceFormat()` compare contra el precio suelto.
      formats.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'menor' ? -1 : 1))

      variants.push({
        id: `v-${base}-${n}`,
        label: etiqueta,
        axis: etiqueta === '' ? null : ejeProbable(etiqueta),
        available: true,
        formats,
      })
      n++
    }

    if (previo) {
      actualizados.push(previo.name)
      productosResultado.push({
        ...previo,
        // Lo que la planilla no trae se conserva: fotos, descripción y colores
        // son trabajo que no está en un CSV y que no hay razón para perder.
        name: primera.articulo,
        sku: primera.codigo || previo.sku,
        categorySlug: categoria.slug,
        status: primera.estado,
        variants,
      })
    } else {
      nuevos.push(primera.articulo)
      productosResultado.push({
        id: `p-${base}-${Date.now().toString(36)}-${nuevos.length}`,
        slug: base,
        name: primera.articulo,
        description: null,
        categorySlug: categoria.slug,
        status: primera.estado,
        badge: null,
        sku: primera.codigo || null,
        material: null,
        media: [],
        variants,
        colors: [],
        sortOrder: actual.products.length + nuevos.length,
        createdAt: new Date().toISOString(),
        discountPercent: 0,
        discountActive: false,
        needsReview: [],
      })
    }
  }

  // Los que la planilla no menciona quedan como estaban.
  const tocados = new Set(productosResultado.map((p) => normalizeText(p.name)))
  const intactosLista = actual.products.filter((p) => !tocados.has(normalizeText(p.name)))

  const catalogo: Catalog = {
    ...actual,
    categories: [...actual.categories, ...categoriasNuevas],
    products: [...intactosLista, ...productosResultado].sort((a, b) => a.sortOrder - b.sortOrder),
  }

  return {
    ok: true,
    nuevos,
    actualizados,
    categoriasNuevas: categoriasNuevas.map((c) => c.name),
    intactos: intactosLista.length,
    precios,
    errores: [],
    catalogo,
  }
}

/** Adivina el eje por la pinta de la etiqueta. Sólo afecta cómo se rotula. */
function ejeProbable(etiqueta: string): Variant['axis'] {
  const e = normalizeText(etiqueta)
  if (/\d\s*(mm|cm|m|")/.test(e)) return 'ancho'
  if (/talle|medida|nro|n°/.test(e)) return 'medida'
  return 'color'
}

function vacio(errores: ErrorFila[]): ResumenImportacion {
  return {
    ok: false,
    nuevos: [],
    actualizados: [],
    categoriasNuevas: [],
    intactos: 0,
    precios: 0,
    errores,
  }
}
