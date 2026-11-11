'use client'
import { useEffect, useRef, type ReactNode } from 'react'
export function PanelCatalogo({
  children,
  cerrar,
}: {
  children: ReactNode
  cerrar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    d?.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="catalogo-dialog"
      aria-label="Filtros del catálogo"
      onCancel={cerrar}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar()
      }}
    >
      {children}
    </dialog>
  )
}
