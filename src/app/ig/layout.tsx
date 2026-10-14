import type { Metadata } from 'next'

// /ig vive FUERA del grupo (tienda) a propósito.
//
// Es el enlace de la biografía de Instagram: llega gente desde el navegador
// embebido de la app, con una sola intención y un solo pulgar. El header con
// menú, buscador, favoritos y carrito, más el pie con veinte enlaces, no ayudan
// — compiten. Antes heredaba las dos cosas del layout de la tienda, lo que
// contradecía el comentario que la propia página tenía escrito.
//
// Sin CatalogProvider ni carrito: la página es un server component que lee el
// catálogo y sólo enlaza. Todo lo que se toca acá lleva a otra página.

export const metadata: Metadata = {
  title: 'Enlaces',
  robots: { index: false, follow: true },
}

export default function IgLayout({ children }: { children: React.ReactNode }) {
  return <main className="ig-shell">{children}</main>
}
