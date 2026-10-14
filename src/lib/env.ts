// Identidad del sitio y acceso centralizado a variables de entorno.
//
// El clon traía `required()`, que tiraba en tiempo de import si faltaba la URL o
// la clave de Supabase. Eso tenía sentido en una tienda con base: fallar rápido
// y claro. Acá la demo corre SIN proyecto de Supabase, así que un throw al
// importar tiraba el sitio entero. Ahora Supabase es opcional: si no está
// configurado, `hasSupabase` es false y el catálogo se sirve del archivo local
// (ver src/lib/catalog/index.ts).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

/** Hay credenciales de Supabase válidas y no estamos forzando el modo demo. */
export const hasSupabase =
  SUPABASE_URL.startsWith('http') &&
  SUPABASE_ANON_KEY.length > 0 &&
  process.env.NEXT_PUBLIC_DEMO_MODE !== '1'

/**
 * Dominio canónico. Todavía no hay dominio comprado para Avíos: hasta que lo
 * haya, esto es el placeholder del que salen las URLs absolutas (canonical,
 * OG, sitemap, JSON-LD). Se sobrescribe por entorno con NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://merceriaavios.uy'

/** Origen del storage de Supabase, para el <link rel="preconnect"> del layout. */
export const SUPABASE_STORAGE_ORIGIN = (() => {
  if (!SUPABASE_URL.startsWith('http')) return null
  try {
    return new URL(SUPABASE_URL).origin
  } catch {
    return null
  }
})()

// ─── Identidad de la marca ───────────────────────────────────────────────────

export const BRAND = {
  name: 'Mercería Avíos',
  shortName: 'Avíos',
  legalArea: 'Montevideo, Uruguay',
  street: 'San José 851 esq. Andes',
  city: 'Montevideo',
  country: 'UY',
  /** Coordenadas de San José 851 esq. Andes. */
  geo: { lat: -34.906_2, lng: -56.192_6 },
  // ⚠️ DOS NÚMEROS EN CIRCULACIÓN — a confirmar con Alejandra antes de publicar.
  // El sitio usa este, que es el que vino en el relevamiento del catálogo.
  // Pero el flyer oficial de la mercería anuncia el 092 322 260. Uno de los dos
  // está viejo, o son dos líneas distintas. Mientras no se confirme, todos los
  // botones de WhatsApp del sitio apuntan acá.
  phoneE164: '+59898526943',
  phoneDisplay: '+598 98 526 943',
  whatsappUrl: 'https://wa.me/59898526943',
  /** El otro número, el del flyer. Sólo para el aviso del panel. */
  phoneAlternate: '+598 92 322 260',
  instagram: '@merceria_avios_montevideo',
  instagramUrl: 'https://www.instagram.com/merceria_avios_montevideo/',
  hours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:30' },
    { days: ['Saturday'], opens: '09:00', closes: '13:30' },
  ],
  hoursDisplay: ['Lunes a viernes de 9:00 a 18:30', 'Sábados de 9:00 a 13:30'],
} as const

// ─── Crédito del estudio ─────────────────────────────────────────────────────

export const STUDIO_NAME = 'SIAR'
export const STUDIO_URL = 'https://siaruy.netlify.app'
export const STUDIO_INSTAGRAM = 'https://instagram.com/siar.uy'
