'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { BRAND, SITE_URL } from '@/lib/env'
import { Button, Icon } from '@/components/ui/Primitives'

// Conexiones.
//
// El sitio no es una isla. Para un local a la calle en el centro de Montevideo,
// la mayor parte de la gente nueva no llega escribiendo la dirección del sitio:
// llega buscando "mercería centro" en el mapa, o entrando desde Instagram.
//
// Esta pantalla existe para que eso no quede en una conversación que se olvida.
// Está ordenada por lo que MÁS mueve la aguja para este negocio en particular,
// no por lo que es más fácil de configurar ni por lo que suena mejor.
//
// El orden sale de dos cosas: cómo se reparte el peso en la búsqueda local (la
// cercanía y las señales de la ficha de Google pesan mucho más que el sitio), y
// por dónde vende Avíos hoy (WhatsApp e Instagram).
//
// Regla de esta pantalla: donde algo NO sirve, lo dice. Ver Merchant Center.

interface Paso {
  id: string
  titulo: string
  quePasa: string
  porQue: string
  comoSeHace: string[]
  /** Un dato para copiar, si el paso lo necesita. */
  copiar?: { etiqueta: string; valor: string }
  enlace?: { texto: string; href: string }
  /** Cuánto mueve la aguja para ESTE negocio. */
  peso: 'alto' | 'medio' | 'bajo'
  /** Cuando la expectativa hay que bajarla, se baja acá. */
  reserva?: string
}

export default function PanelConexiones() {
  const { catalog } = useAdminCatalog()
  const [copiado, setCopiado] = useState<string | null>(null)

  const sinFoto = catalog.products.filter((p) => p.media.length === 0).length
  const conFoto = catalog.products.length - sinFoto

  const copiar = async (id: string, valor: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2200)
    } catch {
      // Sin portapapeles el valor igual está a la vista para copiarlo a mano.
    }
  }

  const PASOS: Paso[] = [
    {
      id: 'gbp',
      titulo: 'La ficha de Google del local',
      quePasa:
        'Es el cuadro que sale a la derecha al buscar «Mercería Avíos», y el punto en el mapa al buscar «mercería centro Montevideo».',
      porQue:
        'Para un negocio con local a la calle es la puerta más ancha que hay, y por lejos. Quien busca una mercería cerca no busca marcas: busca la que le queda a mano. La ficha decide si Avíos es esa.',
      comoSeHace: [
        'Reclamar la ficha en google.com/business con la cuenta de Google del negocio.',
        'Poner «Mercería» como categoría principal. La categoría equivocada es de las causas más comunes de no aparecer.',
        'Cargar fotos del local, del mostrador y de las paredes de cintas. Muchas, y sumar de a poco: las fichas con muchas fotos rinden más que las que tienen sólo el logo.',
        'Publicar dos veces por semana. El panel arma el texto: Publicar → Ficha de Google.',
        'Contestar todas las reseñas, también las buenas.',
      ],
      enlace: { texto: 'Abrir Google Business', href: 'https://business.google.com/' },
      peso: 'alto',
    },
    {
      id: 'meta',
      titulo: 'El catálogo de WhatsApp e Instagram',
      quePasa:
        'WhatsApp Business puede mostrar un catálogo con foto y precio dentro del chat. La tienda de Instagram sale del mismo lugar.',
      porQue:
        'Avíos ya vende por WhatsApp. Hoy ese catálogo, si existe, se carga a mano desde el teléfono uno por uno — con este catálogo eso no se termina nunca, y lo que se cargue queda viejo a la primera lista de precios nueva. Conectado a esta dirección, se actualiza solo todos los días.',
      comoSeHace: [
        'Entrar a Meta Commerce Manager y crear un catálogo de tipo «Comercio electrónico».',
        'Agregar artículos → Fuente de datos → Feed programado.',
        'Pegar la dirección de acá abajo y elegir actualización diaria.',
        'Conectar el catálogo a la cuenta de WhatsApp Business y a la de Instagram.',
      ],
      copiar: { etiqueta: 'Dirección del catálogo', valor: `${SITE_URL}/catalogo-meta.csv` },
      enlace: {
        texto: 'Abrir Commerce Manager',
        href: 'https://business.facebook.com/commerce/',
      },
      peso: 'alto',
      reserva:
        'Meta revisa el catálogo antes de aprobarlo, y sólo entran los artículos que tienen foto real. Hoy son ' +
        `${conFoto} de ${catalog.products.length}.`,
    },
    {
      id: 'bio',
      titulo: 'El enlace de la bio de Instagram',
      quePasa:
        'La bio de Instagram admite un enlace. El sitio ya tiene una página hecha para ese lugar, sin menú ni pie: sólo los artículos y el precio.',
      porQue:
        'Es el único enlace clickeable que Instagram da gratis, y hoy la gente que quiere saber un precio tiene que preguntarlo por mensaje.',
      comoSeHace: [
        'Editar el perfil de Instagram y poner esta dirección en «Sitio web».',
      ],
      copiar: { etiqueta: 'Dirección para la bio', valor: `${SITE_URL}/ig` },
      enlace: { texto: 'Ver cómo se ve', href: '/ig' },
      peso: 'alto',
    },
    {
      id: 'qr',
      titulo: 'Un QR en el mostrador y en el catálogo de papel',
      quePasa:
        'Un código impreso que, al escanearlo con la cámara, abre el catálogo buscable en el teléfono del cliente.',
      porQue:
        'El catálogo de papel no se va a tirar, y no hace falta: lo que le falta es una salida. Un QR pegado en la tapa convierte el libro en la puerta de entrada al catálogo digital, y le saca de encima a quien atiende la mitad de las consultas de mostrador. Escanear cuesta dos segundos; tipear una dirección, treinta.',
      comoSeHace: [
        'Generar el código con cualquier generador gratuito, apuntando a la dirección de acá abajo.',
        'Imprimirlo y pegarlo en la tapa del catálogo de papel, en el mostrador y en la vidriera.',
        'En la vidriera sirve fuera de hora: alguien pasa un domingo, escanea y consulta precios.',
      ],
      copiar: { etiqueta: 'Dirección para el QR', valor: `${SITE_URL}/tienda` },
      peso: 'medio',
      reserva:
        'No hace falta ningún sistema para esto: es una imagen impresa. Se rehace sólo si cambia el dominio.',
    },
    {
      id: 'search-console',
      titulo: 'Google Search Console',
      quePasa:
        'Le avisa a Google que el sitio existe, cuáles son todas sus páginas, y después informa por qué búsquedas entra la gente.',
      porQue:
        'Sin esto, Google encuentra el sitio igual pero tarda más. Y el informe de qué buscan es el mismo dato que el panel junta de las búsquedas internas, pero de afuera.',
      comoSeHace: [
        'Verificar el dominio en Search Console.',
        'Mandar el mapa del sitio, que ya está generado.',
      ],
      copiar: { etiqueta: 'Mapa del sitio', valor: `${SITE_URL}/sitemap.xml` },
      enlace: { texto: 'Abrir Search Console', href: 'https://search.google.com/search-console' },
      peso: 'medio',
    },
    {
      id: 'merchant',
      titulo: 'Google Merchant Center',
      quePasa: 'Es donde se cargan los productos para que Google los conozca uno por uno.',
      porQue:
        'El sitio ya genera el archivo. Conectarlo no cuesta nada y no molesta.',
      comoSeHace: [
        'Crear la cuenta con la dirección del local.',
        'Agregar un feed programado con esta dirección.',
        'Vincularlo con la ficha de Google del local.',
      ],
      copiar: { etiqueta: 'Archivo de productos', valor: `${SITE_URL}/merchant-feed.xml` },
      enlace: { texto: 'Abrir Merchant Center', href: 'https://merchants.google.com/' },
      peso: 'bajo',
      // Decirlo de frente vale más que el paso en sí.
      reserva:
        'Acá la expectativa hay que bajarla: Uruguay está admitido y el peso uruguayo también, pero la pestaña Shopping de Google todavía no está habilitada para usuarios uruguayos. O sea que esto sirve para que Google conozca los productos, no para salir en un comparador de precios que acá todavía no existe. Se hace porque es gratis y queda listo para cuando se habilite, no porque vaya a traer gente el mes que viene.',
    },
  ]

  return (
    <>
      <header className="panel-header">
        <h1>Conexiones</h1>
        <p>
          Dónde más tiene que estar el catálogo, en orden de lo que más gente trae a este local.
          Todo lo de acá es gratis: lo que cuesta es hacerlo bien y sostenerlo.
        </p>
      </header>

      <ol className="cx">
        {PASOS.map((paso) => (
          <li key={paso.id} className="cx-paso" data-peso={paso.peso}>
            <div className="cx-cabecera">
              <h2>{paso.titulo}</h2>
              <span className="cx-peso" data-peso={paso.peso}>
                {paso.peso === 'alto'
                  ? 'Mueve mucho'
                  : paso.peso === 'medio'
                    ? 'Ayuda'
                    : 'Por ahora, poco'}
              </span>
            </div>

            <p className="cx-que">{paso.quePasa}</p>
            <p className="cx-porque">{paso.porQue}</p>

            <ol className="cx-como">
              {paso.comoSeHace.map((linea) => (
                <li key={linea}>{linea}</li>
              ))}
            </ol>

            {paso.copiar && (
              <div className="cx-copiar">
                <div>
                  <span>{paso.copiar.etiqueta}</span>
                  <code>{paso.copiar.valor}</code>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copiar(paso.id, paso.copiar!.valor)}
                >
                  <Icon name={copiado === paso.id ? 'check' : 'share-network'} size={15} />
                  {copiado === paso.id ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            )}

            {paso.reserva && (
              <p className="cx-reserva">
                <Icon name="info" size={16} />
                <span>{paso.reserva}</span>
              </p>
            )}

            {paso.enlace && (
              <p className="cx-enlace">
                {paso.enlace.href.startsWith('/') ? (
                  <Link href={paso.enlace.href}>{paso.enlace.texto}</Link>
                ) : (
                  <a href={paso.enlace.href} target="_blank" rel="noopener noreferrer">
                    {paso.enlace.texto}
                  </a>
                )}
                <Icon name="arrow-right" size={15} />
              </p>
            )}
          </li>
        ))}
      </ol>

      <p className="panel-note">
        <Icon name="info" size={17} />
        <span>
          Las direcciones de arriba usan <code>{SITE_URL}</code>, que es un nombre de sitio
          provisorio: todavía no hay dominio comprado. Cuando lo haya, estas direcciones cambian
          solas y hay que volver a pegarlas una vez en cada lado.{' '}
          {sinFoto > 0 && (
            <>
              Y los {sinFoto} artículos sin foto no entran a ningún catálogo externo: los dos
              exigen imagen real.
            </>
          )}
        </span>
      </p>

      <p className="panel-note">
        <Icon name="warning" size={17} />
        <span>
          Todo esto se conecta una vez con la cuenta de Google y la de Meta de{' '}
          <strong>{BRAND.name}</strong>. Son cuentas del negocio, no nuestras: quedan a nombre de
          Alejandra y no dependen de nadie más.
        </span>
      </p>
    </>
  )
}
