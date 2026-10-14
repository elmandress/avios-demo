'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps Tab/Shift+Tab inside `ref` while `active`, moves focus into the panel
 * on open (first focusable element, or the panel itself), and restores focus
 * to whatever triggered it on close. Without this, a keyboard user tabbing
 * through the CartDrawer/QuickView/Lightbox falls straight through into the
 * page content sitting (invisibly, behind the scrim) later in the DOM —
 * they can end up interacting with the store behind a dialog that looks open.
 */
export function useFocusTrap<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)

    const initial = focusables()[0]
    if (initial) initial.focus()
    else container.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [active, ref])
}
