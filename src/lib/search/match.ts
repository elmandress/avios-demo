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
// vende (está en su catálogo PDF). No se mapea "cierre" ni "cremallera" a nada,
// aunque sea la búsqueda más obvia de una mercería, porque el catálogo no trae
// cierres ni botones. Falsear ese match hace
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
  // Cintas
  saten: ['raso'],
  satin: ['raso'],
  lazo: ['raso', 'cinta'],
  lazos: ['raso', 'cinta'],
  regalo: ['raso', 'cinta'],
  grosgrain: ['gross'],
  grossgrain: ['gross'],
  petersham: ['gross'],
  acanalada: ['gross'],
  gaucha: ['pampa'],
  criolla: ['pampa'],
  guarda: ['pampa', 'marroqui'],
  jacquard: ['marroqui'],
  bandera: ['patria', 'bandera'],
  reflectivo: ['reflectiva'],
  reflectante: ['reflectiva'],
  visibilidad: ['reflectiva'],
  chaleco: ['reflectiva'],
  correa: ['mochila', 'bolso', 'correa'],
  asa: ['mochila', 'bolso'],
  asas: ['mochila', 'bolso'],

  // Galones, flecos, puntillas
  pasamaneria: ['galon', 'fleco', 'borla'],
  encaje: ['puntilla'],
  encajes: ['puntilla'],
  guipur: ['puntilla'],
  broderie: ['puntilla'],
  volado: ['puntilla', 'volado'],
  madrono: ['pompon'],
  madronos: ['pompon'],
  flecos: ['fleco'],
  carnaval: ['fleco', 'lentejuela', 'pluma', 'boa'],
  murga: ['fleco', 'lentejuela', 'pluma', 'boa'],

  // Elásticos y sesgos
  goma: ['elastico'],
  gomita: ['elastico'],
  elastica: ['elastico'],
  bies: ['sesgo'],
  ribete: ['sesgo', 'vivo'],

  // Hilos y cordones
  macrame: ['macrame', 'encerado', 'chino'],
  bijou: ['encerado', 'chino', 'tanza', 'mostacilla'],
  bijouterie: ['encerado', 'chino', 'tanza', 'mostacilla'],
  abalorio: ['mostacilla', 'perla', 'cristal'],
  abalorios: ['mostacilla', 'perla', 'cristal'],
  mouline: ['moulinex'],
  piolin: ['cordon', 'sisal'],
  piola: ['cordon', 'sisal'],
  soga: ['cordon'],
  cuerda: ['cordon'],
  pasadores: ['cordon', 'calzado', 'pasador'],
  agujeta: ['cordon', 'calzado'],
  agujetas: ['cordon', 'calzado'],
  zapato: ['calzado'],
  zapatos: ['calzado'],
  zapatilla: ['calzado'],
  zapatillas: ['calzado'],
  championes: ['calzado'],
  rata: ['raton'],

  // Broches, herrajes, velcro
  abrojo: ['velcro'],
  abrojos: ['velcro'],
  argolla: ['aro'],
  argollas: ['aro'],
  imperdible: ['alfiler gancho', 'alfiler de gancho'],
  imperdibles: ['alfiler gancho', 'alfiler de gancho'],
  snap: ['presion'],
  remache: ['tacha'],
  remaches: ['tacha'],
  llavero: ['llavero', 'mosqueton'],

  // Lencería
  corpino: ['soutien', 'copas', 'bretel'],
  sosten: ['soutien', 'copas', 'bretel'],
  brasier: ['soutien', 'copas', 'bretel'],
  tape: ['bob tape'],
  boobtape: ['bob tape'],
  boob: ['bob tape'],
  escote: ['bob tape', 'bretel'],
  busto: ['bob tape', 'copas'],

  // Agujas, tijeras, herramientas
  ganchillo: ['crochet'],
  tricot: ['tejer'],
  palillo: ['tejer', 'palillo'],
  descosedor: ['abre ojal'],
  clip: ['pinza'],
  clips: ['pinza'],
  acerico: ['alfiletero'],
  metrica: ['centimetro'],
  cinta_metrica: ['centimetro'],
  molderia: ['reglas'],
  molde: ['reglas'],
  moldes: ['reglas'],
  patronaje: ['reglas'],
  escuadra: ['reglas'],
  cutter: ['cortador'],
  canilla: ['bobina'],
  canillas: ['bobina'],
  prensatela: ['pie de maquina', 'pie para'],
  prensatelas: ['pie de maquina', 'pies para'],

  // Telas
  tull: ['tul'],
  ilusion: ['tul'],
  friselina: ['tnt', 'entretela'],
  pellon: ['entretela'],
  pano: ['fieltro'],
  panolenci: ['fieltro'],

  // Brillos
  brillos: ['strass', 'cristal', 'lentejuela'],
  piedras: ['strass', 'cristal', 'piedras'],
  canutillos: ['canutillo', 'mostacilla'],
  chaquira: ['mostacilla'],
  chaquiras: ['mostacilla'],
  parche: ['rodillera', 'aplique', 'escudo'],
  parches: ['rodillera', 'aplique', 'escudo'],
  termoadhesivo: ['strass', 'rodillera', 'plancha'],

  // Manualidades
  pegamento: ['silicona'],
  cola: ['silicona', 'colita'],
  icopor: ['telgopor'],
  espumaplast: ['telgopor'],
  limpiapipas: ['chenil'],
  ojos: ['ojitos'],
  purpurina: ['brillantina'],
  glitter: ['glitter', 'brillantina'],
  tinte: ['anilina'],
  tintura: ['anilina'],

  // Cabello y vestimenta
  vincha: ['tiara'],
  vinchas: ['tiara'],
  diadema: ['tiara'],
  peineta: ['tocado'],
  humita: ['moño'],
  corbatin: ['moño'],
  suspensores: ['tirador'],
  odalisca: ['arabe', 'caderin'],
  novia: ['novia', 'tocado', 'perla'],
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
  const texto = normalizeText(
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
  // Sin palabras repetidas. La coincidencia es palabra por palabra (ver
  // `coincide`), así que repetir no cambia ningún resultado; y una cinta con
  // siete anchos repetía siete veces "por metro pieza cerrada · 50 m". Con
  // miles de artículos, esa repetición era un tercio del índice que baja el
  // navegador.
  return [...new Set(texto.split(' ').filter(Boolean))].join(' ')
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
    // El plural también busca el singular: "plantillas" tiene que encontrar
    // "Plantilla multitalles" y "flores", "Flor N 4". La coincidencia es por
    // subcadena, así que el singular cubre los dos; al revés no.
    const singulares: string[] = []
    if (p.length > 4 && p.endsWith('es')) singulares.push(p.slice(0, -2))
    if (p.length > 3 && p.endsWith('s')) singulares.push(p.slice(0, -1))
    const extras = [p, ...singulares].flatMap((forma) => INDICE.get(forma) ?? [])
    // La palabra tal cual siempre entra: el diccionario suma, nunca reemplaza.
    return [...new Set([p, ...singulares, ...extras])]
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
  return puntuarCampos(camposDeBusqueda(product, categoria), consulta)
}

/**
 * Los textos de un producto que usa la búsqueda, ya normalizados.
 *
 * Existen para que la búsqueda funcione igual sobre el índice liviano que baja
 * el navegador (`lib/catalog/tarjeta.ts`) que sobre el producto completo: el
 * índice guarda estos cuatro campos y no las variantes con sus precios. Si cada
 * lado armara su propio texto, volvería el bug de "la sugerencia lo muestra y la
 * grilla dice que no hay nada".
 */
export interface CamposBusqueda {
  /** Nombre del producto. */
  nombre: string
  /** Etiquetas de las variantes ("4 mm (Nro 0)", "Negro"…). */
  variantes: string
  /** Principio de la descripción: sólo ordena, nunca filtra (ver arriba). */
  descripcion: string
  /** `textoDeProducto`: contra esto se filtra. */
  todo: string
}

/**
 * Cuánto de la descripción entra al índice. Sólo sirve para ordenar
 * sugerencias, y con miles de artículos la descripción entera sería la mitad
 * del peso del índice.
 */
const LARGO_DESCRIPCION = 100

export function camposDeBusqueda(product: Product, categoria?: string): CamposBusqueda {
  return {
    nombre: normalizeText(product.name),
    variantes: normalizeText(product.variants.map((v) => v.label).join(' ')),
    descripcion: normalizeText(product.description ?? '').slice(0, LARGO_DESCRIPCION),
    todo: textoDeProducto(product, categoria),
  }
}

/** `puntuar` sobre campos ya calculados. */
export function puntuarCampos(campos: CamposBusqueda, consulta: string): number {
  const q = normalizeText(consulta)
  if (q.length < 2) return -1

  const { nombre: name, variantes, descripcion: desc } = campos

  if (name.startsWith(q)) return 0
  if (name.includes(q)) return 1 + name.indexOf(q) / 100
  if (variantes.includes(q)) return 50
  if (desc.includes(q)) return 100 + desc.indexOf(q) / 100

  // No coincide literal: se prueba palabra por palabra, con sinónimos.
  const tokens = expandirConsulta(consulta)
  if (tokens.length > 0 && coincide(campos.todo, tokens)) return 200

  return -1
}
