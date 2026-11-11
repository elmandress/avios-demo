// Las rutas que se auditan, en un solo lugar.
//
// Cuando se agrega una página al sitio, se agrega acá. Si no, la auditoría pasa
// en verde sin haberla mirado nunca — que es peor que no tener auditoría.

/** Las páginas públicas: las que ve un comprador. */
export const TIENDA = [
  '/',
  '/tienda',
  '/tienda/cintas',
  '/tienda/galones-flecos-y-borlas?tipo=Flecos',
  '/tienda/marroqui-m2-2-5-cm',
  '/tienda/cinta-raso-doble-faz',
  '/mayorista',
  '/lista-de-precios',
  '/carrito',
  '/mi-lista',
  '/nosotros',
  '/contacto',
  '/info',
  '/terminos',
  '/ig',
  '/mostrador',
]

/** El panel. Necesita sesión: las auditorías la abren solas. */
export const PANEL = [
  '/panel',
  '/panel/productos',
  '/panel/productos/nuevo',
  '/panel/precios',
  '/panel/categorias',
  '/panel/descuentos',
  '/panel/busquedas',
  '/panel/publicar',
  '/panel/conexiones',
  '/panel/textos',
  '/panel/respaldo',
]

/** Rutas que no son HTML pero tienen que responder. */
export const RECURSOS = [
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/merchant-feed.xml',
  // El feed que alimenta el catálogo de WhatsApp y la tienda de Instagram.
  // Si deja de responder, esos dos catálogos se quedan con el último dato bueno
  // y nadie se entera hasta que un precio queda viejo.
  '/catalogo-meta.csv',
  // Lo que baja el navegador en vez del catálogo entero: si dejan de
  // responder, el buscador y el carrito se quedan sin datos.
  '/indice.json',
  '/datos/cinta-raso-doble-faz',
  // La tarjeta que se ve al compartir una ficha o una categoría por WhatsApp.
  '/tienda/cinta-raso-doble-faz/og',
  '/tienda/cintas/og',
]

/** Las que se miden en rendimiento: por dónde entra el tráfico de verdad. */
export const CLAVE = ['/', '/tienda', '/tienda/cinta-raso-doble-faz', '/mayorista', '/ig']

export const SESION_PANEL = "sessionStorage.setItem('avios.panel.sesion.v1','1')"
