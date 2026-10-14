// Texto listo para publicar en Instagram.
//
// Por qué esto está en el panel y no es un extra: Instagram ES el canal de venta
// de Avíos. La cuenta tiene decenas de miles de seguidores y el sitio no la
// ayudaba en nada — era un lugar más al que había que copiar los precios a mano.
//
// Escribir un post cuesta diez minutos: hay que acordarse del precio por metro,
// buscar cuánto sale la pieza, poner la dirección, el horario y el teléfono, y
// no equivocarse en ninguno. Eso pasa a ser un botón, y —lo que importa— el
// precio sale del MISMO catálogo que la tienda, así que no puede quedar viejo.
//
// El texto se genera para EDITARSE. La idea no es publicar en piloto automático:
// es que Alejandra no tenga que arrancar de la hoja en blanco ni ir a buscar
// números que el sitio ya sabe.

import type { Category, Product, Variant } from '@/lib/catalog/types'
import {
  formatContent,
  formatUnitPrice,
  formatUYU,
  priceFormat,
  referenceFormat,
  resolveDiscountPercent,
  savingsPercent,
} from '@/lib/catalog/pricing'
import type { Discount } from '@/lib/catalog/types'
import { BRAND } from '@/lib/env'

export type FormatoPublicacion = 'feed' | 'historia' | 'google'

/**
 * Por qué existe el formato 'google' y no es un capricho.
 *
 * Para un negocio con local a la calle, la ficha de Google —la que sale en el
 * mapa y en el cuadro de la derecha al buscar "mercería centro Montevideo"— pesa
 * más que el sitio en cuántas personas entran por la puerta. Y de las señales
 * que el dueño puede mover a voluntad, la frecuencia de publicación en esa ficha
 * es de las más fuertes: los perfiles que pasan un mes sin actividad pierden
 * impresiones de forma medible.
 *
 * Publicar dos veces por semana ahí es trabajo mecánico que nadie sostiene si
 * hay que escribirlo de cero cada vez. Por eso está acá.
 *
 * El texto para Google NO es el de Instagram con otro largo:
 *   · sin etiquetas — en Google no hacen nada y ensucian;
 *   · más corto — se lee dentro de un recuadro chico del mapa;
 *   · nombrando el barrio, porque la relevancia local es geográfica;
 *   · terminando en una acción concreta, que es lo que la ficha espera.
 */

/** Los anchos o colores de un producto, en una línea. */
function ejesDe(product: Product): string | null {
  const etiquetas = product.variants.map((v) => v.label).filter(Boolean)
  if (etiquetas.length === 0) return null

  const eje = product.variants.find((v) => v.axis)?.axis
  const titulo =
    eje === 'ancho' ? 'Anchos' : eje === 'color' ? 'Colores' : eje === 'medida' ? 'Medidas' : 'Modelos'

  return `${titulo}: ${etiquetas.join(' · ')}.`
}

/** La línea del precio por menor: la que contesta la pregunta que más se repite. */
function lineaMenor(product: Product, descuento: number): string | null {
  let mejor: { texto: string; valor: number } | null = null

  for (const variant of product.variants) {
    const ref = referenceFormat(variant)
    if (!ref) continue
    const precio = priceFormat(ref, descuento)
    const texto = formatUnitPrice(precio.finalUnitUyu, ref.unit)
    if (!mejor || precio.finalUnitUyu < mejor.valor) {
      mejor = { texto, valor: precio.finalUnitUyu }
    }
  }

  if (!mejor) return null
  const varios = product.variants.length > 1
  return `${varios ? 'Desde ' : ''}${varios ? mejor.texto : mejor.texto.charAt(0).toUpperCase() + mejor.texto.slice(1)}.`
}

/**
 * La línea del precio por mayor, que es la que distingue a Avíos de una tienda
 * que sólo vende suelto. Se omite si no hay presentación cerrada con total
 * publicable: anunciar "por mayor" sin decir cuánto es humo.
 */
function lineaMayor(product: Product, descuento: number): string | null {
  for (const variant of product.variants) {
    for (const format of variant.formats) {
      if (format.tier !== 'mayor') continue
      if (format.contentQty === null || format.priceUyu === null) continue

      const precio = priceFormat(format, descuento)
      if (precio.finalUyu === null) continue

      const ahorro = savingsPercent(format, variant)
      const contenido = formatContent(format.contentQty, format.unit)
      const porUnidad = formatUnitPrice(precio.finalUnitUyu, format.unit)

      return (
        `Por mayor: ${contenido} a ${formatUYU(precio.finalUyu)} — te queda a ${porUnidad}` +
        (ahorro && ahorro > 0 ? `, un ${ahorro}% menos.` : '.')
      )
    }
  }
  return null
}

/**
 * Etiquetas.
 *
 * Salen de la categoría y del nombre del artículo, no de una lista genérica de
 * "engagement". Una etiqueta que no describe lo que se ve en la foto no trae a
 * nadie que después compre.
 */
function etiquetas(product: Product, categoria: Category | undefined): string {
  const base = ['merceria', 'merceriamontevideo', 'montevideo', 'uruguay']
  const delRubro = ['costura', 'manualidades', 'mayorista']

  const desdeCategoria = (categoria?.name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)

  const desdeNombre = product.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)
    .slice(0, 2)

  const todas = [...new Set([...desdeNombre, ...desdeCategoria, ...delRubro, ...base])]
  return todas.map((t) => `#${t}`).join(' ')
}

export interface Publicacion {
  texto: string
  /** Avisos para la persona que va a publicar. No van en el texto. */
  avisos: string[]
}

export function armarPublicacion(
  product: Product,
  categoria: Category | undefined,
  discounts: readonly Discount[],
  formato: FormatoPublicacion
): Publicacion {
  const descuento = resolveDiscountPercent(product, discounts)
  const menor = lineaMenor(product, descuento)
  const mayor = lineaMayor(product, descuento)
  const ejes = ejesDe(product)

  const avisos: string[] = []
  if (product.media.length === 0) {
    avisos.push('Este artículo no tiene foto cargada en el sitio. La publicación necesita una.')
  }
  if (product.status === 'soldout') {
    avisos.push('Está marcado como sin stock. Revisá antes de publicarlo.')
  }
  if (product.status === 'draft') {
    avisos.push('Está en borrador: quien entre desde Instagram no lo va a encontrar en el sitio.')
  }
  if (!mayor) {
    avisos.push('No tiene precio por mayor publicable, así que el texto no lo menciona.')
  }
  if (product.needsReview.length > 0) {
    avisos.push(`Tiene datos a confirmar: ${product.needsReview.join(', ')}.`)
  }

  if (formato === 'google') {
    // Google recorta la vista previa alrededor de los 250 caracteres y el resto
    // queda detrás de "Más información", así que lo que decide va primero.
    const texto = [
      `${product.name} en Mercería Avíos, ${BRAND.street}.`,
      '',
      menor,
      mayor,
      ejes,
      '',
      'Vení al local o escribinos por WhatsApp y te lo separamos.',
    ]
      .filter((l) => l !== null && l !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (texto.length > 1500) {
      avisos.push('El texto pasa los 1.500 caracteres que admite Google. Recortalo antes de pegar.')
    }
    avisos.push(
      'En Google conviene publicar dos veces por semana: la ficha que se queda quieta un mes pierde visibilidad en el mapa.'
    )

    return { texto, avisos }
  }

  // La historia es otra cosa: se lee en tres segundos, de pie, y no admite
  // párrafos. Sólo el artículo, el precio y dónde queda.
  if (formato === 'historia') {
    const texto = [
      product.name.toUpperCase(),
      '',
      menor,
      mayor,
      '',
      `${BRAND.street}`,
      `WhatsApp ${BRAND.phoneDisplay}`,
    ]
      .filter((l) => l !== null)
      .join('\n')

    return { texto, avisos }
  }

  const descuentoTexto =
    descuento > 0 ? `\n${descuento}% de descuento sobre estos precios.` : ''

  const texto = [
    product.name,
    '',
    menor,
    mayor,
    descuentoTexto.trim() || null,
    '',
    ejes,
    product.description,
    '',
    `Estamos en ${BRAND.street}, Montevideo.`,
    BRAND.hoursDisplay.join('. ') + '.',
    `Consultas y pedidos por WhatsApp al ${BRAND.phoneDisplay}.`,
    '',
    // El link va en la bio: Instagram no hace clickeable un link del pie de
    // foto, y mandar a la gente a copiar una URL a mano es perderla. Para eso
    // existe /ig, que es la página que va en el enlace del perfil.
    'Toda la lista de precios está en el link de la bio.',
    '',
    etiquetas(product, categoria),
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n')
    // Nunca más de una línea en blanco seguida: el editor de Instagram las
    // conserva y el texto queda desarmado.
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { texto, avisos }
}

/** Variante puntual: el texto para UNA variante concreta, no para el producto. */
export function armarPublicacionDeVariante(
  product: Product,
  variant: Variant,
  categoria: Category | undefined,
  discounts: readonly Discount[]
): Publicacion {
  const acotado: Product = { ...product, variants: [variant] }
  const base = armarPublicacion(acotado, categoria, discounts, 'feed')
  return {
    ...base,
    texto: base.texto.replace(product.name, `${product.name} · ${variant.label}`),
  }
}
