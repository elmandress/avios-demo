import { normalizeText } from '@/lib/media'
import type { Product } from './types'

export const FAMILIAS = [
  {
    nombre: 'Cintas y pasamanería',
    categorias: [
      'cintas',
      'galones-flecos-y-borlas',
      'puntillas-y-encajes',
      'sesgos',
      'cordones-y-tientos',
    ],
  },
  {
    nombre: 'Costura',
    categorias: [
      'elasticos',
      'broches-herrajes-y-velcro',
      'agujas-y-alfileres',
      'tijeras-y-corte',
      'herramientas-de-costura',
      'maquina-de-coser',
      'telas-y-entretelas',
    ],
  },
  {
    nombre: 'Tejido y bordado',
    categorias: ['hilos-y-lanas', 'tejido-y-bordado'],
  },
  {
    nombre: 'Brillos y decoración',
    categorias: [
      'lentejuelas-strass-y-perlas',
      'apliques-y-escudos',
      'cortineria',
    ],
  },
  {
    nombre: 'Manualidades',
    categorias: ['manualidades', 'flores-artificiales'],
  },
  {
    nombre: 'Complementos',
    categorias: [
      'lenceria-y-corseteria',
      'accesorios-para-el-cabello',
      'accesorios-de-vestimenta',
    ],
  },
]

// Primera regla que coincide. Nunca inferir composición ni uso desde una foto.
export function subcategoria(
  product: Pick<Product, 'name' | 'categorySlug'>,
): string {
  if (product.categorySlug !== 'galones-flecos-y-borlas') return ''
  const n = normalizeText(product.name)
  for (const [regla, nombre] of [
    [/^fleco/, 'Flecos'],
    [/^borla/, 'Borlas'],
    [/pluma|marabu|boa /, 'Plumas y boas'],
    [/strass|piedra|cristal/, 'Con strass y piedras'],
    [/pompon/, 'De pompón'],
    [/bordad|canutillo|mostacilla/, 'Bordados'],
    [/pegar|adhesiv/, 'Para pegar'],
  ] as const)
    if (regla.test(n)) return nombre
  return 'Otros galones'
}

export function facetasDe(product: Product) {
  return {
    tipo: subcategoria(product),
    eje: [
      ...new Set(product.variants.flatMap((v) => (v.axis ? [v.axis] : []))),
    ],
    presentacion: [
      ...new Set(
        product.variants.flatMap((v) =>
          v.formats.map((f) =>
            /paquete/i.test(f.label)
              ? 'Paquete'
              : f.tier === 'mayor'
                ? 'Pieza o presentación cerrada'
                : f.unit === 'm'
                  ? 'Por metro'
                  : f.unit === 'yd'
                    ? 'Por yarda'
                    : 'Por unidad',
          ),
        ),
      ),
    ],
  }
}
