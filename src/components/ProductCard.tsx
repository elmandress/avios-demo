'use client'

import Image from 'next/image'
import { Enlace } from './Enlace'
import type { TarjetaProducto } from '@/lib/catalog/tarjeta'
import { avios, Badge } from './ui/Primitives'
import { PriceBlock } from './ui/PriceBlock'
import { FavoriteButton } from './FavoriteButton'
import { ProductPlaceholder } from './ProductPlaceholder'
import { BLUR_DATA_URL } from '@/lib/media'

// Tarjeta de producto.
//
// Tres cambios de fondo respecto del clon:
//
// 1. Relación 1:1 en vez de 3:4. El 3:4 vertical es para prendas puestas; las
//    fotos reales de este catálogo son cuadradas o apaisadas, y el recorte
//    vertical les comía la mitad del producto.
// 2. El precio "desde" sale SOLO de las presentaciones por menor, y viaja con su
//    unidad. Antes tomaba la fila de talle más barata, que en las cintas era el
//    precio por metro DENTRO de la pieza mayorista: la grilla anunciaba "$ 3,96"
//    una cinta que por menor vale $ 13.
// 3. Se agregó la señal de mayoreo con el ahorro real calculado. Es la razón por
//    la que un mayorista entra a la ficha, y antes no existía en la grilla.

export function ProductCard({
  card,
  priority = false,
}: {
  /** La versión de grilla del producto (ver lib/catalog/tarjeta.ts). */
  card: TarjetaProducto
  /** Sólo para las primeras tarjetas visibles: define el LCP de la grilla. */
  priority?: boolean
}) {
  const price = card.precio
  const photo = card.photo
  const soldOut = card.status === 'soldout'
  const href = `/tienda/${card.slug}`

  return (
    // Precarga por intención (ver Enlace): una grilla de 24 tarjetas ya no son
    // 24 descargas de fichas que casi nadie abre.
    <Enlace
      href={href}
      className="product-card"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          borderRadius: 12,
          overflow: 'hidden',
          background: avios.paper50,
          border: `1px solid ${avios.border}`,
        }}
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            quality={82}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="(max-width: 560px) 50vw, (max-width: 1000px) 33vw, 260px"
            // Next 16: `priority` está deprecado — el par correcto es
            // fetchPriority + loading. El resto de las tarjetas queda lazy.
            {...(priority
              ? ({ fetchPriority: 'high', loading: 'eager' } as const)
              : ({ loading: 'lazy' } as const))}
            className="product-card-img"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <ProductPlaceholder categorySlug={card.categorySlug} label={card.name} />
        )}

        {soldOut && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)' }} />
        )}

        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 'calc(100% - 62px)' }}>
          {soldOut ? (
            <Badge tone="sold">Sin stock</Badge>
          ) : (
            <>
              {price.discountPercent > 0 && <Badge tone="sale">−{price.discountPercent}%</Badge>}
              {price.hasWholesale && (
                <Badge tone="saving">
                  {price.bestSavingsPercent !== null
                    ? `Por mayor −${price.bestSavingsPercent}%`
                    : 'Precio por mayor'}
                </Badge>
              )}
              {/* Etiqueta libre de la dueña ("Nuevo", "Último stock"). Va última
                  porque el descuento y el mayoreo son señales calculadas: si
                  compiten por el espacio, gana el dato duro. */}
              {card.badge && <Badge tone="white">{card.badge}</Badge>}
            </>
          )}
        </div>

        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <FavoriteButton slug={card.slug} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: avios.fontSans, fontSize: 12, color: avios.ink500 }}>
          {/* Espacio duro cuando no hay variantes: mantiene la altura del
              renglón para que los títulos de la grilla queden alineados. */}
          {card.variantes ?? ' '}
        </span>
        <h3
          style={{
            fontFamily: avios.fontSans,
            fontWeight: 600,
            fontSize: 15,
            lineHeight: 1.25,
            color: avios.ink900,
            margin: 0,
          }}
        >
          {card.name}
        </h3>
        <PriceBlock
          list={price.fromListUyu}
          final={price.fromUyu}
          unit={price.fromUnit}
          showUnit={price.fromIsPerUnit}
          prefix={price.desde ? 'desde' : undefined}
          soldOut={soldOut}
        />
      </div>
    </Enlace>
  )
}
