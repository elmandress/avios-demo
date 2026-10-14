import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from '@/lib/env'

// Cliente de solo lectura para páginas públicas (home, /tienda, categorías,
// fichas, sitemap…). A diferencia de `supabase/server.ts`, NO toca `cookies()`:
// cookies() es una Request-time API y, con Cache Components deshabilitado
// (next.config.ts no declara `cacheComponents: true`, modelo "previous"), su
// sola presencia en el árbol de render vuelve dinámica TODA la ruta, sin
// importar el `export const revalidate` que declare. Sin este cliente, cada
// ruta pública salía ƒ Dynamic en el build.
//
// Devuelve `undefined` cuando no hay proyecto de Supabase configurado (la demo).
// Los llamadores le pasan el resultado tal cual a `getCatalog()`, que con
// `undefined` sirve el catálogo local sin tocar la red.
export function createClient(): SupabaseClient | undefined {
  if (!hasSupabase) return undefined
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}
