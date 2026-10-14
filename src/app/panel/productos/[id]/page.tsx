'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { ProductForm } from '../ProductForm'

export default function EditarProducto() {
  const params = useParams<{ id: string }>()
  const { catalog, hydrated } = useAdminCatalog()

  // Antes de leer localStorage no se sabe si el producto existe: mostrar "no
  // encontrado" en ese instante haría parpadear un error en cada carga.
  if (!hydrated) {
    return (
      <div className="sk-shimmer" style={{ width: 260, height: 26, borderRadius: 6 }} />
    )
  }

  const product = catalog.products.find((p) => p.id === params.id)

  if (!product) {
    return (
      <>
        <header className="panel-header">
          <Link href="/panel/productos" className="panel-back">
            ← Productos
          </Link>
          <h1>Producto no encontrado</h1>
          <p>Puede que lo hayas borrado, o que el enlace sea de otro navegador.</p>
        </header>
      </>
    )
  }

  return <ProductForm initial={product} isNew={false} />
}
