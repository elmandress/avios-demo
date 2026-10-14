'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { armarPublicacion, type FormatoPublicacion } from '@/lib/admin/publicacion'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { BRAND } from '@/lib/env'
import { Button, Icon } from '@/components/ui/Primitives'

// Publicar.
//
// Todo lo demás del panel administra el SITIO; esto administra los CANALES por
// donde entra la gente. Es la sección que se usa varias veces por semana,
// mientras que "Categorías" se toca una vez por año.
//
// Los dos canales que importan acá son distintos entre sí:
//
//   · Instagram trae a quien ya sigue a Avíos y a quien llega por una amiga.
//   · La ficha de Google trae a quien busca "mercería centro Montevideo" y no
//     sabe que Avíos existe. Para un local a la calle esa es la puerta más
//     ancha, y publicar seguido en la ficha es de las pocas señales de ranking
//     que la dueña puede mover a voluntad.
//
// El texto se genera y queda EDITABLE: la voz es de Alejandra, no del sitio.
// Lo que aporta el panel son los datos que hay que ir a buscar —el precio por
// metro, cuánto sale la pieza, cuánto se ahorra, la dirección, el horario— y
// que se equivocan justo cuando se escriben apurado.

export default function PanelPublicar() {
  const { catalog } = useAdminCatalog()
  const publicables = useMemo(
    () => [...catalog.products].sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog.products]
  )

  const [productId, setProductId] = useState<string | null>(null)
  const [formato, setFormato] = useState<FormatoPublicacion>('feed')
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)

  const product = publicables.find((p) => p.id === productId) ?? publicables[0] ?? null
  const categoria = catalog.categories.find((c) => c.slug === product?.categorySlug)

  const generado = useMemo(
    () => (product ? armarPublicacion(product, categoria, catalog.discounts, formato) : null),
    [product, categoria, catalog.discounts, formato]
  )

  // El texto generado se vuelca al editor cuando cambia el artículo o el
  // formato. Si se edita a mano, se respeta hasta el próximo cambio.
  //
  // Va en el render y no en un efecto: es el patrón que documenta React para
  // ajustar estado cuando cambia una entrada. Con un efecto, al cambiar de
  // artículo se pintaba una vez el texto del artículo anterior.
  const [ultimoGenerado, setUltimoGenerado] = useState<string | null>(null)
  if (generado && generado.texto !== ultimoGenerado) {
    setUltimoGenerado(generado.texto)
    setTexto(generado.texto)
    setCopiado(false)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      // Sin permiso de portapapeles: se selecciona para copiar a mano.
      const area = document.getElementById('texto-publicacion') as HTMLTextAreaElement | null
      area?.select()
    }
  }

  if (!product) {
    return (
      <>
        <header className="panel-header">
          <h1>Publicar</h1>
        </header>
        <p className="panel-empty">
          No hay artículos cargados todavía. <Link href="/panel/productos/nuevo">Cargá el primero</Link>.
        </p>
      </>
    )
  }

  const foto = product.media[0]

  return (
    <>
      <header className="panel-header">
        <h1>Publicar</h1>
        <p>
          Elegí el artículo y llevate el texto con los precios ya puestos, para Instagram o para tu
          ficha de Google. Salen del catálogo, así que no pueden quedar viejos.
        </p>
      </header>

      <div className="pub">
        {/* Elegir el artículo */}
        <div className="pub-col">
          <label className="pub-label" htmlFor="pub-articulo">
            Artículo
          </label>
          <select
            id="pub-articulo"
            className="pub-select"
            value={product.id}
            onChange={(e) => setProductId(e.target.value)}
          >
            {catalog.categories.map((c) => {
              const deLaCat = publicables.filter((p) => p.categorySlug === c.slug)
              if (deLaCat.length === 0) return null
              return (
                <optgroup key={c.id} label={c.name}>
                  {deLaCat.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.media.length === 0 ? ' (sin foto)' : ''}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>

          <fieldset className="pub-formato">
            <legend className="pub-label">Dónde va</legend>
            <label>
              <input
                type="radio"
                name="formato"
                checked={formato === 'feed'}
                onChange={() => setFormato('feed')}
              />
              <span>
                <strong>Publicación</strong>
                <small>Texto completo, con medidas y etiquetas.</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="formato"
                checked={formato === 'historia'}
                onChange={() => setFormato('historia')}
              />
              <span>
                <strong>Historia de Instagram</strong>
                <small>Tres líneas: qué es, cuánto sale, dónde estamos.</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="formato"
                checked={formato === 'google'}
                onChange={() => setFormato('google')}
              />
              <span>
                <strong>Ficha de Google</strong>
                <small>Sin etiquetas y más corto. Es lo que más te acerca gente del barrio.</small>
              </span>
            </label>
          </fieldset>

          {/* La foto: lo único que el panel no puede poner. */}
          <div className="pub-foto">
            {foto ? (
              <Image
                src={foto.url}
                alt={foto.alt ?? product.name}
                width={160}
                height={160}
                style={{ objectFit: 'cover', borderRadius: 10 }}
              />
            ) : (
              <div className="pub-foto-vacia">
                <ProductPlaceholder categorySlug={product.categorySlug} label={product.name} />
              </div>
            )}
            <p>
              {foto
                ? 'Esta es la foto que está en el sitio. Para Instagram conviene una tomada de frente y con luz de día.'
                : 'Este artículo no tiene foto en el sitio. Sacale una y cargala desde la ficha: la publicación la necesita, y la ficha también.'}
            </p>
            <Link href={`/panel/productos/${product.id}`} className="pub-link">
              Editar la ficha
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>

        {/* El texto */}
        <div className="pub-col pub-col-ancha">
          <div className="pub-editor-top">
            <label className="pub-label" htmlFor="texto-publicacion">
              Texto para copiar
            </label>
            <span className="pub-contador">
              {texto.length} caracteres
              {formato === 'google'
                ? texto.length > 1500 && ' · Google corta en 1.500'
                : texto.length > 2200 && ' · Instagram corta en 2.200'}
            </span>
          </div>

          <textarea
            id="texto-publicacion"
            className="pub-textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={formato === 'feed' ? 20 : 10}
            spellCheck
          />

          <div className="pub-acciones">
            <Button variant="primary" onClick={copiar}>
              <Icon name={copiado ? 'check' : 'share-network'} size={17} />
              {copiado ? 'Copiado' : 'Copiar el texto'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setTexto(generado?.texto ?? '')
                setCopiado(false)
              }}
              disabled={texto === generado?.texto}
            >
              <Icon name="arrow-clockwise" size={16} />
              Volver al original
            </Button>
            {formato === 'google' ? (
              <Button href="https://business.google.com/posts" variant="ghost">
                Abrir mi ficha de Google
                <Icon name="arrow-right" size={15} />
              </Button>
            ) : (
              <Button href={BRAND.instagramUrl} variant="ghost">
                Abrir Instagram
                <Icon name="arrow-right" size={15} />
              </Button>
            )}
          </div>

          {generado && generado.avisos.length > 0 && (
            <div className="pub-avisos" role="note">
              <strong>
                <Icon name="warning" size={16} /> Antes de publicar
              </strong>
              <ul>
                {generado.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="panel-note">
            <Icon name="info" size={17} />
            <span>
              El texto se copia al portapapeles y se pega donde va: el panel no publica solo, y es a
              propósito. Lo que ahorra es tener que ir a buscar cada precio y no equivocarse
              al copiarlo — el resto lo decidís vos.
            </span>
          </p>
        </div>
      </div>
    </>
  )
}
