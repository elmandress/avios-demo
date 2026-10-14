'use client'

import { useMemo } from 'react'
import { emptyProduct } from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { ProductForm } from '../ProductForm'

export default function NuevoProducto() {
  const { catalog } = useAdminCatalog()

  // El borrador se arma una sola vez: si se recalculara en cada render, cada
  // tecla generaría un id nuevo y el formulario se reiniciaría solo.
  const initial = useMemo(() => {
    const lastOrder = Math.max(0, ...catalog.products.map((p) => p.sortOrder))
    return emptyProduct(catalog.categories[0]?.slug ?? '', lastOrder + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <ProductForm initial={initial} isNew />
}
