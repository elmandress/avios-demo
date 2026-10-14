'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ICON_PATHS, ICON_PATHS_FILL } from './icons'

import { avios } from './tokens'

// Los tokens se reexportan para no tocar los ~30 imports que ya existen.
export { avios }

// --- Button ---------------------------------------------------
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'ghost' | 'whatsapp'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  /** Con href el botón es un <Link> real (Ctrl+click, rastreable, semántico). */
  href?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  full = false,
  style,
  disabled,
  href,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false)
  const base: React.CSSProperties = {
    fontFamily: avios.fontSans,
    fontWeight: 500,
    letterSpacing: '0.03em',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all 150ms ${avios.ease}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: full ? '100%' : 'auto',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'center',
  }
  const sizes = {
    sm: { padding: '9px 15px', fontSize: 13, borderRadius: 8 },
    md: { padding: '12px 20px', fontSize: 14, borderRadius: 9 },
    lg: { padding: '15px 26px', fontSize: 15, borderRadius: 10 },
  }
  const variants: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    primary: {
      background: avios.brand500,
      color: '#fff',
      ...(hover && !disabled && { background: avios.brand700 }),
    },
    secondary: {
      background: 'transparent',
      color: avios.ink900,
      borderColor: avios.borderStrong,
      ...(hover && !disabled && { borderColor: avios.ink900, background: avios.paper50 }),
    },
    quiet: {
      background: avios.paper100,
      color: avios.ink900,
      ...(hover && !disabled && { background: avios.paper200 }),
    },
    ghost: {
      background: 'transparent',
      color: avios.brand600,
      letterSpacing: '0.01em',
      ...(hover && !disabled && { color: avios.brand700, textDecoration: 'underline' }),
    },
    whatsapp: {
      background: '#25D366',
      color: '#0A2E1B',
      fontWeight: 600,
      ...(hover && !disabled && { background: '#1FBA5A' }),
    },
  }
  const mergedStyle = { ...base, ...sizes[size], ...variants[variant], ...style }

  if (href && !disabled) {
    return (
      <Link
        href={href}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ ...mergedStyle, textDecoration: 'none' }}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </button>
  )
}

// --- Chip -----------------------------------------------------
export function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode
  on: boolean
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={on}
      style={{
        fontFamily: avios.fontSans,
        fontSize: 13,
        fontWeight: on ? 600 : 400,
        padding: '9px 15px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: on ? avios.ink900 : hover ? avios.paper50 : '#fff',
        color: on ? '#fff' : avios.ink700,
        border: `1px solid ${on ? avios.ink900 : avios.borderStrong}`,
        cursor: 'pointer',
        transition: `all 140ms ${avios.ease}`,
      }}
    >
      {children}
    </button>
  )
}

// --- Breadcrumb -----------------------------------------------
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Miga de pan" style={{ marginBottom: 20 }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 7,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          fontFamily: avios.fontSans,
          fontSize: 12.5,
          color: avios.ink500,
        }}
      >
        {items.map((it, i) => (
          <li key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {i > 0 && <span aria-hidden>›</span>}
            {it.href ? (
              <Link href={it.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                {it.label}
              </Link>
            ) : (
              <span style={{ color: avios.ink900 }} aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// --- Badge ----------------------------------------------------
export type BadgeTone = 'white' | 'paper' | 'ink' | 'sold' | 'saving' | 'sale'

export function Badge({
  tone = 'white',
  children,
}: {
  tone?: BadgeTone
  children: React.ReactNode
}) {
  const tones: Record<BadgeTone, React.CSSProperties> = {
    white: { background: 'rgba(255,255,255,0.94)', color: avios.ink900, border: `1px solid ${avios.border}` },
    paper: { background: avios.paper100, color: avios.ink700 },
    ink: { background: avios.ink900, color: '#fff' },
    sold: { background: avios.ink100, color: avios.ink500 },
    saving: { background: avios.saving100, color: avios.saving700 },
    sale: { background: avios.sale, color: '#fff' },
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: avios.fontSans,
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 9px',
        borderRadius: 6,
        letterSpacing: '0.02em',
        ...tones[tone],
      }}
    >
      {children}
    </span>
  )
}

// --- Eyebrow --------------------------------------------------
export function Eyebrow({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        fontFamily: avios.fontSans,
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: avios.brand600,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// --- Section heading ------------------------------------------
export function SectionTitle({
  children,
  as: Tag = 'h2',
  style,
}: {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3'
  style?: React.CSSProperties
}) {
  return (
    <Tag
      style={{
        fontFamily: avios.fontDisplay,
        fontWeight: 400,
        fontSize: Tag === 'h1' ? 38 : 26,
        letterSpacing: '-0.015em',
        lineHeight: 1.15,
        color: avios.ink900,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

// --- Field / Input --------------------------------------------
export function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: avios.fontSans,
          fontSize: 13,
          fontWeight: 500,
          color: avios.ink700,
        }}
      >
        {label}
      </span>
      {children}
      {helper && (
        <span style={{ fontFamily: avios.fontSans, fontSize: 12.5, color: avios.ink500 }}>
          {helper}
        </span>
      )}
    </label>
  )
}

export function TextInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  ...rest
}: {
  placeholder?: string
  value?: string
  onChange?: (val: string) => void
  type?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        fontFamily: avios.fontSans,
        fontSize: 15,
        color: avios.ink900,
        background: '#fff',
        border: `1px solid ${focus ? avios.brand600 : avios.borderStrong}`,
        outline: focus ? `2px solid ${avios.brand100}` : 'none',
        borderRadius: 8,
        padding: '11px 13px',
        transition: `border-color 160ms ${avios.ease}`,
      }}
      {...rest}
    />
  )
}

// --- Icon (SVG inline) ----------------------------------------
// SVG inline en vez de una fuente de iconos por CDN: viaja solo lo que se usa,
// sin request de red ni salto de layout.
export function Icon({
  name,
  size = 18,
  color,
  weight = 'light',
}: {
  name: string
  size?: number
  color?: string
  weight?: string
}) {
  const fillSet = weight === 'fill' ? ICON_PATHS_FILL[name] : undefined
  const inner = fillSet ?? ICON_PATHS[name]
  if (!inner) {
    // Icono desconocido: se reserva el cuadrado para que no salte el layout.
    return (
      <span
        aria-hidden="true"
        style={{ display: 'inline-block', width: size, height: size, flex: '0 0 auto' }}
      />
    )
  }
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      style={{
        color: color || 'currentColor',
        display: 'inline-block',
        flex: '0 0 auto',
        verticalAlign: 'middle',
      }}
    >
      {inner}
    </svg>
  )
}
