// Utilidades de imágenes y texto compartidas por cliente y servidor.

/** Slug URL-safe a partir de texto en español (saca tildes y eñes). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Normalización de texto para búsqueda: saca tildes y pasa a minúsculas, así
 * "cordon" encuentra "Cordón". Vive acá, en un solo lugar, porque la usan DOS
 * cosas que TIENEN que coincidir: el buscador del header y el filtrado de la
 * grilla de /tienda. Cuando sólo uno de los dos normalizaba, la sugerencia
 * mostraba el producto y al apretar Enter la grilla contestaba "sin resultados".
 *
 * El rango de marcas combinantes va en escapes explícitos (U+0300-U+036F) y no
 * como caracteres literales, para que no lo corrompa un guardado con otra
 * codificación.
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Placeholder difuso para `placeholder="blur"` de next/image. Un color plano
 * mantiene la data URL chica (importa para el LCP) y evita el salto duro de
 * vacío a imagen. Es el tono `paper50` del sistema de diseño.
 */
const BLUR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#FBFAF7"/></svg>'

export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  (typeof btoa !== 'undefined' ? btoa(BLUR_SVG) : Buffer.from(BLUR_SVG).toString('base64'))

/**
 * URL absoluta de una imagen para consumo de BOTS (JSON-LD, sitemap, tarjeta
 * OG). Las remotas se sirven por el optimizador del sitio, cacheado por el CDN:
 * Googlebot-Image y los crawlers de WhatsApp/Meta bajan ~100 KB en vez del
 * original. `w` debe existir en `images.deviceSizes` y `q` en `images.qualities`
 * (next.config.ts) o Next responde 400.
 */
export function botImageUrl(siteUrl: string, rawUrl: string, w: 640 | 1200 = 1200, q: 82 | 90 = 82): string {
  if (!rawUrl.startsWith('http')) return `${siteUrl}${rawUrl}`
  return `${siteUrl}/_next/image?url=${encodeURIComponent(rawUrl)}&w=${w}&q=${q}`
}

/**
 * Reduce y re-encoda una imagen en el navegador y la devuelve como data URL.
 *
 * En la demo las fotos se guardan dentro del catálogo en localStorage, que tiene
 * unos 5 MB en total: una foto de celular cruda (2–8 MB) llena la cuota con una
 * sola. Bajarla a 900 px y JPEG 0.72 la deja en ~60 KB, que además es de sobra
 * para el tamaño al que se muestra.
 *
 * Cuando exista el storage de Supabase esto sigue sirviendo igual: subir el
 * original de 8 MB es tirar ancho de banda de la dueña y del visitante.
 */
export async function compressImageToDataUrl(file: File, maxEdge = 900): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('El navegador no pudo procesar la imagen.')
  }
  // Fondo blanco: al pasar un PNG con transparencia a JPEG, lo transparente
  // quedaría negro.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', 0.72)
}
