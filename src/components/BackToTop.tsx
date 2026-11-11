'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { avios, Icon } from './ui/Primitives'

/**
 * A small "back to top" button that appears after the visitor scrolls down a
 * long page. Hidden on admin. Subtle and on-brand.
 */
export function BackToTop() {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname.startsWith('/panel') || pathname.startsWith('/carrito') || pathname.startsWith('/tienda')) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className="back-to-top"
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 40,
        width: 44, height: 44, borderRadius: 999,
        background: 'rgba(255,255,255,0.96)', color: avios.ink900,
        border: `1px solid ${avios.border}`, boxShadow: avios.shadowMd,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(10px)',
        pointerEvents: show ? 'auto' : 'none',
        transition: `opacity 200ms ${avios.ease}, transform 200ms ${avios.ease}`,
      }}
    >
      <Icon name="caret-up" size={18} />
    </button>
  )
}
