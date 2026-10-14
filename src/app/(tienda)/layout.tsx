import { getCatalog } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/public'
import { BRAND } from '@/lib/env'
import { CatalogProvider } from '@/components/CatalogProvider'
import { CartProvider } from '@/components/CartProvider'
import { FavoritesProvider } from '@/components/FavoritesProvider'
import { CartDrawer } from '@/components/CartDrawer'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BackToTop } from '@/components/BackToTop'
import { WhatsAppFloat } from '@/components/WhatsAppFloat'

// Marco de la tienda: navegación, pie, carrito y botón flotante.
//
// Vive en un grupo de rutas —los paréntesis de `(tienda)` no aparecen en la
// URL— para que el panel quede afuera y tenga el suyo. La home sigue siendo `/`.

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  // Un solo fetch del catálogo para todo el marco. Al navegador baja SÓLO lo
  // chico y compartido: categorías, descuentos y textos. Los productos no: con
  // miles de artículos, mandarlos en el marco los ponía dentro de cada página
  // del sitio (ver CatalogProvider y AVIOS-PLAN.md, Fase 2).
  const catalog = await getCatalog(createClient())
  const { settings } = catalog
  const base = {
    categories: catalog.categories,
    discounts: catalog.discounts,
    settings,
    generatedAt: catalog.generatedAt,
  }

  const promo = {
    enabled: settings.promo_bar_enabled !== 'false',
    text: settings.promo_bar_text ?? '',
    link: settings.promo_bar_link ?? '',
  }

  return (
    // CatalogProvider va por FUERA de todo: reemplaza el catálogo del servidor
    // por el editado en el panel (si existe), y de ahí leen la navegación, el
    // buscador, la grilla, la ficha y el carrito.
    <CatalogProvider base={base}>
      <CartProvider>
        <FavoritesProvider>
          <a href="#contenido" className="skip-link">
            Saltar al contenido
          </a>
          <Header promo={promo} />
          <main id="contenido">{children}</main>
          <Footer settings={settings} />
          <CartDrawer />
          <BackToTop />
          <WhatsAppFloat
            enabled={settings.whatsapp_float_enabled !== 'false'}
            waUrl={settings.contact_whatsapp_url || BRAND.whatsappUrl}
          />
        </FavoritesProvider>
      </CartProvider>
    </CatalogProvider>
  )
}
