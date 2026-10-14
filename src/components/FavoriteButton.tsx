'use client'

import { useFavorites } from './FavoritesProvider'
import { avios, Icon } from './ui/Primitives'

/**
 * Guardar un artículo en la lista. Dos formas:
 *   - `overlay` (por defecto): pastilla redonda para la esquina de la tarjeta.
 *   - `inline`: fila con texto para la ficha de producto.
 *
 * El texto habla de "lista" y no de "favoritos" a secas: acá la función real es
 * armar la lista de lo que hace falta para un proyecto o una reposición, no
 * marcar lo que te gusta.
 */
export function FavoriteButton({
  slug,
  variant = 'overlay',
  size = 18,
}: {
  slug: string
  variant?: 'overlay' | 'inline'
  size?: number
}) {
  const { has, toggle, hasMounted } = useFavorites()
  // Antes de montar siempre `false`: el servidor no puede saber qué guardó este
  // navegador, y pintar el corazón lleno en el HTML rompería la hidratación.
  const active = hasMounted && has(slug)
  const label = active ? 'Quitar de mi lista' : 'Agregar a mi lista'

  const onClick = (e: React.MouseEvent) => {
    // La tarjeta entera es un link: al tocar el corazón no hay que navegar.
    e.stopPropagation()
    e.preventDefault()
    toggle(slug)
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontFamily: avios.fontSans,
          fontSize: 14,
          color: active ? avios.brand600 : avios.ink700,
          transition: `color 140ms ${avios.ease}`,
        }}
      >
        <Icon
          name="bookmark"
          size={size}
          weight={active ? 'fill' : 'light'}
          color={active ? avios.brand600 : avios.ink700}
        />
        {active ? 'En mi lista' : 'Agregar a mi lista'}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="card-fav"
      style={{
        // 44px: mínimo táctil de WCAG. Va con minWidth/minHeight porque dentro de
        // un contenedor flex el width solo puede comprimirse.
        width: 40,
        height: 40,
        minWidth: 40,
        minHeight: 40,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.94)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? avios.brand600 : avios.ink700,
        boxShadow: avios.shadowSm,
        transition: `color 140ms ${avios.ease}`,
      }}
    >
      <Icon
        name="bookmark"
        size={size}
        weight={active ? 'fill' : 'light'}
        color={active ? avios.brand600 : avios.ink700}
      />
    </button>
  )
}
