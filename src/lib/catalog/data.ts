// Catálogo de Mercería Avíos.
//
// PRECIOS REALES, tomados del catálogo en papel de Alejandra. Regla dura: acá no
// se inventa un precio ni una medida. Cuando un dato no estaba en el catálogo se
// deja `null` o se marca en `needsReview`, y sale con un aviso en el panel.
//
// Sobre los tres campos de plata de cada presentación:
//   · Las cintas venían anotadas con precio POR METRO en las dos columnas
//     (suelto y mayorista). El total de la pieza (`priceUyu`) es el producto de
//     ese precio por metro por el contenido de la pieza — aritmética sobre los
//     números de Alejandra, no un precio nuevo. Igual conviene que lo confirme:
//     si ella redondea la pieza a un número cerrado, manda el suyo.
//   · Los hilos y el boob tape venían anotados al revés (precio de la
//     presentación) y el precio por unidad es el derivado.
//
// `assertCatalogIntegrity()` (integrity.ts) verifica que los tres campos cierren.

import type {
  Catalog,
  Category,
  ColorTone,
  Discount,
  MeasureUnit,
  PriceTier,
  Product,
  SaleFormat,
  Variant,
} from './types'

/** Las dos unidades de longitud que maneja el catálogo. */
type LengthUnit = Extract<MeasureUnit, 'm' | 'yd'>

// ─── Categorías ──────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  {
    id: 'cat-cintas',
    slug: 'cintas',
    name: 'Cintas',
    description:
      'Cinta de raso doble faz, gross y reflectiva, en anchos del Nro 0 al Nro 12. Se cortan por metro y también salen por pieza cerrada, con precio por mayor.',
    sortOrder: 1,
  },
  {
    id: 'cat-hilos',
    slug: 'hilos',
    name: 'Hilos',
    description:
      'Hilo encerado y hilo chino para costura fuerte, marroquinería, trenzado y armado de accesorios. En rollito suelto o en cono, con precio por mayor.',
    sortOrder: 2,
  },
  {
    id: 'cat-cordones',
    slug: 'cordones',
    name: 'Cordones',
    description:
      'Cordón de algodón por metro y cordones para calzado, lisos o con lúrex, en los largos y colores que más se piden.',
    sortOrder: 3,
  },
  {
    id: 'cat-herramientas',
    slug: 'herramientas-de-costura',
    name: 'Herramientas de costura',
    description:
      'Alfileteros imantados, pinzas de sujeción y sets de reglas de moldería. Lo que se usa todos los días en el taller y en casa.',
    sortOrder: 4,
  },
  {
    id: 'cat-telas-tul',
    slug: 'telas-y-tul',
    name: 'Telas y tul',
    description:
      'Tul liso y tul con glitter para decoración, arreglos y vestuario. En los anchos de rollo corto que se venden por metro.',
    sortOrder: 5,
  },
  {
    id: 'cat-calzado',
    slug: 'calzado-y-accesorios',
    name: 'Calzado y accesorios',
    description:
      'Plantillas recortables multitalle y accesorios de calzado, en versión estándar y con corderito para invierno.',
    sortOrder: 6,
  },
  {
    id: 'cat-vestimenta',
    slug: 'accesorios-de-vestimenta',
    name: 'Accesorios de vestimenta',
    description:
      'Moños de etiqueta, tiradores para adulto y niño, y adhesivo corporal. Accesorios de fiesta y de todos los días.',
    sortOrder: 7,
  },
]

// ─── Tonos (informativos: se coordinan por WhatsApp, no se seleccionan) ──────

export const COLORS: ColorTone[] = [
  { id: 'col-dorado', name: 'Dorado', hex: '#C8A24A' },
  { id: 'col-plateado', name: 'Plateado', hex: '#B9BDC2' },
  { id: 'col-blanco', name: 'Blanco', hex: '#FFFFFF' },
  { id: 'col-negro', name: 'Negro', hex: '#1C1C1C' },
  { id: 'col-crudo', name: 'Crudo', hex: '#EFE4D2' },
  { id: 'col-gris', name: 'Gris', hex: '#8A8F94' },
  { id: 'col-azul-marino', name: 'Azul marino', hex: '#22304A' },
  { id: 'col-bordo', name: 'Bordó', hex: '#6E2230' },
  { id: 'col-beige', name: 'Beige', hex: '#D9C4A9' },
  { id: 'col-tostado', name: 'Tostado', hex: '#A97B4F' },
  { id: 'col-marron', name: 'Marrón', hex: '#6B4A32' },
  { id: 'col-jaspeado', name: 'Jaspeado', hex: '#9C8E7E' },
]

const byId = (id: string): ColorTone => {
  const found = COLORS.find((c) => c.id === id)
  if (!found) throw new Error(`Color desconocido: ${id}`)
  return found
}

// ─── Ayudas para escribir el catálogo sin repetirse ──────────────────────────

const CREATED = '2026-08-24T00:00:00.000Z'

/** Presentación por menor que se corta a pedido: se cobra por unidad de medida. */
function porMedida(
  id: string,
  unitPrice: number,
  unit: LengthUnit = 'm'
): SaleFormat {
  return {
    id,
    tier: 'menor',
    label: unit === 'm' ? 'Por metro' : 'Por yarda',
    unit,
    contentQty: 1,
    priceUyu: unitPrice,
    unitPriceUyu: unitPrice,
    available: true,
    minQty: 1,
  }
}

/** Presentación cerrada: la pieza, el rollo o el cono completo. */
function pieza(
  id: string,
  label: string,
  contentQty: number,
  unitPrice: number,
  unit: LengthUnit = 'm',
  tier: PriceTier = 'mayor'
): SaleFormat {
  return {
    id,
    tier,
    label,
    unit,
    contentQty,
    priceUyu: Math.round(unitPrice * contentQty * 100) / 100,
    unitPriceUyu: unitPrice,
    available: true,
    minQty: 1,
  }
}

/** Presentación cerrada anotada por su precio total (hilos, boob tape). */
function piezaTotal(
  id: string,
  label: string,
  contentQty: number,
  totalPrice: number,
  unit: LengthUnit = 'm',
  tier: PriceTier = 'mayor'
): SaleFormat {
  return {
    id,
    tier,
    label,
    unit,
    contentQty,
    priceUyu: totalPrice,
    unitPriceUyu: Math.round((totalPrice / contentQty) * 10000) / 10000,
    available: true,
    minQty: 1,
  }
}

/** Artículo que se vende de a uno: alfileteros, moños, tiradores. */
function unidad(id: string, price: number, label = 'Unidad'): SaleFormat {
  return {
    id,
    tier: 'menor',
    label,
    unit: 'u',
    contentQty: 1,
    priceUyu: price,
    unitPriceUyu: price,
    available: true,
    minQty: 1,
  }
}

/** Producto de una sola variante: la variante existe pero no se muestra. */
function unica(formats: SaleFormat[]): Variant[] {
  return [{ id: 'v-unica', label: '', axis: null, available: true, formats }]
}

// ─── Productos ───────────────────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  // ── Cintas ────────────────────────────────────────────────────────────────
  {
    id: 'p-cinta-raso-doble-faz',
    slug: 'cinta-raso-doble-faz',
    name: 'Cinta de raso doble faz',
    description:
      'Cinta de raso con brillo parejo de los dos lados, en siete anchos del Nro 0 al Nro 12 y amplia carta de colores. Se corta por metro para un arreglo puntual, o se lleva la pieza cerrada con precio por mayor.',
    categorySlug: 'cintas',
    status: 'active',
    badge: null,
    sku: null,
    material: 'Poliéster',
    media: [
      { url: '/images/cinta-raso-doble-faz.jpg', alt: 'Cintas de raso doble faz en varios colores', position: 0 },
      { url: '/images/cinta-raso-doble-faz-2.jpg', alt: 'Piezas de cinta de raso apiladas', position: 1 },
    ],
    variants: [
      {
        id: 'v-raso-4',
        label: '4 mm (Nro 0)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-4-m', 13), pieza('f-raso-4-p', 'Pieza cerrada · 100 m', 100, 3.96)],
      },
      {
        id: 'v-raso-7',
        label: '7 mm (Nro 1)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-7-m', 15), pieza('f-raso-7-p', 'Pieza cerrada · 100 m', 100, 5.06)],
      },
      {
        id: 'v-raso-10',
        label: '10 mm (Nro 2)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-10-m', 24), pieza('f-raso-10-p', 'Pieza cerrada · 50 m', 50, 12)],
      },
      {
        id: 'v-raso-15',
        label: '15 mm (Nro 3)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-15-m', 28), pieza('f-raso-15-p', 'Pieza cerrada · 50 m', 50, 14)],
      },
      {
        id: 'v-raso-25',
        label: '25 mm (Nro 5)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-25-m', 32), pieza('f-raso-25-p', 'Pieza cerrada · 50 m', 50, 15)],
      },
      {
        id: 'v-raso-38',
        label: '38 mm (Nro 9)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-38-m', 39), pieza('f-raso-38-p', 'Pieza cerrada · 50 m', 50, 25)],
      },
      {
        id: 'v-raso-50',
        label: '50 mm (Nro 12)',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-raso-50-m', 41), pieza('f-raso-50-p', 'Pieza cerrada · 50 m', 50, 29)],
      },
    ],
    colors: [],
    sortOrder: 1,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Total de cada pieza cerrada (calculado como precio por metro × metros de la pieza)'],
  },
  {
    id: 'p-cinta-gross',
    slug: 'cinta-gross',
    name: 'Cinta gross',
    description:
      'Cinta de grosgrain con el acanalado firme característico, que aguanta el moño sin aplastarse. Cinco anchos, del 7 mm al 40 mm, y pieza cerrada de 10 m con precio por mayor.',
    categorySlug: 'cintas',
    status: 'active',
    badge: null,
    sku: null,
    material: 'Poliéster',
    media: [{ url: '/images/cinta-gross.jpg', alt: 'Rollos de cinta gross de colores', position: 0 }],
    variants: [
      {
        id: 'v-gross-7',
        label: '7 mm',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-gross-7-m', 21), pieza('f-gross-7-p', 'Pieza cerrada · 10 m', 10, 14)],
      },
      {
        id: 'v-gross-10',
        label: '10 mm',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-gross-10-m', 26), pieza('f-gross-10-p', 'Pieza cerrada · 10 m', 10, 15)],
      },
      {
        id: 'v-gross-15',
        label: '15 mm',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-gross-15-m', 31), pieza('f-gross-15-p', 'Pieza cerrada · 10 m', 10, 21)],
      },
      {
        id: 'v-gross-22',
        label: '22 mm',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-gross-22-m', 37), pieza('f-gross-22-p', 'Pieza cerrada · 10 m', 10, 26)],
      },
      {
        id: 'v-gross-40',
        label: '40 mm',
        axis: 'ancho',
        available: true,
        formats: [porMedida('f-gross-40-m', 45), pieza('f-gross-40-p', 'Pieza cerrada · 10 m', 10, 35)],
      },
    ],
    colors: [],
    sortOrder: 2,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Total de cada pieza cerrada (calculado como precio por metro × metros de la pieza)'],
  },
  {
    id: 'p-cinta-reflectiva',
    slug: 'cinta-reflectiva',
    name: 'Cinta reflectiva de seguridad',
    description:
      'Cinta técnica de 5 cm de ancho con microesferas reflectantes, para ropa de trabajo, indumentaria deportiva y confección industrial. En gris clásica y en flúor de alta visibilidad.',
    categorySlug: 'cintas',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: [
      {
        id: 'v-refl-gris',
        label: 'Gris clásica · 5 cm',
        axis: 'modelo',
        available: true,
        formats: [porMedida('f-refl-gris-m', 64)],
      },
      {
        id: 'v-refl-fluor',
        label: 'Flúor alta visibilidad · 5 cm',
        axis: 'modelo',
        available: true,
        formats: [porMedida('f-refl-fluor-m', 69)],
      },
    ],
    colors: [],
    sortOrder: 3,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Unidad de venta: se asumió por metro, como el resto de las cintas'],
  },

  // ── Hilos ─────────────────────────────────────────────────────────────────
  {
    id: 'p-hilo-encerado',
    slug: 'hilo-encerado',
    name: 'Hilo encerado',
    description:
      'Hilo encerado de alta resistencia para costura fuerte, marroquinería, macramé y bijouterie. El encerado hace que el nudo agarre y no se deshilache. En rollito de 10 m o cono de 169 m.',
    categorySlug: 'hilos',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    media: [{ url: '/images/hilo-encerado.jpg', alt: 'Conos y rollos de hilo encerado de colores', position: 0 }],
    variants: unica([
      piezaTotal('f-enc-rollito', 'Rollito · 10 m', 10, 43, 'm', 'menor'),
      piezaTotal('f-enc-cono', 'Cono · 169 m', 169, 273),
    ]),
    colors: [],
    sortOrder: 4,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-hilo-chino',
    slug: 'hilo-chino',
    name: 'Hilo chino',
    description:
      'Hilo chino trenzado para armado de accesorios, pulseras y trenzados decorativos. En rollo chico de 10 m o rollo grande de 100 yardas, que sale bastante más barato por metro.',
    categorySlug: 'hilos',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    media: [
      { url: '/images/hilo-chino.jpg', alt: 'Rollos de hilo chino de colores', position: 0 },
      { url: '/images/hilo-chino-2.jpg', alt: 'Detalle del trenzado del hilo chino', position: 1 },
      { url: '/images/hilo-chino-3.jpg', alt: 'Hilo chino en tonos claros', position: 2 },
      { url: '/images/hilo-chino-4.jpg', alt: 'Carta de colores de hilo chino', position: 3 },
    ],
    variants: unica([
      piezaTotal('f-chino-chico', 'Rollo chico · 10 m', 10, 59, 'm', 'menor'),
      piezaTotal('f-chino-grande', 'Rollo grande · 100 yd', 100, 350, 'yd'),
    ]),
    colors: [],
    sortOrder: 5,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },

  // ── Cordones ──────────────────────────────────────────────────────────────
  {
    id: 'p-cordon-algodon',
    slug: 'cordon-algodon',
    name: 'Cordón de algodón',
    description:
      'Cordón de algodón suave, para buzos con capucha, cintura de jogging, asas de bolsas y empaque. Se corta por metro, y hay precio por mayor llevando la pieza.',
    categorySlug: 'cordones',
    status: 'active',
    badge: null,
    sku: null,
    material: 'Algodón',
    media: [{ url: '/images/cordon-algodon.jpg', alt: 'Cordón de algodón en tonos naturales', position: 0 }],
    variants: [
      {
        id: 'v-cordalg-std',
        label: '',
        axis: null,
        available: true,
        formats: [
          porMedida('f-cordalg-m', 31),
          {
            id: 'f-cordalg-pieza',
            tier: 'mayor',
            label: 'Pieza cerrada',
            unit: 'm',
            // Alejandra pasó el precio por metro por mayor ($ 17,60) pero no
            // cuántos metros trae la pieza. Sin ese dato NO se puede publicar un
            // total: se muestra el precio por metro y se coordina la medida.
            contentQty: null,
            priceUyu: null,
            unitPriceUyu: 17.6,
            available: true,
            minQty: 1,
          },
        ],
      },
    ],
    colors: [byId('col-tostado'), byId('col-crudo'), byId('col-beige'), byId('col-blanco')],
    sortOrder: 6,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Cuántos metros trae la pieza cerrada (falta el dato para publicar el total)'],
  },
  {
    id: 'p-cordon-calzado-estandar',
    slug: 'cordon-calzado-estandar',
    name: 'Cordón estándar para calzado',
    description:
      'Cordón clásico para calzado de 110 cm, en la gama de colores tradicionales que más se pide. El par.',
    categorySlug: 'cordones',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    media: [
      { url: '/images/cordon-calzado-estandar.jpg', alt: 'Cordones para calzado en colores clásicos', position: 0 },
      { url: '/images/cordon-calzado-estandar-2.jpg', alt: 'Cordones para calzado exhibidos', position: 1 },
    ],
    variants: [
      { id: 'v-cce-tostado', label: 'Tostado', axis: 'color', available: true, formats: [unidad('f-cce-tostado-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-crudo', label: 'Crudo', axis: 'color', available: true, formats: [unidad('f-cce-crudo-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-beige', label: 'Beige', axis: 'color', available: true, formats: [unidad('f-cce-beige-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-marron', label: 'Marrón', axis: 'color', available: true, formats: [unidad('f-cce-marron-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-negro', label: 'Negro', axis: 'color', available: true, formats: [unidad('f-cce-negro-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-blanco', label: 'Blanco', axis: 'color', available: true, formats: [unidad('f-cce-blanco-u', 86, 'Par · 110 cm')] },
      { id: 'v-cce-jaspeado', label: 'Jaspeado', axis: 'color', available: true, formats: [unidad('f-cce-jaspeado-u', 86, 'Par · 110 cm')] },
    ],
    colors: [],
    sortOrder: 7,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Si el precio es por par o por cordón suelto'],
  },
  {
    id: 'p-cordon-calzado-lurex',
    slug: 'cordon-calzado-lurex',
    name: 'Cordón para calzado con lúrex',
    description:
      'Cordón de 120 cm con hilo de lúrex entrelazado, para zapatillas de fiesta y vestuario. En plateado y dorado.',
    categorySlug: 'cordones',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    media: [{ url: '/images/cordon-calzado-lurex.jpg', alt: 'Cordones para calzado con lúrex dorado y plateado', position: 0 }],
    variants: [
      { id: 'v-ccl-plateado', label: 'Plateado', axis: 'color', available: true, formats: [unidad('f-ccl-plateado-u', 86, 'Par · 120 cm')] },
      { id: 'v-ccl-dorado', label: 'Dorado', axis: 'color', available: true, formats: [unidad('f-ccl-dorado-u', 86, 'Par · 120 cm')] },
    ],
    colors: [],
    sortOrder: 8,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Si el precio es por par o por cordón suelto'],
  },

  // ── Herramientas de costura ───────────────────────────────────────────────
  {
    id: 'p-alfiletero-pulsera-imantada',
    slug: 'alfiletero-pulsera-imantada',
    name: 'Alfiletero pulsera imantado',
    description:
      'Brazalete con placa magnética: los alfileres se quedan pegados en la muñeca mientras armás. Se ajusta con elástico y evita el clásico alfiler perdido en el piso.',
    categorySlug: 'herramientas-de-costura',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-alf-pulsera-u', 398)]),
    colors: [],
    sortOrder: 9,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-alfiletero-imantado-mesa',
    slug: 'alfiletero-imantado-mesa',
    name: 'Alfiletero imantado de mesa',
    description:
      'Base magnética para agujas y alfileres, para dejar al lado de la máquina. Junta lo que se cae con solo pasarla por encima.',
    categorySlug: 'herramientas-de-costura',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-alf-mesa-u', 198)]),
    colors: [],
    sortOrder: 10,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-pinza-para-tela',
    slug: 'pinza-para-tela',
    name: 'Pinza para tela',
    description:
      'Pinzas de alta presión para sujetar dobleces, ruedos y capas de tela sin marcar ni perforar. Reemplazan al alfiler en cuero, encerado y telas gruesas. En tres medidas.',
    categorySlug: 'herramientas-de-costura',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: [
      { id: 'v-pinza-25', label: '2,5 cm', axis: 'medida', available: true, formats: [unidad('f-pinza-25-u', 20)] },
      { id: 'v-pinza-3', label: '3 cm', axis: 'medida', available: true, formats: [unidad('f-pinza-3-u', 25)] },
      { id: 'v-pinza-55', label: '5,5 cm', axis: 'medida', available: true, formats: [unidad('f-pinza-55-u', 30)] },
    ],
    colors: [],
    sortOrder: 11,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-caja-reglas-costura',
    slug: 'caja-reglas-costura',
    name: 'Caja de reglas para moldería',
    description:
      'Set profesional importado de 8 piezas para moldería y alta costura (FCS-1 / 89960): curvas de sisa, cadera, escuadra y reglas graduadas, en su caja.',
    categorySlug: 'herramientas-de-costura',
    status: 'active',
    badge: null,
    sku: 'FCS-1 / 89960',
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-reglas-u', 1990, 'Set · 8 piezas')]),
    colors: [],
    sortOrder: 12,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },

  // ── Telas y tul ───────────────────────────────────────────────────────────
  {
    id: 'p-tul-estandar-15cm',
    slug: 'tul-estandar-15cm',
    name: 'Tul liso · 15 cm',
    description:
      'Tul liso de 15 cm de ancho, en rollo corto, para decoración de mesas, arreglos, souvenirs y terminaciones.',
    categorySlug: 'telas-y-tul',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([porMedida('f-tul-std-m', 48)]),
    colors: [],
    sortOrder: 13,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Unidad de venta: se asumió por metro (podría ser el rollo entero)'],
  },
  {
    id: 'p-tul-glitter',
    slug: 'tul-glitter',
    name: 'Tul con glitter · 15 cm',
    description:
      'Tul de 15 cm con purpurina integrada que no se desprende al manipularlo. Para vestuario de fiesta, carnaval, arreglos y decoración.',
    categorySlug: 'telas-y-tul',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([porMedida('f-tul-glitter-m', 58)]),
    colors: [byId('col-dorado'), byId('col-plateado'), byId('col-blanco'), byId('col-negro'), byId('col-crudo')],
    sortOrder: 14,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Unidad de venta: se asumió por metro (podría ser el rollo entero)'],
  },

  // ── Calzado y accesorios ──────────────────────────────────────────────────
  {
    id: 'p-plantilla-multitalles',
    slug: 'plantilla-multitalles',
    name: 'Plantilla multitalle',
    description:
      'Plantilla anatómica recortable que cubre del 36 al 46: se corta por la línea del talle que va. En versión estándar y con corderito para invierno.',
    categorySlug: 'calzado-y-accesorios',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: [
      {
        id: 'v-plantilla-corderito',
        label: 'Con corderito · talles 36-46',
        axis: 'modelo',
        available: true,
        formats: [unidad('f-plantilla-corderito-u', 168, 'Par')],
      },
      {
        id: 'v-plantilla-std',
        label: 'Estándar Health/Yebei · talles 36-46',
        axis: 'modelo',
        available: true,
        formats: [unidad('f-plantilla-std-u', 168, 'Par')],
      },
    ],
    colors: [],
    sortOrder: 15,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: ['Si el precio es por par o por plantilla suelta'],
  },

  // ── Accesorios de vestimenta ──────────────────────────────────────────────
  {
    id: 'p-mono-formal-etiqueta',
    slug: 'mono-formal-etiqueta',
    name: 'Moño formal de etiqueta',
    description:
      'Moño de tela negro satinado con cierre regulable, en caja individual. Para casamientos, egresos y eventos de etiqueta. En dos tamaños.',
    categorySlug: 'accesorios-de-vestimenta',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: [
      { id: 'v-mono-chico', label: 'Chico', axis: 'medida', available: true, formats: [unidad('f-mono-chico-u', 199)] },
      { id: 'v-mono-grande', label: 'Grande', axis: 'medida', available: true, formats: [unidad('f-mono-grande-u', 242)] },
    ],
    colors: [byId('col-negro')],
    sortOrder: 16,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-tiradores-adulto',
    slug: 'tiradores-adulto',
    name: 'Tiradores elásticos para adulto',
    description:
      'Tiradores reforzados con broches metálicos y regulación en las cuatro tiras, en colores sobrios. Para uniforme, etiqueta y uso diario.',
    categorySlug: 'accesorios-de-vestimenta',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-tiradores-adulto-u', 362)]),
    colors: [byId('col-negro'), byId('col-gris'), byId('col-azul-marino'), byId('col-bordo'), byId('col-beige')],
    sortOrder: 17,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-tirador-elastico-infantil',
    slug: 'tirador-elastico-infantil',
    name: 'Tirador elástico infantil',
    description: 'Tiradores elásticos ajustables con estampas infantiles, para fiestas y actos escolares.',
    categorySlug: 'accesorios-de-vestimenta',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-tirador-infantil-u', 104.5)]),
    colors: [],
    sortOrder: 18,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-set-tirador-mono',
    slug: 'set-tirador-mono',
    name: 'Set infantil de tirador y moño',
    description: 'Tirador y moño infantiles haciendo juego, en set. Para cortejos, cumpleaños y actos.',
    categorySlug: 'accesorios-de-vestimenta',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([unidad('f-set-tirador-mono-u', 328, 'Set')]),
    colors: [],
    sortOrder: 19,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
  {
    id: 'p-boob-tape-adhesivo',
    slug: 'boob-tape-adhesivo',
    name: 'Adhesivo para la piel (boob tape)',
    description:
      'Cinta adhesiva hipoalergénica de uso corporal, para soporte y sujeción en escotes y espaldas descubiertas. Se corta por metro o se lleva la pieza de 5 m.',
    categorySlug: 'accesorios-de-vestimenta',
    status: 'active',
    badge: null,
    sku: null,
    material: null,
    // Sin foto todavía: la grilla y la ficha dibujan la ilustración de la categoría.
    media: [],
    variants: unica([
      porMedida('f-boobtape-m', 108),
      piezaTotal('f-boobtape-pieza', 'Pieza cerrada · 5 m', 5, 430),
    ]),
    colors: [],
    sortOrder: 20,
    createdAt: CREATED,
    discountPercent: 0,
    discountActive: false,
    needsReview: [],
  },
]

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
  hero_title: 'Todo lo que tu proyecto necesita, en un solo lugar.',
  hero_subtitle:
    'Cintas, hilos, cordones, herramientas y accesorios. Por mayor y por menor, con precio a la vista y envíos a todo el país.',
  hero_cta: 'Ver el catálogo',
  hero_cta_secondary: 'Comprar por mayor',

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
  instagram_followers: '47.100',
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
  generatedAt: CREATED,
  categories: CATEGORIES,
  products: PRODUCTS,
  colors: COLORS,
  discounts: DISCOUNTS,
  settings: SETTINGS,
}
