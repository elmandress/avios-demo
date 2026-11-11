import { avios } from './ui/tokens'

// Ilustración de respaldo para los productos que todavía no tienen foto.
//
// Antes se usaban JPEG de 900×900 con un cuadrado bordó y el nombre del producto
// escrito encima. Tres problemas: pesaban ~25 KB cada uno, todos se veían igual
// en la grilla, y en una demo de venta el cliente ve trece cuadrados marrones.
//
// Esto dibuja el TIPO de artículo según su categoría. Es deliberadamente un
// dibujo y no una foto falsa: comunica qué es sin fingir que hay una foto que no
// existe. Pesa cero bytes de red (viaja en el JS que ya baja), escala a
// cualquier tamaño y se reemplaza solo el día que llegue la foto real.

type Art = (color: string) => React.ReactNode

const CINTA: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Carretel */}
    <path d="M28 34h20M28 86h20M31 34v52M45 34v52" />
    <path d="M31 42h14M31 50h14M31 58h14M31 66h14M31 74h14" strokeWidth="2" opacity="0.5" />
    {/* Cinta desenrollada */}
    <path d="M45 52c14 0 14 16 28 16s14-16 28-16" strokeWidth="9" opacity="0.22" />
    <path d="M45 52c14 0 14 16 28 16s14-16 28-16" />
    <path d="M45 61c14 0 14 16 28 16s14-16 28-16" opacity="0.4" />
  </g>
)

const HILO: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Cono */}
    <path d="M52 26h16l10 62H42z" />
    <path d="M46 62h28M44 74h32M49 46h22" strokeWidth="2" opacity="0.5" />
    <ellipse cx="60" cy="26" rx="8" ry="3" />
    {/* Hilo hacia la aguja */}
    <path d="M78 40c16 4 20 18 12 30" strokeWidth="2" />
    {/* Aguja */}
    <path d="M88 76l14 20" strokeWidth="3" />
    <ellipse cx="88" cy="74" rx="3.5" ry="5" transform="rotate(-35 88 74)" strokeWidth="2.5" />
  </g>
)

const CORDON: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Cordón con nudo */}
    <path d="M24 44c18-14 36 6 22 20s4 34 22 20" strokeWidth="7" opacity="0.22" />
    <path d="M24 44c18-14 36 6 22 20s4 34 22 20" />
    <path d="M100 44c-18-14-36 6-22 20s-4 34-22 20" opacity="0.55" />
    {/* Herretes */}
    <rect x="18" y="38" width="10" height="9" rx="2" transform="rotate(-28 23 42)" strokeWidth="2.5" />
    <rect x="96" y="38" width="10" height="9" rx="2" transform="rotate(28 101 42)" strokeWidth="2.5" />
  </g>
)

const HERRAMIENTA: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Tijera */}
    <path d="M40 30l42 52M84 30L42 82" />
    <circle cx="36" cy="90" r="9" />
    <circle cx="88" cy="90" r="9" />
    <circle cx="62" cy="56" r="3" fill={c} strokeWidth="0" />
  </g>
)

const TELA: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Paño con caída */}
    <path d="M26 34h72v46c-12 8-24-8-36 0s-24 8-36 0z" />
    <path d="M26 46h72M26 58h72" strokeWidth="1.6" opacity="0.4" />
    {/* Trama */}
    <path d="M40 34v52M56 34v52M72 34v52M88 34v52" strokeWidth="1.6" opacity="0.4" />
    {/* Brillo */}
    <path d="M46 96l4 6M62 98l4 6M78 96l4 6" strokeWidth="2" opacity="0.6" />
  </g>
)

const VESTIMENTA: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* Moño */}
    <path d="M56 44L26 32c-4-2-8 1-8 5v30c0 4 4 7 8 5l30-12z" />
    <path d="M68 44l30-12c4-2 8 1 8 5v30c0 4-4 7-8 5L68 60z" />
    <rect x="54" y="40" width="16" height="24" rx="4" />
  </g>
)

const BOTON: Art = (c) => (
  <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round">
    <circle cx="62" cy="60" r="30" />
    <circle cx="62" cy="60" r="21" strokeWidth="1.6" opacity="0.45" />
    <circle cx="53" cy="51" r="3.6" strokeWidth="2.5" />
    <circle cx="71" cy="51" r="3.6" strokeWidth="2.5" />
    <circle cx="53" cy="69" r="3.6" strokeWidth="2.5" />
    <circle cx="71" cy="69" r="3.6" strokeWidth="2.5" />
  </g>
)

const BY_CATEGORY: Record<string, Art> = {
  cintas: CINTA,
  'galones-flecos-y-borlas': CINTA,
  'puntillas-y-encajes': CINTA,
  elasticos: CINTA,
  sesgos: CINTA,
  'hilos-y-lanas': HILO,
  'cordones-y-tientos': CORDON,
  'agujas-y-alfileres': HILO,
  'tijeras-y-corte': HERRAMIENTA,
  'herramientas-de-costura': HERRAMIENTA,
  'maquina-de-coser': HERRAMIENTA,
  'tejido-y-bordado': HILO,
  'telas-y-entretelas': TELA,
  'accesorios-de-vestimenta': VESTIMENTA,
  'lenceria-y-corseteria': VESTIMENTA,
}

export function ProductPlaceholder({
  categorySlug,
  label,
}: {
  categorySlug: string
  /** Nombre del producto — sólo para el texto accesible. */
  label?: string
}) {
  const art = BY_CATEGORY[categorySlug] ?? BOTON
  return (
    <div
      role="img"
      aria-label={label ? `${label} — sin foto todavía` : 'Sin foto todavía'}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Fondo crema, no rosado: una línea fucsia sobre rosa pálido no tiene
        // contraste suficiente y el dibujo se lee como una mancha.
        background: `linear-gradient(160deg, ${avios.paper50} 0%, ${avios.paper200} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 124 124"
        aria-hidden="true"
        style={{ width: '60%', height: '60%' }}
      >
        {art(avios.brand600)}
      </svg>
    </div>
  )
}
