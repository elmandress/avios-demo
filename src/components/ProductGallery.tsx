'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { avios, Icon } from './ui/Primitives'
import { ProductPlaceholder } from './ProductPlaceholder'
import { BLUR_DATA_URL } from '@/lib/media'
import type { GalleryImage } from './ProductLightbox'

// El lightbox sólo se monta cuando el visitante toca la imagen: se carga a
// demanda para que no pese en el JS inicial de la ficha.
const ProductLightbox = dynamic(() => import('./ProductLightbox'), { ssr: false })

export function ProductGallery({
  images,
  productName,
  categorySlug,
}: {
  images: GalleryImage[]
  productName: string
  /** Para dibujar la ilustración de categoría cuando no hay foto. */
  categorySlug: string
}) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const go = useCallback(
    (dir: number) => {
      setActive((prev) => {
        const n = images.length
        return n === 0 ? 0 : (((prev + dir) % n) + n) % n
      })
    },
    [images.length]
  )

  // Sin fotos: la ilustración de la categoría, sin zoom (no hay nada que ampliar)
  // y sin botón, que prometería una imagen grande que no existe.
  if (images.length === 0) {
    return (
      <div
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${avios.border}`,
        }}
      >
        <ProductPlaceholder categorySlug={categorySlug} label={productName} />
        <span
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: avios.fontSans,
            fontSize: 12.5,
            color: avios.ink500,
          }}
        >
          Foto en camino
        </span>
      </div>
    )
  }

  const current = images[Math.min(active, images.length - 1)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <button
        onClick={() => setLightbox(true)}
        aria-label={`Ampliar la foto de ${productName}`}
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          borderRadius: 12,
          overflow: 'hidden',
          background: avios.paper50,
          border: `1px solid ${avios.border}`,
          padding: 0,
          cursor: 'zoom-in',
          width: '100%',
        }}
      >
        <Image
          src={current.url}
          alt={current.alt || productName}
          fill
          // Es el elemento LCP de la ficha. Next 16 deprecó `priority`: el par
          // correcto es fetchPriority="high" + loading="eager".
          fetchPriority="high"
          loading="eager"
          quality={90}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 760px) 100vw, 560px"
          style={{ objectFit: 'cover' }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.94)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: avios.ink900,
            boxShadow: avios.shadowSm,
          }}
        >
          <Icon name="magnifying-glass-plus" size={16} />
        </span>
      </button>

      {images.length > 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(images.length, 5)}, minmax(0, 1fr))`,
            gap: 9,
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1} de ${images.length}`}
              aria-current={i === active}
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                borderRadius: 8,
                overflow: 'hidden',
                background: avios.paper50,
                border: i === active ? `2px solid ${avios.brand600}` : `1px solid ${avios.border}`,
                padding: 0,
                cursor: 'pointer',
                transition: `border-color 140ms ${avios.ease}`,
              }}
            >
              <Image
                src={img.url}
                alt=""
                fill
                quality={82}
                sizes="(max-width: 760px) 22vw, 110px"
                style={{ objectFit: 'cover', opacity: i === active ? 1 : 0.82 }}
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <ProductLightbox
          images={images}
          index={active}
          onClose={() => setLightbox(false)}
          onChange={setActive}
          onNav={go}
          productName={productName}
        />
      )}
    </div>
  )
}
