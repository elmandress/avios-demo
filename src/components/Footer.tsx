'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BRAND, STUDIO_INSTAGRAM, STUDIO_NAME, STUDIO_URL } from '@/lib/env'
import { useCatalog } from './CatalogProvider'
import { avios, Icon } from './ui/Primitives'

// Componente de cliente sólo para leer las categorías del catálogo editable:
// si se crea una categoría en el panel, aparece también en el pie.
export function Footer({ settings }: { settings: Record<string, string> }) {
  // Ojo: todos los enlaces de acá llevan prefetch={false} a propósito. Ver el
  // comentario de arriba — el pie duplicaba el prefetch de las siete categorías.
  const { categories } = useCatalog()
  const year = new Date().getFullYear()
  const waUrl = settings.contact_whatsapp_url || BRAND.whatsappUrl
  const igUrl = settings.contact_instagram_url || BRAND.instagramUrl

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="brand-link" aria-label={`${BRAND.name} — inicio`}>
            <Image src="/favicon.svg" alt="" width={30} height={30} />
            <span className="brand-wordmark">{BRAND.shortName.toUpperCase()}</span>
          </Link>
          <p>
            Mercería por mayor y por menor en el centro de Montevideo. Cintas, hilos, cordones, tul
            y herramientas de costura.
          </p>
          <div className="site-footer-social">
            <a href={igUrl} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${BRAND.name}`}>
              <Icon name="instagram-logo" size={21} />
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${BRAND.name}`}>
              <Icon name="whatsapp-logo" size={21} />
            </a>
          </div>
        </div>

        <nav aria-label="Catálogo">
          <h2>Catálogo</h2>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/tienda/${c.slug}`} prefetch={false}>{c.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/tienda" prefetch={false}>Ver todo</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Comprar">
          <h2>Comprar</h2>
          <ul>
            <li>
              <Link href="/mayorista" prefetch={false}>Venta por mayor</Link>
            </li>
            <li>
              <Link href="/lista-de-precios" prefetch={false}>Lista de precios</Link>
            </li>
            <li>
              <Link href="/info" prefetch={false}>Envíos y pagos</Link>
            </li>
            <li>
              <Link href="/mi-lista" prefetch={false}>Mi lista</Link>
            </li>
            <li>
              <Link href="/carrito" prefetch={false}>Tu pedido</Link>
            </li>
          </ul>
        </nav>

        <div className="site-footer-contact">
          <h2>El local</h2>
          <address>
            <a
              href="https://www.google.com/maps/search/?api=1&query=San+Jos%C3%A9+851+esquina+Andes,+Montevideo,+Uruguay"
              target="_blank"
              rel="noopener noreferrer"
            >
              {BRAND.street}
              <br />
              {BRAND.city}, Uruguay
            </a>
          </address>
          <ul>
            {BRAND.hoursDisplay.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="site-footer-phone">
            <Icon name="whatsapp-logo" size={16} /> {settings.contact_whatsapp || BRAND.phoneDisplay}
          </a>
        </div>
      </div>

      <div className="site-footer-legal">
        <span>
          © {year} {BRAND.name}
        </span>
        <span>
          <Link href="/terminos" prefetch={false}>Términos y privacidad</Link>
          <span aria-hidden style={{ margin: '0 8px', color: avios.ink300 }}>
            ·
          </span>
          <Link href="/contacto" prefetch={false}>Contacto</Link>
        </span>
        <span>
          Sitio por{' '}
          <a href={STUDIO_URL} target="_blank" rel="noopener noreferrer">
            {STUDIO_NAME}
          </a>{' '}
          <a href={STUDIO_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${STUDIO_NAME}`}>
            <Icon name="instagram-logo" size={14} />
          </a>
        </span>
      </div>
    </footer>
  )
}
