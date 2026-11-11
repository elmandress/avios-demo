// Verificación del catálogo.
//
// Cada presentación guarda `priceUyu` (lo que se cobra), `contentQty` (lo que
// trae) y `unitPriceUyu` (lo que compara). Los tres vienen del catálogo en papel
// y son redundantes a propósito — pero justamente por eso pueden desincronizarse
// cuando alguien edita uno solo. Esto lo detecta apenas pasa, en el arranque del
// build, en vez de dejar que un precio inconsistente llegue a un mensaje de
// WhatsApp.
//
// Corre solo fuera de producción: en el build de Netlify no queremos tirar el
// sitio abajo por un centésimo, pero sí queremos que falle en desarrollo.

import type { Catalog } from './types'

export interface IntegrityIssue {
  productSlug: string
  formatId: string
  message: string
}

/** Tolerancia de un centésimo: los precios por unidad vienen redondeados. */
const EPSILON = 0.011

export function checkCatalogIntegrity(catalog: Catalog): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const categorySlugs = new Set(catalog.categories.map((c) => c.slug))
  const seenSlugs = new Set<string>()
  const seenFormatIds = new Set<string>()

  for (const product of catalog.products) {
    if (seenSlugs.has(product.slug)) {
      issues.push({ productSlug: product.slug, formatId: '—', message: 'slug duplicado' })
    }
    seenSlugs.add(product.slug)

    if (!categorySlugs.has(product.categorySlug)) {
      issues.push({
        productSlug: product.slug,
        formatId: '—',
        message: `categoría inexistente: ${product.categorySlug}`,
      })
    }

    if (product.variants.length === 0) {
      issues.push({ productSlug: product.slug, formatId: '—', message: 'sin variantes' })
    }

    for (const variant of product.variants) {
      // Un artículo "a consultar" no tiene presentaciones: es lo esperado.
      if (variant.formats.length === 0 && product.priceOnRequest) continue
      if (variant.formats.length === 0) {
        issues.push({
          productSlug: product.slug,
          formatId: variant.id,
          message: 'variante sin presentaciones',
        })
      }

      for (const format of variant.formats) {
        if (seenFormatIds.has(format.id)) {
          issues.push({
            productSlug: product.slug,
            formatId: format.id,
            message: 'id de presentación duplicado (rompe el carrito)',
          })
        }
        seenFormatIds.add(format.id)

        if (format.unitPriceUyu <= 0) {
          issues.push({
            productSlug: product.slug,
            formatId: format.id,
            message: 'precio por unidad en cero o negativo',
          })
        }

        // El caso "medida a confirmar": los dos tienen que ser null juntos.
        if ((format.contentQty === null) !== (format.priceUyu === null)) {
          issues.push({
            productSlug: product.slug,
            formatId: format.id,
            message: 'contentQty y priceUyu tienen que ser null los dos o ninguno',
          })
          continue
        }

        if (format.contentQty === null || format.priceUyu === null) continue

        if (format.contentQty <= 0) {
          issues.push({
            productSlug: product.slug,
            formatId: format.id,
            message: 'contenido de la presentación en cero o negativo',
          })
          continue
        }

        const expected = format.unitPriceUyu * format.contentQty
        // Tolerancia proporcional: en una pieza de 169 m, un redondeo de
        // centésimos en el precio por metro se amplifica 169 veces.
        const tolerance = Math.max(EPSILON, EPSILON * format.contentQty)
        if (Math.abs(expected - format.priceUyu) > tolerance) {
          issues.push({
            productSlug: product.slug,
            formatId: format.id,
            message: `no cierra: ${format.unitPriceUyu} × ${format.contentQty} = ${expected.toFixed(2)}, pero priceUyu = ${format.priceUyu}`,
          })
        }
      }
    }
  }

  return issues
}

/** Lanza en desarrollo, avisa por consola en producción. */
export function assertCatalogIntegrity(catalog: Catalog): void {
  const issues = checkCatalogIntegrity(catalog)
  if (issues.length === 0) return

  const report = issues
    .map((i) => `  · ${i.productSlug} [${i.formatId}] — ${i.message}`)
    .join('\n')
  const message = `Catálogo inconsistente (${issues.length}):\n${report}`

  if (process.env.NODE_ENV === 'production') {
    console.error(message)
    return
  }
  throw new Error(message)
}
