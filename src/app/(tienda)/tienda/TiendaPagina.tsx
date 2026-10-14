import { Suspense } from 'react'
import type { Category } from '@/lib/catalog/types'
import { TANDA, type TarjetaProducto } from '@/lib/catalog/tarjeta'
import { TiendaClient, TiendaVista } from './TiendaClient'

/**
 * Una página de catálogo (/tienda o una categoría), pintada desde el servidor.
 *
 * TiendaClient lee la búsqueda de la URL, y en una página estática eso hace que
 * Next la pinte recién en el navegador: hasta ahora el HTML traía un esqueleto
 * y la grilla aparecía cuando terminaba de bajar el JavaScript. En un teléfono
 * con 4G eso eran tres segundos de pantalla gris en la página más importante.
 *
 * Con este Suspense, mientras tanto se muestra la MISMA vista con las primeras
 * 24 tarjetas reales, ya en el HTML: fotos, precios y enlaces que Google lee y
 * que el visitante ve de entrada. Cuando carga el JavaScript, la vista con
 * filtros toma su lugar sin mover nada.
 */
export function TiendaPagina({
  activeCategory,
  heading,
  intro,
  categories,
  tarjetas,
}: {
  activeCategory: string
  heading: string
  intro?: string | null
  categories: Category[]
  /** Todas las tarjetas de esta página, en el orden de la tienda. */
  tarjetas: TarjetaProducto[]
}) {
  const iniciales = tarjetas.slice(0, TANDA)
  const total = tarjetas.length

  return (
    <Suspense
      fallback={
        <TiendaVista
          heading={heading}
          intro={intro}
          activeCategory={activeCategory}
          categories={categories}
          tarjetas={iniciales}
          conteo={`${total} artículos`}
          hayMas={total > iniciales.length}
          mostrando={`${iniciales.length} de ${total}`}
        />
      }
    >
      <TiendaClient
        activeCategory={activeCategory}
        heading={heading}
        intro={intro}
        iniciales={iniciales}
        total={total}
      />
    </Suspense>
  )
}
