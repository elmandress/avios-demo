import { getCatalog } from '@/lib/catalog'
import { tarjetasDe, type Indice } from '@/lib/catalog/tarjeta'

export const revalidate = 3600

/**
 * El índice del catálogo: una tarjeta liviana por artículo.
 *
 * Es lo que usan el buscador del header, los filtros de /tienda, "ver más" y
 * /mi-lista. Antes todo eso trabajaba sobre el catálogo COMPLETO, que viajaba
 * dentro de cada página. Ahora viaja una sola vez, cuando hace falta (al abrir
 * el buscador o entrar al catálogo), y queda en la caché del navegador y del
 * CDN: es un archivo estático que se regenera cuando cambia el catálogo.
 *
 * Peso: unos 300 bytes por artículo antes de comprimir. Con 3.000 artículos,
 * del orden de 100–200 KB comprimido, contra varios MB por página del esquema
 * anterior.
 */
export async function GET() {
  const catalog = await getCatalog()
  const cuerpo: Indice = { generatedAt: catalog.generatedAt, tarjetas: tarjetasDe(catalog) }
  return Response.json(cuerpo, {
    headers: {
      // El navegador lo reusa cinco minutos sin preguntar; el CDN lo guarda
      // hasta que el catálogo cambie (revalidate + invalidación por etiqueta).
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
