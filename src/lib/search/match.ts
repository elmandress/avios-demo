// Búsqueda del catálogo: vocabulario del rubro y coincidencia por palabras.
//
// Dos problemas que tenía la búsqueda anterior, los dos costaban ventas:
//
// 1. Exigía que la consulta apareciera ENTERA y PEGADA. Escribir "cinta gross
//    15" no encontraba nada, porque en el texto del producto esas tres palabras
//    no están seguidas en ese orden. En una mercería la gente busca así: el
//    artículo y la medida en una sola línea.
//
// 2. No conocía cómo se llama esto en la calle. En Uruguay al cordón fino se le
//    dice piolín, al moño de etiqueta humita, a la cinta gross grosgrain, y las
//    clientas que vienen de tutoriales escriben satén por raso. Todas esas
//    búsquedas terminaban en "no encontramos nada" sobre mercadería que está
//    en el mostrador.
//
// ⚠️ REGLA DEL DICCIONARIO: cada sinónimo apunta a algo que Avíos EFECTIVAMENTE
// vende. No se mapea "cierre" ni "cremallera" a nada, aunque sea la búsqueda
// más obvia de una mercería, porque acá no hay cierres. Falsear ese match hace
// que la clienta cruce la ciudad para nada — y además tapa el dato: hoy esa
// búsqueda queda registrada en /panel para que Alejandra decida si la trae.
//
// Vive en un solo lugar porque lo usan DOS cosas que tienen que coincidir: el
// buscador del header y el filtrado de la grilla. Cuando eran dos códigos
// distintos, la sugerencia mostraba el producto y al apretar Enter la grilla
// contestaba "sin resultados".

import { normalizeText } from '@/lib/media'
import type { Product } from '@/lib/catalog/types'

/**
 * Cómo le dice la gente → palabras que sí están en el catálogo.
 *
 * Las claves van normalizadas (sin tildes, en minúscula), porque contra eso se
 * compara. Los valores no hace falta: se normalizan al construir el índice.
 */
const SINONIMOS: Record<string, string[]> = {
  // Cinta de raso doble faz
  saten: ['raso'],
  satin: ['raso'],
  seda: ['raso'],
  lazo: ['raso', 'cinta'],
  lazos: ['raso', 'cinta'],
  mono: ['raso', 'cinta', 'moño'],
  monos: ['raso', 'cinta', 'moño'],
  monito: ['raso', 'cinta', 'moño'],
  regalo: ['raso', 'cinta'],
  souvenir: ['raso', 'cinta'],
  souvenirs: ['raso', 'cinta'],

  // Cinta gross
  grosgrain: ['gross'],
  grossgrain: ['gross'],
  petersham: ['gross'],
  acanalada: ['gross'],

  // Hilo encerado / hilo chino
  encerado: ['encerado'],
  macrame: ['encerado', 'chino'],
  pulsera: ['encerado', 'chino', 'alfiletero'],
  pulseras: ['encerado', 'chino'],
  bijou: ['encerado', 'chino'],
  bijouterie: ['encerado', 'chino'],
  abalorio: ['encerado', 'chino'],
  abalorios: ['encerado', 'chino'],

  // Cordones
  piolin: ['cordon'],
  piola: ['cordon'],
  pasador: ['cordon', 'calzado'],
  pasadores: ['cordon', 'calzado'],
  agujeta: ['cordon', 'calzado'],
  agujetas: ['cordon', 'calzado'],
  zapato: ['calzado'],
  zapatos: ['calzado'],
  zapatilla: ['calzado'],
  zapatillas: ['calzado'],
  championes: ['calzado'],
  lurex: ['lurex'],

  // Herramientas
  clip: ['pinza'],
  clips: ['pinza'],
  prendedor: ['pinza'],
  acerico: ['alfiletero'],
  imantado: ['alfiletero'],
  regla: ['reglas', 'molderia'],
  reglas: ['reglas', 'molderia'],
  molde: ['molderia', 'reglas'],
  moldes: ['molderia', 'reglas'],
  patronaje: ['molderia', 'reglas'],
  escuadra: ['reglas', 'molderia'],
  curva: ['reglas', 'molderia'],

  // Telas y tul
  tull: ['tul'],
  glitter: ['glitter', 'tul'],
  brillo: ['glitter'],
  ilusion: ['tul'],

  // Seguridad
  reflectivo: ['reflectiva'],
  reflectante: ['reflectiva'],
  reflectiva: ['reflectiva'],
  fluo: ['reflectiva'],
  fluor: ['reflectiva'],
  visibilidad: ['reflectiva'],
  seguridad: ['reflectiva'],
  chaleco: ['reflectiva'],

  // Accesorios de vestimenta
  humita: ['moño', 'formal'],
  corbatin: ['moño', 'formal'],
  corbata: ['moño', 'formal'],
  tirador: ['tirador'],
  tiradores: ['tirador'],
  suspensores: ['tirador'],
  bretel: ['tirador'],
  breteles: ['tirador'],
  tape: ['adhesivo', 'boob'],
  boobtape: ['adhesivo', 'boob'],
  escote: ['adhesivo', 'boob'],
  corpino: ['adhesivo', 'boob'],
  plantilla: ['plantilla'],
  plantillas: ['plantilla'],
}

/** El diccionario ya normalizado, construido una sola vez. */
const INDICE: Map<string, string[]> = new Map(
  Object.entries(SINONIMOS).map(([clave, valores]) => [
    normalizeText(clave),
    valores.map(normalizeText),
  ])
)

/**
 * El texto contra el que se FILTRA un producto en la grilla.
 *
 * Incluye la categoría a propósito: quien escribe "cintas" está buscando la
 * categoría, y quien escribe "herramientas" también. Sin esto, esas dos
 * búsquedas —de las más frecuentes— no devolvían nada.
 *
 * NO incluye la descripción, y es deliberado. La descripción es prosa: el moño
 * formal dice "con cierre regulable", así que buscar "cierre" —que en una
 * mercería significa cremallera, algo que Avíos no vende— devolvía un moño.
 * Un resultado equivocado es peor que ninguno: tapa el aviso de "preguntá por
 * WhatsApp" y además impide que la búsqueda quede registrada en /panel, que es
 * como Alejandra se entera de qué le están pidiendo y no tiene.
 *
 * La descripción sigue contando para ORDENAR las sugerencias del header
 * (ver `puntuar`), donde una coincidencia débil queda última en vez de
 * aparecer como si fuera igual de buena que las otras.
 */
export function textoDeProducto(product: Product, categoria?: string): string {
  return normalizeText(
    [
      product.name,
      product.sku ?? '',
      product.material ?? '',
      categoria ?? '',
      // Las variantes entran a la búsqueda: quien escribe "15 mm" o "lurex"
      // está buscando una variante concreta, no el nombre del producto.
      ...product.variants.map((v) => v.label),
      // Las presentaciones también: "cono", "rollito", "pieza" son la forma en
      // que se pide el hilo en el mostrador, y son dato del catálogo, no prosa.
      ...product.variants.flatMap((v) => v.formats.map((f) => f.label)),
      ...product.colors.map((c) => c.name),
    ].join(' ')
  )
}

/**
 * Conectores que se descartan de la consulta.
 *
 * Si "de" contara como palabra obligatoria, buscar "tul de 15 cm" no encontraría
 * "Tul liso · 15 cm", que es exactamente lo que la persona quiere. Son palabras
 * que no distinguen un artículo de otro.
 */
const CONECTORES = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'y', 'o', 'en', 'para', 'con', 'por', 'al', 'que',
])

/**
 * El texto de UNA fila concreta: producto + esta variante + esta presentación.
 *
 * Es distinto de `textoDeProducto` y la diferencia importa. Aquella junta TODAS
 * las variantes, que es lo correcto para la grilla: buscar "4 mm" tiene que
 * traer la cinta de raso, y después el visitante elige el ancho en la ficha.
 *
 * En el mostrador la pregunta es otra. Cuando alguien pregunta "¿tenés de 4 mm?"
 * la respuesta útil son las dos filas de 4 mm, no las catorce filas del producto
 * que casualmente tiene un ancho de 4 mm entre siete. Con el texto del producto
 * entero, buscar "gross 15" devolvía diez filas y la primera era la de 7 mm.
 */
export function textoDeFila(
  product: Product,
  varianteLabel: string,
  formatoLabel: string,
  categoria?: string
): string {
  return normalizeText(
    [
      product.name,
      product.sku ?? '',
      product.material ?? '',
      categoria ?? '',
      varianteLabel,
      formatoLabel,
    ].join(' ')
  )
}

/**
 * Parte la consulta en palabras y le agrega a cada una sus sinónimos.
 *
 * Devuelve una lista de alternativas por palabra: para coincidir hay que
 * cumplir TODAS las palabras (Y), y cada palabra se cumple con CUALQUIERA de
 * sus alternativas (O). Así "cinta gross 15" pide cinta Y gross Y 15, sin
 * importar en qué orden aparezcan.
 */
export function expandirConsulta(consulta: string): string[][] {
  const palabras = normalizeText(consulta)
    .split(/\s+/)
    .filter((p) => p.length > 0 && !CONECTORES.has(p))

  return palabras.map((p) => {
    const extras = INDICE.get(p) ?? []
    // La palabra tal cual siempre entra: el diccionario suma, nunca reemplaza.
    return [p, ...extras]
  })
}

/**
 * ¿El texto cumple todas las palabras de la consulta?
 *
 * Los números se comparan como palabra entera y no como subcadena. Sin eso,
 * buscar "4 mm" devolvía también la cinta de "40 mm", porque "4" está adentro
 * de "40" — y en una mercería donde los anchos son 4, 7, 10, 15, 22 y 40, eso
 * convierte cada búsqueda por medida en una lista con las medidas equivocadas.
 *
 * Con las palabras no se hace lo mismo a propósito: "cordon" tiene que seguir
 * encontrando "cordones", y "raso" tiene que encontrar "rasos".
 */
export function coincide(texto: string, tokens: string[][]): boolean {
  return tokens.every((alternativas) => alternativas.some((a) => contiene(texto, a)))
}

const SOLO_NUMERO = /^\d+$/

function contiene(texto: string, termino: string): boolean {
  if (!SOLO_NUMERO.test(termino)) return texto.includes(termino)
  // \b no sirve acá: en "4mm" el borde entre 4 y m no es un borde de palabra
  // para la expresión regular, y "4mm" escrito sin espacio es de lo más común.
  return new RegExp(`(?<!\\d)${termino}(?!\\d)`).test(texto)
}

/**
 * Puntaje para ordenar sugerencias. Menor es mejor; -1 significa que no entra.
 *
 * El nombre pesa más que la variante y la variante más que la descripción, y
 * dentro de cada nivel gana la coincidencia más temprana. Una coincidencia que
 * llegó por sinónimo baja al fondo: es correcta, pero menos literal que la que
 * el visitante escribió tal cual.
 */
export function puntuar(product: Product, consulta: string, categoria?: string): number {
  const q = normalizeText(consulta)
  if (q.length < 2) return -1

  const name = normalizeText(product.name)
  const variantes = normalizeText(product.variants.map((v) => v.label).join(' '))
  const desc = normalizeText(product.description ?? '')

  if (name.startsWith(q)) return 0
  if (name.includes(q)) return 1 + name.indexOf(q) / 100
  if (variantes.includes(q)) return 50
  if (desc.includes(q)) return 100 + desc.indexOf(q) / 100

  // No coincide literal: se prueba palabra por palabra, con sinónimos.
  const tokens = expandirConsulta(consulta)
  if (tokens.length > 0 && coincide(textoDeProducto(product, categoria), tokens)) return 200

  return -1
}
