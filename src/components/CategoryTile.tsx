'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Category, Discount, Product } from '@/lib/catalog/types'
import { formatUYU, summarisePrice } from '@/lib/catalog/pricing'
import { BLUR_DATA_URL } from '@/lib/media'
import { Icon } from './ui/Primitives'

// Baldosa de categoría.
//
// Antes esto era un ícono de línea genérico dentro de una cajita beige, siete
// veces. Dos problemas: a ese tamaño cinco de los siete dibujos eran
// indistinguibles, y una grilla de íconos idénticos es exactamente el aspecto
// de plantilla que hace que un sitio parezca hecho a máquina.
//
// Lo que hay ahora dice ALGO en vez de decorar:
//   · cuántos artículos hay adentro — un comprador quiere saber si Cintas tiene
//     3 o 30 antes de entrar;
//   · desde qué precio arranca;
//   · y una foto real de un producto de la categoría, cuando existe, como fondo.
//
// La foto va de fondo y no de protagonista a propósito: cuatro de las siete
// categorías todavía no tienen ninguna foto, y una grilla mitad-foto
// mitad-dibujo se ve peor que una consistente. Así, con o sin foto, la baldosa
// es la misma pieza y lo que cambia es la textura del fondo.

export function CategoryTile({
  category,
  products,
  discounts,
}: {
  category: Category
  /** Todos los productos: la baldosa deriva de acá su conteo y su "desde". */
  products: Product[]
  discounts: readonly Discount[]
}) {
  const inCategory = products.filter(
    (p) => p.categorySlug === category.slug && p.status !== 'draft'
  )

  const prices = inCategory
    .map((p) => summarisePrice(p, discounts).fromUyu)
    .filter((n) => n > 0)
  const from = prices.length > 0 ? Math.min(...prices) : null

  // La primera foto que aparezca en la categoría. Si no hay ninguna, la baldosa
  // se queda con el papel crema y su tipografía, que también funciona.
  const photo = inCategory.find((p) => p.media.length > 0)?.media[0] ?? null

  // Sin foto la baldosa quedaba con medio cuadro vacío. En vez de rellenarlo
  // con una textura decorativa, se listan los primeros artículos: es contenido
  // de verdad y contesta la pregunta que trae al visitante ("¿tenés pinzas?").
  const sample = inCategory.slice(0, 3).map((p) => p.name)

  return (
    <Link href={`/tienda/${category.slug}`} className="cat-tile" data-photo={photo ? 'si' : 'no'}>
      {photo && (
        <Image
          src={photo.url}
          alt=""
          fill
          quality={82}
          sizes="(max-width: 560px) 50vw, (max-width: 900px) 33vw, 280px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="cat-tile-photo"
        />
      )}

      {!photo && sample.length > 0 && (
        <span className="cat-tile-sample" aria-hidden>
          {sample.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </span>
      )}

      <span className="cat-tile-body">
        <span className="cat-tile-name">{category.name}</span>
        <span className="cat-tile-meta">
          {inCategory.length === 0
            ? 'Próximamente'
            : `${inCategory.length} ${inCategory.length === 1 ? 'artículo' : 'artículos'}`}
          {from !== null && ` · desde ${formatUYU(from)}`}
        </span>
      </span>

      <span className="cat-tile-go" aria-hidden>
        <Icon name="arrow-right" size={15} />
      </span>
    </Link>
  )
}
