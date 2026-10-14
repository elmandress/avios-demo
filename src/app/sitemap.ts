import type { MetadataRoute } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { SITE_URL } from '@/lib/env'

export const revalidate = 3600

/**
 * Sitemap.
 *
 * Las prioridades no son decorativas: le dicen a Google cuál de estas URLs
 * queremos que traiga tráfico. En una mercería con local, el catálogo y las
 * categorías van primero; /mayorista va alto porque es la página que capta al
 * cliente que más factura. /carrito y /mi-lista quedan afuera: son estado del
 * visitante, no contenido.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog(createClient())
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/tienda`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/mayorista`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    // "lista de precios mercería montevideo" es una búsqueda que la gente hace
    // tal cual, y la página la contesta entera. Cambia seguido: son precios.
    { url: `${SITE_URL}/lista-de-precios`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/nosotros`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/info`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/terminos`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const categories: MetadataRoute.Sitemap = catalog.categories.map((c) => ({
    url: `${SITE_URL}/tienda/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const products: MetadataRoute.Sitemap = catalog.products
    .filter((p) => p.status !== 'draft')
    .map((p) => ({
      url: `${SITE_URL}/tienda/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  return [...staticPages, ...categories, ...products]
}
