// Escala: lo que cambia cuando el catálogo pasa de 20 artículos a miles.

import type { Catalog, Product } from './types'

/**
 * Cuántas fichas se pre-generan en el build. El resto se arma la primera vez
 * que alguien (o Google) la pide, y desde ahí queda guardada como cualquier
 * otra.
 *
 * Con miles de artículos, generar todas en cada deploy alarga el build sin
 * ganar nada: la mayoría de las fichas casi no se visitan, y las que sí, se
 * generan solas en la primera visita. Las primeras en el orden de la tienda son
 * las que Alejandra eligió poner adelante.
 */
export const FICHAS_PRE_GENERADAS = 200

/**
 * PRUEBA DE ESCALA — nunca en producción.
 *
 * Con `AVIOS_ESCALA=3000 npm run build` el sitio se arma con 3.000 artículos:
 * los 20 reales repetidos, con nombre y slug distintos. Sirve para medir el
 * peso de las páginas y el tiempo del build con un catálogo del tamaño real,
 * sin tener el catálogo real.
 *
 * Es una variable de servidor (sin NEXT_PUBLIC_) y sólo actúa en modo demo: no
 * hay forma de que un catálogo inflado llegue a un visitante de Avíos.
 */
export function escalar(catalog: Catalog, cantidad: number): Catalog {
  const reales = catalog.products
  if (!Number.isFinite(cantidad) || cantidad <= reales.length) return catalog

  const products: Product[] = [...reales]
  for (let vuelta = 1; products.length < cantidad; vuelta++) {
    for (const p of reales) {
      if (products.length >= cantidad) break
      products.push({
        ...p,
        id: `${p.id}-x${vuelta}`,
        slug: `${p.slug}-x${vuelta}`,
        name: `${p.name} (copia ${vuelta})`,
        sku: p.sku ? `${p.sku}-${vuelta}` : null,
        sortOrder: p.sortOrder + vuelta * 1000,
      })
    }
  }
  return { ...catalog, products }
}
