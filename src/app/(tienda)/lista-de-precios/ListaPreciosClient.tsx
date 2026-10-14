'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCatalog } from '@/components/CatalogProvider'
import type { Category, Product, SaleFormat, Variant } from '@/lib/catalog/types'
import {
  formatContent,
  formatUnitPrice,
  formatUYU,
  priceFormat,
  resolveDiscountPercent,
  savingsPercent,
} from '@/lib/catalog/pricing'
import { BRAND } from '@/lib/env'
import { Button, Icon } from '@/components/ui/Primitives'

// Lista de precios para imprimir.
//
// Por qué existe: el catálogo de Avíos EXISTE en papel — de ahí salieron todos
// los datos de src/lib/catalog/data.ts. Alejandra ya tiene el hábito y sus
// clientas ya tienen el reflejo de pedir "pasame la lista". Lo que no tiene es
// una lista que se actualice sola.
//
// Esta página es la misma información del sitio ordenada para una hoja A4: se
// imprime, se manda por WhatsApp como PDF, se pega en el mostrador. Y sale del
// MISMO catálogo que la tienda, así que un precio cambiado en el panel cambia
// acá — no hay una segunda lista que se olvide de actualizar. Ese desfasaje
// entre la lista impresa y lo que se cobra es el problema real que resuelve.
//
// La fecha del encabezado sale de `generatedAt`, que el panel sella en cada
// edición: una lista impresa sin fecha no se puede auditar.

type Vista = 'todo' | 'mayor'

interface Fila {
  clave: string
  /** Nombre del artículo. Vacío en las filas 2..n del mismo producto. */
  articulo: string
  variante: string
  presentacion: string
  precio: string
  porUnidad: string
  mayor: boolean
  ahorro: number | null
  sku: string | null
  aConfirmar: boolean
}

function filasDe(product: Product, discountPercent: number, vista: Vista): Fila[] {
  const filas: Fila[] = []

  for (const variant of product.variants) {
    for (const format of variant.formats) {
      if (vista === 'mayor' && format.tier !== 'mayor') continue
      filas.push(filaDe(product, variant, format, discountPercent))
    }
  }

  // El nombre del artículo se escribe una sola vez por bloque: en una lista
  // impresa, repetir "Cinta de raso doble faz" quince veces es ruido que hace
  // más difícil encontrar la fila, no más fácil.
  return filas.map((f, i) => (i === 0 ? f : { ...f, articulo: '' }))
}

function filaDe(
  product: Product,
  variant: Variant,
  format: SaleFormat,
  discountPercent: number
): Fila {
  const precio = priceFormat(format, discountPercent)

  // El contenido se agrega SÓLO cuando dice algo que la etiqueta no dice ya.
  // Casi todas las etiquetas lo traen ("Pieza cerrada · 100 m", "Rollito · 10 m"),
  // así que concatenar a ciegas producía "Pieza cerrada · 100 m · 100 m" y
  // "Por metro · 1 m", que es ruido en una lista que se lee en diagonal.
  const contenido =
    format.contentQty === null || format.contentQty === 1
      ? null
      : formatContent(format.contentQty, format.unit)
  const yaLoDice = contenido !== null && format.label.includes(contenido)

  return {
    clave: `${variant.id}-${format.id}`,
    articulo: product.name,
    variante: variant.label,
    presentacion: contenido && !yaLoDice ? `${format.label} · ${contenido}` : format.label,
    // Sin medida de pieza no hay total publicable. Se dice, no se inventa.
    precio: precio.finalUyu === null ? 'A confirmar' : formatUYU(precio.finalUyu),
    porUnidad: formatUnitPrice(precio.finalUnitUyu, format.unit),
    mayor: format.tier === 'mayor',
    ahorro: format.tier === 'mayor' ? savingsPercent(format, variant) : null,
    sku: product.sku,
    aConfirmar: precio.finalUyu === null,
  }
}

export default function ListaPreciosClient({ products: serverProducts }: { products: Product[] }) {
  // Los productos vienen de esta página y no del marco: la lista es la única
  // pantalla pública que necesita todas las presentaciones de todo el catálogo.
  // Si el catálogo se editó en el panel (demo), manda lo editado.
  const { overlay, categories, discounts, settings, generatedAt } = useCatalog()
  const products = overlay ? overlay.products : serverProducts
  const [vista, setVista] = useState<Vista>('todo')

  const bloques = useMemo(() => {
    const activos = products
      .filter((p) => p.status !== 'draft')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    return categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((categoria: Category) => {
        const deLaCategoria = activos.filter((p) => p.categorySlug === categoria.slug)
        const items = deLaCategoria
          .map((product) => ({
            product,
            filas: filasDe(product, resolveDiscountPercent(product, discounts), vista),
          }))
          .filter((x) => x.filas.length > 0)
        return { categoria, items }
      })
      .filter((b) => b.items.length > 0)
  }, [products, categories, discounts, vista])

  const totalFilas = bloques.reduce(
    (n, b) => n + b.items.reduce((m, i) => m + i.filas.length, 0),
    0
  )

  const fecha = useMemo(() => {
    const d = new Date(generatedAt)
    if (Number.isNaN(d.getTime())) return null
    // En UTC a propósito: la fecha del catálogo se guarda a medianoche UTC, y
    // Montevideo está tres horas atrás, así que formatear en horario local la
    // corría un día para atrás. Una lista de precios fechada el día equivocado
    // hace dudar de todo lo demás que dice.
    return d.toLocaleDateString('es-UY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }, [generatedAt])

  const whatsapp = settings.contact_whatsapp_url || BRAND.whatsappUrl

  return (
    <div className="lista">
      {/* Barra de herramientas: no se imprime. */}
      <div className="lista-tools no-print">
        <div className="lista-tools-group" role="group" aria-label="Qué precios mostrar">
          <button
            type="button"
            data-active={vista === 'todo'}
            onClick={() => setVista('todo')}
          >
            Todos los precios
          </button>
          <button
            type="button"
            data-active={vista === 'mayor'}
            onClick={() => setVista('mayor')}
          >
            Sólo por mayor
          </button>
        </div>

        <div className="lista-tools-right">
          <span>
            {totalFilas} {totalFilas === 1 ? 'precio' : 'precios'}
          </span>
          <Button variant="primary" onClick={() => window.print()}>
            <Icon name="printer" size={18} /> Imprimir o guardar en PDF
          </Button>
        </div>
      </div>

      <p className="lista-hint no-print">
        Se imprime en hoja A4 y queda igual guardándola como PDF, para mandarla por WhatsApp.
        Sale del mismo catálogo que la tienda: si cambia un precio acá adentro, cambia en la
        lista.
      </p>

      {/* ── La hoja ─────────────────────────────────────────────────────── */}

      <div className="hoja">
        <header className="hoja-cabecera">
          <div className="hoja-marca">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/web-app-manifest-192x192.png" alt="" width={54} height={54} />
            <div>
              <strong>{BRAND.name}</strong>
              <span>Mercería por mayor y por menor</span>
            </div>
          </div>

          <div className="hoja-datos">
            <span>{BRAND.street}, {BRAND.city}</span>
            <span>WhatsApp {BRAND.phoneDisplay}</span>
            <span>{BRAND.instagram}</span>
          </div>
        </header>

        <div className="hoja-titulo">
          <h1>Lista de precios{vista === 'mayor' ? ' por mayor' : ''}</h1>
          {fecha && <p>Precios al {fecha}. Sujetos a cambio sin previo aviso.</p>}
        </div>

        {/*
          Índice de categorías.

          Con el catálogo completo esta hoja son varias páginas y decenas de
          bloques: sin índice, encontrar "Hilos" es scrollear hasta dar con él.
          Impreso funciona como tabla de contenidos, que es lo que uno espera de
          una lista de precios en papel; en pantalla, como salto rápido.
        */}
        {bloques.length > 3 && (
          <nav className="hoja-indice" aria-label="Categorías de la lista">
            {bloques.map(({ categoria, items }) => (
              <a key={categoria.id} href={`#lista-${categoria.slug}`}>
                {categoria.name}
                <span>{items.reduce((n, i) => n + i.filas.length, 0)}</span>
              </a>
            ))}
          </nav>
        )}

        {bloques.map(({ categoria, items }) => (
          <section key={categoria.id} id={`lista-${categoria.slug}`} className="hoja-bloque">
            <h2>{categoria.name}</h2>

            <table className="hoja-tabla">
              <thead>
                <tr>
                  <th scope="col">Artículo</th>
                  <th scope="col">Medida / color</th>
                  <th scope="col">Presentación</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col" className="num">Por unidad</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ product, filas }) =>
                  filas.map((f) => (
                    <tr key={`${product.id}-${f.clave}`} data-mayor={f.mayor || undefined}>
                      <th scope="row">
                        {f.articulo}
                        {f.articulo && f.sku && <span className="hoja-sku">{f.sku}</span>}
                      </th>
                      <td>{f.variante || '—'}</td>
                      <td>
                        {f.presentacion}
                        {f.mayor && <span className="hoja-tag">por mayor</span>}
                      </td>
                      <td className="num" data-confirmar={f.aConfirmar || undefined}>
                        {f.precio}
                      </td>
                      <td className="num">
                        {f.porUnidad}
                        {f.ahorro !== null && f.ahorro > 0 && (
                          <span className="hoja-ahorro">−{f.ahorro}%</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="hoja-pie">
          <p>
            <strong>Cómo pedir.</strong> Por WhatsApp al {BRAND.phoneDisplay}, o pasando por el
            local en {BRAND.street}. {BRAND.hoursDisplay.join('. ')}.
          </p>
          <p>
            <strong>Por mayor.</strong> El precio por mayor no necesita registro ni lista aparte:
            va con la presentación cerrada. Llevás la pieza y pagás el precio de la pieza.
          </p>
          <p className="hoja-pie-fina">
            Los precios marcados «a confirmar» son presentaciones cuya medida todavía no está
            cerrada: se cotizan por WhatsApp.
          </p>
        </footer>
      </div>

      <div className="lista-cierre no-print">
        <p>¿Necesitás algo que no está en la lista?</p>
        <div className="lista-cierre-acciones">
          <Button href={whatsapp} variant="whatsapp" size="lg">
            <Icon name="whatsapp-logo" weight="fill" size={19} /> Preguntar por WhatsApp
          </Button>
          <Link href="/tienda" className="lista-cierre-link">
            Ver el catálogo con fotos
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
