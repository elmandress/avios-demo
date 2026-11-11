'use client'

import { useCallback, useRef, useState } from 'react'
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
  focus,
}: {
  images: GalleryImage[]
  productName: string
  /** Para dibujar la ilustración de categoría cuando no hay foto. */
  categorySlug: string
  /**
   * Foto a la que tiene que saltar la galería (la del modelo o color recién
   * elegido). `tick` cambia en cada elección, así elegir dos modelos que
   * comparten foto vuelve a ella aunque el visitante se haya movido.
   */
  focus?: { index: number; tick: number }
}) {
  const [active, setActive] = useState(0)
  // Estado derivado de una prop: se ajusta durante el render, sin efecto.
  const [lastTick, setLastTick] = useState(focus?.tick)
  if (focus && focus.tick !== lastTick) {
    setLastTick(focus.tick)
    if (focus.index >= 0 && focus.index < images.length) setActive(focus.index)
  }
  const [lightbox, setLightbox] = useState(false)
  // Deslizar con el dedo (patrón de Dahila). Un deslizamiento cambia de foto y
  // NO abre el zoom; un toque quieto sí.
  const toque = useRef<{ x: number; y: number } | null>(null)
  const deslizo = useRef(false)

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
        onClick={() => {
          if (deslizo.current) {
            deslizo.current = false
            return
          }
          setLightbox(true)
        }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          toque.current = { x: t.clientX, y: t.clientY }
          deslizo.current = false
        }}
        onTouchEnd={(e) => {
          const inicio = toque.current
          toque.current = null
          if (!inicio || images.length < 2) return
          const t = e.changedTouches[0]
          const dx = t.clientX - inicio.x
          // Horizontal y con intención: si el dedo fue más para abajo que para
          // el costado, era scroll de la página.
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - inicio.y)) {
            deslizo.current = true
            go(dx < 0 ? 1 : -1)
          }
        }}
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
          // Entera, no recortada: muchas fotos del catálogo traen el número de
          // modelo o el nombre del color cerca del borde.
          style={{ objectFit: 'contain' }}
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
        {images.length > 1 && (
          <span className="galeria-contador" aria-hidden>
            {active + 1} / {images.length}
          </span>
        )}
      </button>

      {images.length > 1 && (
        // Miniaturas de tamaño fijo: en una grilla de fracciones, con dos fotos
        // cada miniatura ocupaba media pantalla y empujaba el precio para abajo.
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              aria-label={`Ver foto ${i + 1} de ${images.length}`}
              aria-current={i === active}
              style={{
                position: 'relative',
                width: 68,
                height: 68,
                flex: '0 0 auto',
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
                sizes="68px"
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
