// Catálogo de Mercería Avíos.
//
// PRECIOS REALES, tomados del catálogo de Alejandra (el PDF de 718 páginas que
// Avíos manda por WhatsApp). Regla dura: acá no se inventa un precio ni una
// medida. Cuando un dato no estaba en el catálogo se deja `null` o se marca en
// `needsReview`, y sale con un aviso en el panel.
//
// `assertCatalogIntegrity()` (integrity.ts) verifica que los tres campos de
// plata de cada presentación cierren.

import type { Catalog, Category, ColorTone, Discount, Product } from './types'
import catalogoPdf from './catalogo-pdf.json' with { type: 'json' }

// ─── Categorías ──────────────────────────────────────────────────────────────
//
// Las 22 secciones salen de recorrer el PDF completo de Avíos (718 páginas). El
// orden es el de la tienda: primero lo que se corta por metro, después hilos,
// herrajes, herramientas y manualidades.

export const CATEGORIES: Category[] = [
  {
    id: 'cat-cintas',
    slug: 'cintas',
    name: 'Cintas',
    description:
      'Cinta de raso, gross, organza, pampa, hilera y marroquí; cintas de algodón y nylon para bolsos y mochilas, patrias, a lunares y reflectivas. Se cortan por metro y muchas salen por pieza cerrada con precio por mayor.',
    sortOrder: 1,
  },
  {
    id: 'cat-galones-flecos-y-borlas',
    slug: 'galones-flecos-y-borlas',
    name: 'Galones, flecos y borlas',
    description:
      'Galones bordados, con strass, de pompón y para pegar; flecos de seda y lúrex, festones, pasacintas, borlas, cadenas y marabú. Pasamanería para vestuario, danza, carnaval y decoración.',
    sortOrder: 2,
  },
  {
    id: 'cat-puntillas-y-encajes',
    slug: 'puntillas-y-encajes',
    name: 'Puntillas y encajes',
    description:
      'Puntillas de nylon, de algodón y elastizadas, broderie y tul bordado, en todos los anchos. Por metro o por pieza.',
    sortOrder: 3,
  },
  {
    id: 'cat-elasticos',
    slug: 'elasticos',
    name: 'Elásticos',
    description:
      'Elástico blanco y negro del 3 mm al 100 mm, elásticos de lencería y elástico partido. Por metro o por pieza cerrada con precio por mayor.',
    sortOrder: 4,
  },
  {
    id: 'cat-sesgos',
    slug: 'sesgos',
    name: 'Sesgos',
    description:
      'Sesgo acrocel, de raso, con lúrex y de fantasía, para terminaciones y ribetes. Por metro o por pieza.',
    sortOrder: 5,
  },
  {
    id: 'cat-hilos-y-lanas',
    slug: 'hilos-y-lanas',
    name: 'Hilos y lanas',
    description:
      'Hilos de coser en cono y bobina, hilo encerado, chino, de bordar y para macramé; ovillos, lanas para manualidades, rafia, sisal y tanza.',
    sortOrder: 6,
  },
  {
    id: 'cat-cordones-y-tientos',
    slug: 'cordones-y-tientos',
    name: 'Cordones y tientos',
    description:
      'Cordón de algodón en toda la carta de colores, cordones para calzado, cordón trenzado dorado y plateado, colita de ratón y tiento.',
    sortOrder: 7,
  },
  {
    id: 'cat-broches-herrajes-y-velcro',
    slug: 'broches-herrajes-y-velcro',
    name: 'Broches, herrajes y velcro',
    description:
      'Mosquetones, aros, medio aros, hebillas, pasadores, broches de presión y de gancho, ojalillos, argollas de llavero, alfileres de gancho y velcro.',
    sortOrder: 8,
  },
  {
    id: 'cat-lenceria-y-corseteria',
    slug: 'lenceria-y-corseteria',
    name: 'Lencería y corsetería',
    description:
      'Copas, extensores de soutien, ganchos y broches de lencería, breteles, ballenas y hombreras.',
    sortOrder: 9,
  },
  {
    id: 'cat-agujas-y-alfileres',
    slug: 'agujas-y-alfileres',
    name: 'Agujas y alfileres',
    description:
      'Agujas de mano y de máquina familiar, industrial y overlock; agujas de lana y colchoneras; alfileres, enhebradores y dedales.',
    sortOrder: 10,
  },
  {
    id: 'cat-tijeras-y-corte',
    slug: 'tijeras-y-corte',
    name: 'Tijeras y corte',
    description:
      'Tijeras de sastre, de bordar, de peluquero e infantiles; tijerines, cortador rotatorio, sacabocados y abre ojales.',
    sortOrder: 11,
  },
  {
    id: 'cat-herramientas-de-costura',
    slug: 'herramientas-de-costura',
    name: 'Herramientas de costura',
    description:
      'Alfileteros, reglas de moldería, centímetros, tizas y bolígrafos borrables, ruletas, costureros y sets de costura. Lo que se usa todos los días en el taller y en casa.',
    sortOrder: 12,
  },
  {
    id: 'cat-maquina-de-coser',
    slug: 'maquina-de-coser',
    name: 'Máquina de coser',
    description:
      'Bobinas, porta bobinas, pies de máquina, pedales, motores, aceite y correas para máquina familiar e industrial.',
    sortOrder: 13,
  },
  {
    id: 'cat-tejido-y-bordado',
    slug: 'tejido-y-bordado',
    name: 'Tejido y bordado',
    description:
      'Agujas de tejer, de crochet y circulares, aguja de punto ruso, bastidores de bambú y de plástico, kits de bordado y separadores de punto.',
    sortOrder: 14,
  },
  {
    id: 'cat-telas-y-entretelas',
    slug: 'telas-y-entretelas',
    name: 'Telas y entretelas',
    description:
      'Tul liso y con glitter, TNT, fieltro en planchas, entretelas y cinta araña.',
    sortOrder: 15,
  },
  {
    id: 'cat-lentejuelas-strass-y-perlas',
    slug: 'lentejuelas-strass-y-perlas',
    name: 'Lentejuelas, strass y perlas',
    description:
      'Lentejuelas por metro y en cajita, strass, cristales, perlas, mostacillas, caireles, hilo de perlas y tachas para bordar y aplicar.',
    sortOrder: 16,
  },
  {
    id: 'cat-apliques-y-escudos',
    slug: 'apliques-y-escudos',
    name: 'Apliques y escudos',
    description:
      'Apliques bordados, de perlas y termoadhesivos, escudos, cuellos bordados, charreteras, prendedores y flores para aplicar.',
    sortOrder: 17,
  },
  {
    id: 'cat-manualidades',
    slug: 'manualidades',
    name: 'Manualidades',
    description:
      'Silicona y pistolas, formas de telgopor, chenil, pompones, ojitos, palillos, alambre, brillantina, pintura para tela, anilina, cuentas de madera, cascabeles y stickers.',
    sortOrder: 18,
  },
  {
    id: 'cat-flores-artificiales',
    slug: 'flores-artificiales',
    name: 'Flores artificiales',
    description:
      'Flores en ramo y sueltas para tocados, souvenirs, arreglos y ramos de novia.',
    sortOrder: 19,
  },
  {
    id: 'cat-accesorios-para-el-cabello',
    slug: 'accesorios-para-el-cabello',
    name: 'Accesorios para el cabello',
    description:
      'Tiaras, tocados, ondulines con strass y perlas, y colitas.',
    sortOrder: 20,
  },
  {
    id: 'cat-cortineria',
    slug: 'cortineria',
    name: 'Cortinería',
    description:
      'Cinta ruflet, cinta ojal, entretela, ganchos y sujeta cortinas.',
    sortOrder: 21,
  },
  {
    id: 'cat-accesorios-de-vestimenta',
    slug: 'accesorios-de-vestimenta',
    name: 'Accesorios de vestimenta',
    description:
      'Moños, tiradores, adhesivo corporal, rodilleras, guantes, plantillas y accesorios de danza árabe.',
    sortOrder: 22,
  },
]

// ─── Productos ───────────────────────────────────────────────────────────────
//
// El catálogo completo vive en `catalogo-pdf.json`. NO se edita a mano: lo
// genera la extracción del PDF de Avíos (precios tomados del texto del PDF y
// verificados uno por uno contra él; fotos recortadas de cada página). Cada
// producto guarda en `sourcePages` de qué páginas salió, para poder auditarlo.
//
// Lo interpretado —unidad de venta asumida, pieza sin metraje, precio "desde"—
// está en `needsReview` de cada producto y sale como pendiente en /panel.

export const COLORS: ColorTone[] = catalogoPdf.colors

export const PRODUCTS: Product[] = catalogoPdf.products as Product[]

// ─── Descuentos ──────────────────────────────────────────────────────────────

// Apagado por defecto: el 10% no salió del catálogo de Alejandra, y con él
// prendido la demo le mostraba SUS artículos a precios que ella nunca puso
// ($ 11,70 en vez de $ 13). Queda cargado para mostrar en /panel/descuentos
// cómo se prende una promo y cómo cambia todo el sitio al instante.
export const DISCOUNTS: Discount[] = [
  {
    id: 'disc-lanzamiento',
    label: 'Lanzamiento del sitio',
    scope: 'all',
    categorySlug: null,
    percent: 10,
    active: false,
    startsAt: null,
    endsAt: null,
  },
]

// ─── Contenido editable del sitio ────────────────────────────────────────────
//
// En producción esto vive en `site_settings` y se edita desde el panel. Acá es
// el valor por defecto que sirve la demo, y también el fallback si la base está
// caída — así ninguna página se queda sin teléfono ni sin dirección.

export const SETTINGS: Record<string, string> = {
  // Barra superior
  promo_bar_enabled: 'true',
  promo_bar_text: 'Venta por mayor y por menor · Envíos a todo el país · San José 851 esq. Andes',
  promo_bar_link: '/mayorista',

  // Portada
  hero_eyebrow: 'Mercería · Montevideo',
  hero_title: 'Cintas, hilos y mucho más.',
  hero_subtitle:
    'Buscá por nombre, código o medida. Elegí la presentación y mandanos tu pedido por WhatsApp. Por mayor y por menor, con precios a la vista.',
  hero_cta: 'Ver catálogo',
  hero_cta_secondary: 'Por mayor',

  // Nosotros
  about_eyebrow: 'La mercería',
  about_title: 'En San José y Andes desde hace años',
  about_body:
    'Mercería Avíos está en San José 851 esquina Andes, en pleno centro de Montevideo. Atendemos a modistas, talleres, diseñadoras, escuelas de costura y a cualquiera que esté armando algo en su casa.',
  about_body_2:
    'Vendemos por mayor y por menor con la misma atención, y hacemos envíos a todo el país por agencia.',

  // Contacto (datos reales)
  contact_whatsapp: '+598 98 526 943',
  contact_whatsapp_url: 'https://wa.me/59898526943',
  contact_instagram: '@merceria_avios_montevideo',
  // Prueba social real: es el activo más grande de Avíos y hoy el sitio no lo
  // usaba en ningún lado. Editable desde el panel — un número que envejece mal
  // es peor que ninguno, así que si se vacía, el bloque deja de mostrarlo.
  contact_instagram_url: 'https://www.instagram.com/merceria_avios_montevideo/',
  contact_address: 'San José 851 esq. Andes, Montevideo',
  contact_hours_weekday: 'Lunes a viernes de 9:00 a 18:30',
  contact_hours_saturday: 'Sábados de 9:00 a 13:30',

  // Envío y pago
  shipping_estimate: 'Envíos a todo Uruguay · Retiro en San José 851',
  info_shipping:
    'Hacemos envíos a todo el país por agencia. El costo depende del destino y del tamaño del paquete, y lo confirmamos por WhatsApp antes de despachar. También podés retirar sin cargo por el local, San José 851 esquina Andes.',
  info_payment:
    'Efectivo y transferencia bancaria. Otros medios se coordinan por WhatsApp al confirmar el pedido.',
  info_returns:
    'Podés pedir el cambio dentro de los 15 días de la compra, con el artículo sin usar y en su envase original. La mercadería cortada a medida (cintas, cordones, tul, adhesivo) no tiene cambio salvo defecto de fábrica, porque el corte se hace para tu pedido.',

  // Mayorista — lo dejamos explícitamente vacío hasta que Alejandra lo defina.
  wholesale_min_order: '',
  wholesale_note: '',

  whatsapp_float_enabled: 'true',
}

// ─── Catálogo completo ───────────────────────────────────────────────────────

export const DEMO_CATALOG: Catalog = {
  generatedAt: '2026-11-11T00:00:00.000Z',
  categories: CATEGORIES,
  products: PRODUCTS,
  colors: COLORS,
  discounts: DISCOUNTS,
  settings: SETTINGS,
}
