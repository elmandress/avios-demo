import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { AdminCatalogProvider } from '@/lib/admin/useAdminCatalog'
import { PanelShell } from './PanelShell'
import './panel.css'
import './panel-forms.css'

// Panel de administración.
//
// El admin heredado del clon eran quince secciones contra Supabase, con login de
// Supabase Auth. Sin proyecto de base ninguna funcionaba, y arrastraba secciones
// que en Avíos no existen (Tejedoras, Encargos, Colecciones, Lista VIP) más una
// "Estrategia" con datos de negocio confidenciales de otro cliente.
//
// Este es funcional: carga, edita y borra productos, categorías y descuentos,
// ajusta precios en masa y edita los textos del sitio. Como todavía no hay base,
// las ediciones se guardan en el navegador (ver src/lib/admin/store.ts) y la
// tienda las refleja al instante (ver CatalogProvider). El día que se conecte
// Supabase, estas mismas pantallas escriben en la base y el resto no cambia.
//
// Este layout es de SERVIDOR y su único trabajo de datos es leer el catálogo una
// vez y bajarlo por contexto. Así el catálogo no necesita importarse desde
// ningún módulo de cliente — que es lo que metía sus 56 KB en el bundle de todo
// el sitio.

export const metadata: Metadata = {
  title: { template: '%s | Panel', default: 'Panel' },
  // Ni Google ni ningún motor tiene nada que hacer acá.
  robots: { index: false, follow: false, nocache: true },
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog(createClient())

  return (
    <AdminCatalogProvider baseCatalog={catalog}>
      <PanelShell>{children}</PanelShell>
    </AdminCatalogProvider>
  )
}
