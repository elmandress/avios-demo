// Respaldo del catálogo: bajarlo, y volver a subirlo.
//
// Por qué existe, y por qué no es un detalle técnico: quien contrata un sitio
// carga ahí adentro el trabajo de años —cada precio, cada medida, cada
// descripción— y la pregunta que nadie hace en voz alta pero todos se hacen es
// "¿y si un día me quiero ir?". La respuesta honesta tiene que ser un botón,
// no una promesa.
//
// Dos formatos, porque son para dos cosas distintas:
//
//   · CSV — se abre en Excel o en Google Sheets. Es el catálogo en una planilla,
//     una fila por precio. Sirve para revisarlo con alguien, para mandárselo al
//     contador, o para tenerlo aunque el sitio no exista más.
//   · JSON — es el respaldo de verdad: se vuelve a cargar acá mismo y el
//     catálogo queda exactamente como estaba. El CSV no puede hacer eso, porque
//     una planilla no guarda la estructura de variantes y presentaciones.

import type { Catalog } from '@/lib/catalog/types'

// ─── CSV ─────────────────────────────────────────────────────────────────────

/**
 * Una celda de CSV.
 *
 * Se entrecomilla siempre: los nombres traen comas ("Tul con glitter · 15 cm"),
 * las descripciones traen comillas, y Excel en español interpreta el punto y
 * coma como separador. Entrecomillar todo evita adivinar.
 */
function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""'
  return `"${String(valor).replace(/"/g, '""')}"`
}

const COLUMNAS = [
  'Categoría',
  'Artículo',
  'Código',
  'Variante',
  'Presentación',
  'Unidad',
  'Contenido',
  'Precio',
  'Precio por unidad',
  'Por mayor',
  'Estado',
  'A confirmar',
] as const

export function catalogoACSV(catalog: Catalog): string {
  const nombreCategoria = new Map(catalog.categories.map((c) => [c.slug, c.name]))
  const filas: string[] = [COLUMNAS.map(celda).join(',')]

  for (const product of [...catalog.products].sort((a, b) => a.sortOrder - b.sortOrder)) {
    for (const variant of product.variants) {
      for (const format of variant.formats) {
        filas.push(
          [
            celda(nombreCategoria.get(product.categorySlug) ?? product.categorySlug),
            celda(product.name),
            celda(product.sku),
            celda(variant.label),
            celda(format.label),
            celda(format.unit),
            celda(format.contentQty),
            celda(format.priceUyu),
            celda(format.unitPriceUyu),
            celda(format.tier === 'mayor' ? 'sí' : 'no'),
            celda(
              product.status === 'active'
                ? 'publicado'
                : product.status === 'soldout'
                  ? 'sin stock'
                  : 'borrador'
            ),
            celda(product.needsReview.join(' · ')),
          ].join(',')
        )
      }
    }
  }

  // BOM al principio: sin esto Excel en Windows abre el archivo en la
  // codificación del sistema y "Moldería" aparece como "MolderÃ­a".
  return '﻿' + filas.join('\r\n') + '\r\n'
}

// ─── Descarga ────────────────────────────────────────────────────────────────

/** Nombre con fecha: dos respaldos del mismo día no se pisan por accidente. */
export function nombreDeArchivo(extension: string): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `avios-catalogo-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.${extension}`
}

export function descargar(contenido: string, nombre: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Liberar en el siguiente tick: revocar en el mismo cancela la descarga en
  // algunos navegadores antes de que llegue a empezar.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ─── Restaurar ───────────────────────────────────────────────────────────────

export interface ResultadoImportacion {
  ok: boolean
  mensaje: string
  catalogo?: Catalog
}

/**
 * Valida un archivo antes de dejarlo entrar.
 *
 * Deliberadamente estricto: un catálogo a medias es peor que ninguno, porque el
 * sitio queda mostrando precios que no existen. Ante la duda, se rechaza y se
 * dice por qué — nunca se "arregla" un archivo roto por las nuestras.
 */
export function leerRespaldo(texto: string): ResultadoImportacion {
  let dato: unknown
  try {
    dato = JSON.parse(texto)
  } catch {
    return { ok: false, mensaje: 'El archivo no es un respaldo válido: no se pudo leer.' }
  }

  if (typeof dato !== 'object' || dato === null) {
    return { ok: false, mensaje: 'El archivo no tiene la forma de un catálogo.' }
  }

  const c = dato as Partial<Catalog>

  if (!Array.isArray(c.products) || !Array.isArray(c.categories)) {
    return {
      ok: false,
      mensaje: 'El archivo no tiene productos ni categorías. ¿Será un respaldo de otra cosa?',
    }
  }

  if (c.products.length === 0) {
    return { ok: false, mensaje: 'El respaldo está vacío: no tiene ningún artículo.' }
  }

  // Comprobación mínima de forma sobre el primer producto: si esto no cierra,
  // el archivo es de otra versión del formato y cargarlo rompe la tienda.
  const p = c.products[0]
  if (!p || typeof p.id !== 'string' || !Array.isArray(p.variants)) {
    return {
      ok: false,
      mensaje: 'El formato del respaldo no coincide con el que usa el sitio hoy.',
    }
  }

  const catalogo: Catalog = {
    generatedAt: typeof c.generatedAt === 'string' ? c.generatedAt : new Date().toISOString(),
    categories: c.categories,
    products: c.products,
    colors: Array.isArray(c.colors) ? c.colors : [],
    discounts: Array.isArray(c.discounts) ? c.discounts : [],
    settings: typeof c.settings === 'object' && c.settings !== null ? c.settings : {},
  }

  const presentaciones = catalogo.products.reduce(
    (n, prod) => n + prod.variants.reduce((m, v) => m + v.formats.length, 0),
    0
  )

  return {
    ok: true,
    mensaje: `Respaldo válido: ${catalogo.products.length} artículos y ${presentaciones} precios.`,
    catalogo,
  }
}
