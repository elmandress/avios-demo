import { Enlace } from './Enlace'
import { FAMILIAS } from '@/lib/catalog/taxonomia'
import type { Category } from '@/lib/catalog/types'

export function CatalogoFamilias({
  categories,
  activeCategory = 'todo',
}: {
  categories: Category[]
  activeCategory?: string
}) {
  return (
    <nav className="catalogo-familias" aria-label="Rubros del catálogo">
      {FAMILIAS.map((f) => (
        <details
          key={f.nombre}
          open={f.categorias.includes(activeCategory) || undefined}
        >
          <summary>{f.nombre}</summary>
          <div>
            {f.categorias.map((slug) => {
              const c = categories.find((c) => c.slug === slug)
              return c ? (
                <Enlace
                  key={slug}
                  href={`/tienda/${slug}`}
                  aria-current={slug === activeCategory ? 'page' : undefined}
                >
                  {c.name}
                </Enlace>
              ) : null
            })}
          </div>
        </details>
      ))}
    </nav>
  )
}
