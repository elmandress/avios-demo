'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Enlace } from './Enlace'
import { useCart } from './CartProvider'
import { ProductPlaceholder } from './ProductPlaceholder'
import { avios, Badge, Button, Icon } from './ui/Primitives'
import { formatContent, formatUYU } from '@/lib/catalog/pricing'
import { BLUR_DATA_URL } from '@/lib/media'
import { useFocusTrap } from '@/lib/focus-trap'
import { useScrollLock } from '@/lib/scroll-lock'

/**
 * Panel lateral que confirma lo que se agregó.
 *
 * Muestra la presentación y el contenido total de cada renglón, no sólo la
 * cantidad: en una mercería "× 2" no dice nada hasta que se aclara si son dos
 * metros o dos piezas de cien.
 */
export function CartDrawer() {
  const { cart, loading, rawState, drawerOpen, closeDrawer } = useCart()
  const panelRef = useRef<HTMLDivElement>(null)

  // Los dos hooks se llaman SIEMPRE (arriba del early return) porque el orden
  // de hooks tiene que ser estable entre renders; reciben `drawerOpen` y no
  // hacen nada cuando está cerrado.
  useScrollLock(drawerOpen)
  useFocusTrap(panelRef, drawerOpen)

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen, closeDrawer])

  if (!drawerOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tu pedido"
      className="cart-drawer"
      style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', justifyContent: 'flex-end' }}
    >
      <button
        aria-label="Cerrar"
        onClick={closeDrawer}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(22,24,28,0.42)',
          border: 'none',
          cursor: 'pointer',
        }}
      />

      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: 'min(410px, 100%)',
          height: '100%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-16px 0 40px -24px rgba(22,24,28,0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: `1px solid ${avios.border}`,
          }}
        >
          <span style={{ fontFamily: avios.fontDisplay, fontSize: 20, color: avios.ink900 }}>
            Tu pedido
          </span>
          <button
            onClick={closeDrawer}
            aria-label="Cerrar"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {loading && rawState.lines.length > 0 && cart.lines.length === 0 ? (
          // Los productos del carrito todavía están bajando: un "no agregaste
          // nada" de medio segundo asusta más que una espera.
          <div role="status" style={{ flex: 1, padding: 22 }}>
            <span className="sr-only">Cargando tu pedido…</span>
            <div className="sk-shimmer" style={{ height: 72, borderRadius: 10, marginBottom: 14 }} />
            <div className="sk-shimmer" style={{ height: 72, borderRadius: 10 }} />
          </div>
        ) : cart.lines.length === 0 ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center' }}>
            <div>
              <p style={{ fontFamily: avios.fontSans, fontSize: 15, color: avios.ink700, marginBottom: 18 }}>
                Todavía no agregaste nada.
              </p>
              <Button href="/tienda" variant="primary" onClick={closeDrawer}>
                Ver el catálogo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul style={{ flex: 1, overflowY: 'auto', listStyle: 'none', margin: 0, padding: '4px 20px' }}>
              {cart.lines.map((entry) => {
                const { product, variant, format, line } = entry
                const photo = product.media[0]
                const contentQty = format.contentQty ?? 1
                return (
                  <li
                    key={`${product.slug}-${variant.id}-${format.id}`}
                    style={{
                      display: 'flex',
                      gap: 13,
                      padding: '15px 0',
                      borderBottom: `1px solid ${avios.border}`,
                    }}
                  >
                    <Enlace
                      href={`/tienda/${product.slug}`}
                      onClick={closeDrawer}
                      style={{
                        position: 'relative',
                        width: 62,
                        height: 62,
                        flexShrink: 0,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: avios.paper50,
                        border: `1px solid ${avios.border}`,
                        display: 'block',
                      }}
                    >
                      {photo ? (
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          sizes="62px"
                          quality={82}
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <ProductPlaceholder categorySlug={product.categorySlug} />
                      )}
                    </Enlace>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Enlace
                        href={`/tienda/${product.slug}`}
                        onClick={closeDrawer}
                        style={{
                          fontFamily: avios.fontSans,
                          fontSize: 14.5,
                          fontWeight: 500,
                          color: avios.ink900,
                          textDecoration: 'none',
                        }}
                      >
                        {product.name}
                      </Enlace>
                      <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                        {variant.label ? `${variant.label} · ` : ''}
                        {format.label}
                      </span>
                      <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                        × {line.qty}
                        {contentQty > 1 && ` · ${formatContent(contentQty * line.qty, format.unit)}`}
                      </span>
                      {format.tier === 'mayor' && (
                        <span style={{ marginTop: 2 }}>
                          <Badge tone="saving">Por mayor</Badge>
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontFamily: avios.fontSans,
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: avios.ink900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatUYU(entry.subtotalUyu)}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div
              style={{
                padding: '18px 20px calc(env(safe-area-inset-bottom, 0px) + 18px)',
                borderTop: `1px solid ${avios.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: avios.fontSans, fontSize: 15, color: avios.ink700 }}>Total</span>
                <span style={{ fontFamily: avios.fontSans, fontSize: 21, fontWeight: 700, color: avios.ink900 }}>
                  {formatUYU(cart.subtotalUyu)}
                </span>
              </div>
              <Button href="/carrito" variant="primary" size="lg" full onClick={closeDrawer}>
                Revisar y enviar el pedido
              </Button>
              <button
                onClick={closeDrawer}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: avios.fontSans,
                  fontSize: 14,
                  color: avios.ink500,
                }}
              >
                Seguir agregando
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
