'use client'

import { useEffect } from 'react'

/**
 * Reference-counted body scroll lock. Multiple overlays (cart drawer, quick-view,
 * lightbox, mobile menu) can be open in sequence or briefly overlap; a naive
 * "save prev overflow / restore on close" leaks the lock when two coexist
 * (the second captures 'hidden' as the previous value). Counting fixes that:
 * the body stays locked while ≥1 lock is active and is restored only when the
 * last one releases.
 */
let locks = 0
let savedOverflow = ''

function lock() {
  if (typeof document === 'undefined') return
  if (locks === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  locks += 1
}

function unlock() {
  if (typeof document === 'undefined') return
  locks = Math.max(0, locks - 1)
  if (locks === 0) {
    document.body.style.overflow = savedOverflow
  }
}

/** Lock the body scroll while `active` is true. Safe to nest/overlap. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lock()
    return unlock
  }, [active])
}
