import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { feedItems } from '@/lib/catalog/feed'
import { BRAND } from '@/lib/env'

export const revalidate = 3600

/**
 * Catálogo para Meta Commerce Manager.
 *
 * De acá salen tres cosas a la vez: el catálogo de WhatsApp Business, la tienda
 * de Instagram y la de Facebook. Las tres leen del mismo catálogo de Meta, y
 * Meta lo puede alimentar con una URL programada — o sea que se configura una
 * vez y después se mantiene solo.
 *
 * Para Avíos esto es lo que más rinde de todas las integraciones: WhatsApp es
 * donde ya vende. Un catálogo de WhatsApp cargado a mano desde el teléfono, con
 * cientos de artículos, no se hace; y si se hace, queda viejo a la primera
 * lista de precios nueva.
 *
 * Cómo se conecta (no es de programador):
 *   1. Commerce Manager → Catálogos → Agregar catálogo → Comercio electrónico.
 *   2. Agregar artículos → "Fuente de datos" → "Feed programado".
 *   3. Pegar esta URL y elegir actualización diaria.
 *   4. Conectar el catálogo a la cuenta de WhatsApp Business y a Instagram.
 *
 * CSV y no XML porque es el formato que Meta documenta primero y el que se
 * puede abrir en Excel para revisar qué se está mandando antes de conectarlo.
 */

/** Una celda. Se entrecomilla siempre: hay comas en los nombres. */
function celda(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`
}

// El orden de las columnas no importa para Meta, pero sí los nombres exactos.
const COLUMNAS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'item_group_id',
  'google_product_category',
] as const

// La categoría de Google que corresponde a mercería. Meta usa la misma
// taxonomía; sin ella los artículos entran en "sin categoría" y no se muestran
// en las superficies que agrupan por rubro.
const CATEGORIA = 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Sewing'

export async function GET() {
  const catalog = await getCatalog(createClient())
  const products = catalog.products.filter((p) => p.status !== 'draft')
  const items = feedItems(products, catalog.discounts)

  const filas = [
    COLUMNAS.map(celda).join(','),
    ...items.map((i) =>
      [
        celda(i.id),
        // Meta corta el título en 200 caracteres.
        celda(i.title.slice(0, 200)),
        celda(i.description.slice(0, 9999)),
        // Meta acepta "in stock" con espacio; el guion bajo también, pero el
        // espacio es el que documenta y el que no da avisos.
        celda(i.availability === 'in_stock' ? 'in stock' : 'out of stock'),
        celda('new'),
        celda(`${i.priceValue} ${i.currency}`),
        celda(i.link),
        celda(i.imageLink),
        celda(i.brand),
        celda(i.itemGroupId),
        celda(CATEGORIA),
      ].join(',')
    ),
  ]

  // BOM: si alguien lo abre en Excel para revisarlo antes de conectarlo, que no
  // le aparezca "MolderÃ­a".
  const csv = '﻿' + filas.join('\r\n') + '\r\n'

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `inline; filename="catalogo-${BRAND.shortName.toLowerCase()}.csv"`,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
