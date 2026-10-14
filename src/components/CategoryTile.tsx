'use client'

import Image from 'next/image'
import { Enlace } from './Enlace'
import type { Category } from '@/lib/catalog/types'
import type { ResumenCategoria } from '@/lib/catalog/tarjeta'
import { formatUYU } from '@/lib/catalog/pricing'
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
  resumen,
}: {
  category: Category
  /** Conteo, "desde", foto y muestra: se calculan en el servidor. */
  resumen: ResumenCategoria
}) {
  const { cantidad, desde: from, foto: photo, muestra: sample } = resumen

  return (
    <Enlace href={`/tienda/${category.slug}`} className="cat-tile" data-photo={photo ? 'si' : 'no'}>
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
          {cantidad === 0
            ? 'Próximamente'
            : `${cantidad} ${cantidad === 1 ? 'artículo' : 'artículos'}`}
          {/* El precio entero en un renglón: "desde $" arriba y "13" abajo no
              se lee como precio. */}
          {from !== null && (
            <>
              {' · '}
              <span style={{ whiteSpace: 'nowrap' }}>desde {formatUYU(from)}</span>
            </>
          )}
        </span>
      </span>

      <span className="cat-tile-go" aria-hidden>
        <Icon name="arrow-right" size={15} />
      </span>
    </Enlace>
  )
}
