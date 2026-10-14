'use client'

import { useMemo, useRef, useState } from 'react'
import type { Catalog, Product, SaleFormat, Variant } from '@/lib/catalog/types'
import {
  formatContent,
  formatUnitPrice,
  formatUYU,
  priceFormat,
  resolveDiscountPercent,
  savingsPercent,
} from '@/lib/catalog/pricing'
import { coincide, expandirConsulta, textoDeFila } from '@/lib/search/match'
import { normalizeText } from '@/lib/media'
import { BRAND, SITE_URL } from '@/lib/env'
import { Icon } from '@/components/ui/Primitives'

// El mostrador.
//
// Esta pantalla es la respuesta directa al libro.
//
// Hoy, cuando alguien entra y pregunta «¿tenés cinta de 4 mm?», se saca un
// catálogo de papel enorme y se busca a mano. Y si preguntan por WhatsApp, se
// manda un PDF de cientos de páginas para que lo busque el cliente. Las dos
// cosas son la misma: el catálogo existe, pero no se puede consultar.
//
// Por qué es una pantalla aparte de /tienda y no la misma:
//
//   · El que la usa NO es el comprador, es quien atiende. Tiene al cliente
//     enfrente esperando, y la respuesta que necesita es «sí, $ 13 el metro»,
//     no una ficha de producto con fotos.
//   · Por eso los resultados son por VARIANTE y no por producto: la pregunta
//     nunca es «¿tenés cinta de raso?», es «¿tenés la de 4 mm?».
//   · Y por eso la acción principal es COPIAR, no comprar: quien atiende ya
//     está adentro de una conversación de WhatsApp y lo que necesita es pegar
//     la respuesta ahí, no mandar a nadie a otro lado.
//
// El teclado manda: el foco arranca en la búsqueda y no se lo saca nadie.

interface Fila {
  clave: string
  product: Product
  variant: Variant
  format: SaleFormat
  precioTexto: string
  porUnidad: string
  contenido: string | null
  mayor: boolean
  ahorro: number | null
}

/** El contenido de una presentación, si la etiqueta no lo dice ya. */
function contenidoUtil(format: SaleFormat): string | null {
  if (format.contentQty === null || format.contentQty === 1) return null
  const texto = formatContent(format.contentQty, format.unit)
  return format.label.includes(texto) ? null : texto
}

/** Aplana el catálogo a una fila por presentación: la unidad de la respuesta. */
function aplanar(catalog: Catalog): Fila[] {
  const filas: Fila[] = []

  for (const product of catalog.products) {
    if (product.status === 'draft') continue
    const descuento = resolveDiscountPercent(product, catalog.discounts)

    for (const variant of product.variants) {
      for (const format of variant.formats) {
        const precio = priceFormat(format, descuento)
        filas.push({
          clave: `${product.id}-${variant.id}-${format.id}`,
          product,
          variant,
          format,
          precioTexto: precio.finalUyu === null ? 'A confirmar' : formatUYU(precio.finalUyu),
          porUnidad: formatUnitPrice(precio.finalUnitUyu, format.unit),
          // Sólo si dice algo que la etiqueta no dice ya: casi todas las
          // etiquetas traen la medida ("Pieza cerrada · 100 m"), y concatenar
          // a ciegas producía "Pieza cerrada · 100 m · 100 m".
          contenido: contenidoUtil(format),
          mayor: format.tier === 'mayor',
          ahorro: format.tier === 'mayor' ? savingsPercent(format, variant) : null,
        })
      }
    }
  }

  return filas
}

/**
 * El texto de TODOS los resultados de una búsqueda.
 *
 * Es la respuesta directa al PDF de 720 páginas. Cuando alguien pregunta por
 * WhatsApp "¿tenés cinta de raso?", hoy se le manda el catálogo entero para que
 * lo busque él. Con esto se le mandan las siete líneas que le sirven y un enlace
 * por si quiere ver el resto — que es lo que la persona pidió en realidad.
 *
 * El enlace lleva la búsqueda adentro (/tienda?q=…), así que el cliente abre
 * exactamente lo mismo que quien atiende tiene en pantalla.
 */
function textoDeResultados(filas: Fila[], consulta: string): string {
  const lineas = filas.map((f) => {
    const nombre = [f.product.name, f.variant.label].filter(Boolean).join(' · ')
    const cont = f.contenido ? ` (${f.contenido})` : ''
    return `• ${nombre} — ${f.format.label}${cont}: ${f.precioTexto}`
  })

  return [
    lineas.join('\n'),
    '',
    `Ver con fotos: ${SITE_URL}/tienda?q=${encodeURIComponent(consulta.trim())}`,
  ].join('\n')
}

/**
 * El texto que se pega en el chat.
 *
 * Sale de los mismos datos que la ficha y el carrito: si alguna vez dicen
 * números distintos, el problema no es de esta pantalla.
 */
function textoParaChat(f: Fila): string {
  const nombre = [f.product.name, f.variant.label].filter(Boolean).join(' · ')
  const linea = f.contenido
    ? `${f.format.label} (${f.contenido}): ${f.precioTexto} — ${f.porUnidad}`
    : `${f.format.label}: ${f.precioTexto}`

  return [
    nombre,
    linea,
    f.product.sku ? `Código ${f.product.sku}` : null,
    `${SITE_URL}/tienda/${f.product.slug}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export default function MostradorClient({ catalog }: { catalog: Catalog }) {
  const [consulta, setConsulta] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)
  const [lista, setLista] = useState<Fila[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const todas = useMemo(() => aplanar(catalog), [catalog])
  const nombreCategoria = useMemo(
    () => new Map(catalog.categories.map((c) => [c.slug, c.name])),
    [catalog.categories]
  )

  const resultados = useMemo(() => {
    const q = consulta.trim()
    if (q.length < 2) return []

    const tokens = expandirConsulta(q)
    if (tokens.length === 0) return []
    const qn = normalizeText(q)

    const encontradas = todas.filter((f) => {
      // El código va aparte y primero: es el atajo de quien atiende, y no
      // pasa por el diccionario de sinónimos ni por el troceo en palabras.
      if (f.product.sku && normalizeText(f.product.sku).includes(qn)) return true

      // Contra ESTA fila, no contra el producto entero: la diferencia entre
      // contestar «la de 4 mm sale $ 13» y tirarle los catorce anchos encima.
      const texto = textoDeFila(
        f.product,
        f.variant.label,
        f.format.label,
        nombreCategoria.get(f.product.categorySlug)
      )
      return coincide(texto, tokens)
    })

    // Una respuesta de mostrador se lee de arriba: primero lo suelto, que es
    // lo que se pregunta el 90% de las veces, y debajo la pieza cerrada.
    return encontradas
      .sort((a, b) => {
        if (a.product.sortOrder !== b.product.sortOrder) {
          return a.product.sortOrder - b.product.sortOrder
        }
        if (a.mayor !== b.mayor) return a.mayor ? 1 : -1
        return 0
      })
      .slice(0, 40)
  }, [consulta, todas, nombreCategoria])

  const copiar = async (f: Fila) => {
    const texto = textoParaChat(f)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(f.clave)
      setTimeout(() => setCopiado(null), 1800)
    } catch {
      // Sin portapapeles (WebView vieja, http) se cae al truco del textarea.
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      setCopiado(f.clave)
      setTimeout(() => setCopiado(null), 1800)
    }
    inputRef.current?.focus()
  }

  const copiarResultados = async () => {
    // Se manda un tope: veinte líneas en un chat todavía se leen; cuarenta,
    // no. Pasado ese punto el enlace sirve más que la lista.
    const texto = textoDeResultados(resultados.slice(0, 20), consulta)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado('resultados')
      setTimeout(() => setCopiado(null), 1800)
    } catch {
      /* sin portapapeles; los resultados quedan a la vista igual */
    }
    inputRef.current?.focus()
  }

  const agregar = (f: Fila) => {
    setLista((prev) => (prev.some((x) => x.clave === f.clave) ? prev : [...prev, f]))
    inputRef.current?.focus()
  }

  const quitar = (clave: string) => setLista((prev) => prev.filter((x) => x.clave !== clave))

  const textoDeLista = useMemo(() => {
    if (lista.length === 0) return ''
    return [
      `${BRAND.name} — ${BRAND.street}`,
      '',
      ...lista.map((f) => {
        const nombre = [f.product.name, f.variant.label].filter(Boolean).join(' · ')
        return `• ${nombre}\n  ${f.format.label}${f.contenido ? ` (${f.contenido})` : ''}: ${f.precioTexto}`
      }),
      '',
      `Consultas al ${BRAND.phoneDisplay}.`,
    ].join('\n')
  }, [lista])

  const copiarLista = async () => {
    try {
      await navigator.clipboard.writeText(textoDeLista)
      setCopiado('lista')
      setTimeout(() => setCopiado(null), 1800)
    } catch {
      /* mismo caso que arriba; la lista queda a la vista igual */
    }
  }

  return (
    <div className="most">
      <header className="most-top">
        <div className="most-marca">
          <span>{BRAND.shortName}</span>
          <strong>Mostrador</strong>
        </div>
        <p>
          {todas.length} precios cargados. Buscá por código, nombre o medida.
        </p>
      </header>

      <div className="most-buscador">
        <Icon name="magnifying-glass" size={26} />
        <input
          ref={inputRef}
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="4 mm · raso · FCS-1 · gross 15"
          aria-label="Buscar en el catálogo"
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
        />
        {consulta && (
          <button type="button" onClick={() => { setConsulta(''); inputRef.current?.focus() }} aria-label="Borrar la búsqueda">
            <Icon name="x" size={20} />
          </button>
        )}
      </div>

      {consulta.trim().length >= 2 && (
        <div className="most-barra">
          <p className="most-conteo" aria-live="polite">
            {resultados.length === 0
              ? 'Nada con eso'
              : `${resultados.length}${resultados.length === 40 ? '+' : ''} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}
          </p>
          {/* Mandar los resultados en vez del catálogo entero. */}
          {resultados.length > 1 && (
            <button type="button" className="most-copiar-todo" onClick={copiarResultados}>
              <Icon name={copiado === 'resultados' ? 'check' : 'chat-text'} size={16} />
              {copiado === 'resultados'
                ? 'Copiados'
                : `Copiar ${Math.min(resultados.length, 20)} para el chat`}
            </button>
          )}
        </div>
      )}

      {resultados.length > 0 && (
        <ul className="most-lista">
          {resultados.map((f) => (
            <li key={f.clave} data-mayor={f.mayor || undefined}>
              <div className="most-info">
                <strong>
                  {f.product.name}
                  {f.variant.label && <em> · {f.variant.label}</em>}
                </strong>
                <span className="most-pres">
                  {f.format.label}
                  {f.contenido && ` · ${f.contenido}`}
                  {f.mayor && <b className="most-tag">por mayor</b>}
                  {f.product.sku && <b className="most-cod">{f.product.sku}</b>}
                </span>
              </div>

              <div className="most-precio">
                <b>{f.precioTexto}</b>
                <span>{f.porUnidad}</span>
                {f.ahorro !== null && f.ahorro > 0 && <i>−{f.ahorro}%</i>}
              </div>

              <div className="most-acciones">
                <button type="button" onClick={() => copiar(f)} title="Copiar para pegar en el chat">
                  <Icon name={copiado === f.clave ? 'check' : 'chat-text'} size={18} />
                  <span className="sr-only">Copiar para el chat</span>
                </button>
                <button type="button" onClick={() => agregar(f)} title="Agregar a la lista">
                  <Icon name="plus" size={18} />
                  <span className="sr-only">Agregar a la lista</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {consulta.trim().length < 2 && lista.length === 0 && (
        <div className="most-vacio">
          <p>
            Escribí lo que te están preguntando. Sirve el código del catálogo, el nombre, el
            ancho o las tres cosas juntas.
          </p>
          <div className="most-ejemplos">
            {['4 mm', 'gross 15', 'hilo encerado', 'piolín', 'FCS-1'].map((e) => (
              <button key={e} type="button" onClick={() => { setConsulta(e); inputRef.current?.focus() }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* La lista: convierte varias consultas sueltas en un presupuesto. */}
      {lista.length > 0 && (
        <section className="most-armado" aria-label="Lista armada">
          <header>
            <h2>
              La lista <span>{lista.length}</span>
            </h2>
            <div>
              <button type="button" onClick={copiarLista} className="most-copiar-lista">
                <Icon name={copiado === 'lista' ? 'check' : 'chat-text'} size={17} />
                {copiado === 'lista' ? 'Copiada' : 'Copiar la lista'}
              </button>
              <button type="button" onClick={() => setLista([])} className="most-vaciar">
                Vaciar
              </button>
            </div>
          </header>
          <ul>
            {lista.map((f) => (
              <li key={f.clave}>
                <span>
                  {f.product.name}
                  {f.variant.label && ` · ${f.variant.label}`} — {f.format.label}
                </span>
                <b>{f.precioTexto}</b>
                <button type="button" onClick={() => quitar(f.clave)} aria-label={`Quitar ${f.product.name}`}>
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
