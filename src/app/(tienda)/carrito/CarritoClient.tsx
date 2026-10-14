'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { QuantityStepper } from '@/components/QuantityStepper'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { UpgradeHint } from '@/components/UpgradeHint'
import { MessagePreview } from '@/components/MessagePreview'
import { avios, Badge, Button, Icon, SectionTitle, TextInput } from '@/components/ui/Primitives'
import {
  countNoun,
  formatContent,
  formatUYU,
  formatUnitPrice,
  wholesaleUpgrade,
} from '@/lib/catalog/pricing'
import { buildOrderMessage, whatsappLink } from '@/lib/cart/whatsapp'
 import {
  guardarUltimoPedido,
  haceCuanto,
  leerUltimoPedido,
  olvidarUltimoPedido,
  type UltimoPedido,
} from '@/lib/cart/ultimo-pedido'
import { BLUR_DATA_URL } from '@/lib/media'
import { track } from '@/lib/analytics'

// El pedido.
//
// No es un checkout: no hay pasarela ni tabla de órdenes. El botón arma el
// mensaje y abre WhatsApp. Por eso las dos preguntas que Alejandra igual iba a
// tener que hacer por chat —¿retirás o te lo mando? ¿a dónde?— se hacen ACÁ, y
// viajan en el mensaje. Cada ida y vuelta que se ahorra es una venta que no se
// enfría.

export default function CarritoClient({
  whatsappUrl,
  siteUrl,
  shippingEstimate,
}: {
  whatsappUrl: string
  siteUrl: string
  shippingEstimate: string
}) {
  const { cart, loading, rawState, hasMounted, setQty, remove, replaceCart } = useCart()
  const [delivery, setDelivery] = useState<'retiro' | 'envio' | null>(null)
  const [destination, setDestination] = useState('')
  const [note, setNote] = useState('')

  // El pedido anterior. Se lee una sola vez, cuando el componente ya sabe que
  // está en el navegador (`hasMounted`), porque localStorage no existe en el
  // servidor y leerlo durante el render rompería la hidratación.
  const [anterior, setAnterior] = useState<UltimoPedido | null>(null)
  const [leido, setLeido] = useState(false)
  if (hasMounted && !leido) {
    setLeido(true)
    setAnterior(leerUltimoPedido())
  }

  const repetirPedido = () => {
    if (!anterior) return
    replaceCart(anterior.state)
    track('reorder', { lines: anterior.state.lines.length })
  }

  // Un solo armado del mensaje para la vista previa y para el envío. Si se
  // armara en dos lugares, lo que el cliente lee y lo que se manda podrían
  // separarse con el tiempo — que es exactamente el bug que originó la reforma.
  const message = buildOrderMessage(cart, { siteUrl, delivery, destination, note })

  // Traba contra el doble toque. Es un ref y no estado: el estado de React
  // llega un render tarde, y en Dahila un doble toque alcanzaba a mandar dos
  // pedidos antes de que la traba existiera (fd8252f).
  const enviando = useRef(false)
  // Después de enviar se ofrece "abrir de nuevo" y "copiar el pedido": si
  // WhatsApp no se abrió (bloqueo de ventanas, WhatsApp Web sin sesión), el
  // cliente no se queda con un botón que aparentemente no hizo nada.
  const [enviado, setEnviado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const pedidoUrl = whatsappLink(whatsappUrl, message)

  const copiarPedido = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin permiso de portapapeles: queda la vista previa para copiar a mano.
    }
  }

  const handleCheckout = () => {
    if (enviando.current) return
    enviando.current = true
    setTimeout(() => {
      enviando.current = false
    }, 1200)
    const url = pedidoUrl
    // Las dos cifras dicen cosas distintas y las dos importan: cuántos
    // artículos distintos lleva el pedido y cuántas unidades en total.
    track('order_sent', {
      lines: cart.lineCount,
      units: cart.itemCount,
      total: cart.subtotalUyu,
    })
    // iOS Safari bloquea window.open fuera del gesto original en algunos casos;
    // si lo bloquea, navegamos en la misma pestaña y wa.me abre la app igual.
    // Se guarda ANTES de abrir WhatsApp: al volver, el carrito puede estar
    // vacío pero el pedido queda para repetirlo el mes que viene.
    guardarUltimoPedido(rawState)

    // SIN 'noopener' en las opciones: con él, window.open devuelve SIEMPRE
    // null, el "plan B" de abajo se ejecutaba siempre y se abrían dos WhatsApp
    // mientras el cliente se iba del sitio (mismo bug que tuvo Dahila). Se corta
    // el vínculo a mano, que es lo que hacía noopener.
    const win = window.open(url, '_blank')
    if (win) win.opener = null
    else window.location.assign(url)
    setEnviado(true)
  }

  // Mientras bajan los productos del carrito (ver useProductos) también va el
  // esqueleto: sin precios no hay pedido que mostrar.
  if (!hasMounted || (loading && rawState.lines.length > 0)) {
    // El carrito vive en localStorage, así que el HTML del servidor no puede
    // conocerlo. Un esqueleto evita mostrar "vacío" un instante y que después
    // aparezcan tres renglones.
    return (
      <div role="status" aria-live="polite" style={wrap}>
        <span className="sr-only">Cargando tu pedido…</span>
        <div className="sk-shimmer" style={{ width: 180, height: 34, borderRadius: 6, marginBottom: 28 }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 18, marginBottom: 20 }}>
            <div className="sk-shimmer" style={{ width: 92, height: 92, borderRadius: 10 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div className="sk-shimmer" style={{ width: '55%', height: 17, borderRadius: 4 }} />
              <div className="sk-shimmer" style={{ width: '35%', height: 13, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <div style={{ ...wrap, textAlign: 'center', paddingTop: 72, paddingBottom: 96 }}>
        <SectionTitle as="h1" style={{ fontSize: 30 }}>
          Tu pedido está vacío
        </SectionTitle>
        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 15.5,
            color: avios.ink700,
            margin: '12px auto 26px',
            maxWidth: 440,
            lineHeight: 1.65,
          }}
        >
          Armá tu pedido desde el catálogo. Podés mezclar artículos por menor y por mayor en el mismo
          envío.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button href="/tienda" variant="primary" size="lg">
            Ver el catálogo
          </Button>
          <Button href="/mayorista" variant="secondary" size="lg">
            Comprar por mayor
          </Button>
        </div>

        {/*
          Volver a pedir lo mismo.

          Es lo que más mueve en un catálogo con clientela profesional: una
          modista o un taller no descubre productos, repite. Los portales B2B
          que miden esto reportan alrededor de un tercio más de pedidos
          repetidos con sólo poner este botón.

          Va en el carrito VACÍO a propósito: es el momento exacto en que
          alguien entra a armar el pedido del mes.
        */}
        {anterior && (
          <div className="repetir">
            <div>
              <strong>Tu pedido anterior</strong>
              <span>
                {anterior.state.lines.length}{' '}
                {anterior.state.lines.length === 1 ? 'artículo' : 'artículos'} · lo mandaste{' '}
                {haceCuanto(anterior.enviadoEn)}
              </span>
            </div>
            <div className="repetir-acciones">
              <Button variant="secondary" onClick={repetirPedido}>
                <Icon name="arrow-clockwise" size={17} /> Volver a pedir lo mismo
              </Button>
              <button
                type="button"
                className="repetir-olvidar"
                onClick={() => {
                  olvidarUltimoPedido()
                  setAnterior(null)
                }}
              >
                Olvidarlo
              </button>
            </div>
            <p>
              Se arma con los precios de hoy, no con los de aquella vez. Podés cambiar
              cantidades antes de mandarlo.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <SectionTitle as="h1" style={{ fontSize: 30, marginBottom: 6 }}>
        Tu pedido
      </SectionTitle>
      <p style={{ fontFamily: avios.fontSans, fontSize: 14.5, color: avios.ink500, margin: '0 0 28px' }}>
        {cart.lineCount} {cart.lineCount === 1 ? 'artículo' : 'artículos'} · lo confirmás por
        WhatsApp
      </p>

      {cart.droppedCount > 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: avios.sale50,
            border: `1px solid ${avios.sale}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 22,
            fontFamily: avios.fontSans,
            fontSize: 14,
            color: avios.ink900,
          }}
        >
          <Icon name="warning" size={18} color={avios.sale} />
          <span>
            {cart.droppedCount === 1
              ? 'Sacamos un artículo que ya no está disponible.'
              : `Sacamos ${cart.droppedCount} artículos que ya no están disponibles.`}
          </span>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {cart.lines.map((entry) => {
          const { product, variant, format, line } = entry
          const photo = product.media[0]
          const contentQty = format.contentQty ?? 1
          const noun = countNoun(format, line.qty)
          // El mismo cálculo que la ficha: si el renglón ya cruzó el punto en
          // que la pieza cerrada sale menos, hay que decirlo acá también.
          const upgrade = wholesaleUpgrade(variant, format, line.qty, entry.discountPercent)

          return (
            <li
              key={`${product.slug}-${variant.id}-${format.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 16,
                alignItems: 'start',
                padding: '20px 0',
                borderTop: `1px solid ${avios.border}`,
              }}
            >
              <Link
                href={`/tienda/${product.slug}`}
                aria-label={`Ver ${product.name}`}
                style={{
                  position: 'relative',
                  width: 88,
                  height: 88,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: avios.paper50,
                  border: `1px solid ${avios.border}`,
                  flexShrink: 0,
                  display: 'block',
                }}
              >
                {photo ? (
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="88px"
                    quality={82}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <ProductPlaceholder categorySlug={product.categorySlug} />
                )}
              </Link>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                <Link
                  href={`/tienda/${product.slug}`}
                  style={{
                    fontFamily: avios.fontDisplay,
                    fontSize: 18,
                    color: avios.ink900,
                    textDecoration: 'none',
                    lineHeight: 1.25,
                  }}
                >
                  {product.name}
                  {variant.label && (
                    <span style={{ color: avios.ink500 }}> · {variant.label}</span>
                  )}
                </Link>

                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: avios.fontSans, fontSize: 14, color: avios.ink700 }}>
                    {format.label}
                  </span>
                  {format.tier === 'mayor' && <Badge tone="saving">Por mayor</Badge>}
                </span>

                {/* Lo que desambigua el renglón: cuánto contenido es en total. */}
                <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                  {contentQty > 1
                    ? `${formatContent(contentQty * line.qty, format.unit)} en total · ${formatUnitPrice(
                        entry.unitFinalUyu / contentQty,
                        format.unit
                      )}`
                    : `${formatUYU(entry.unitFinalUyu)} c/u`}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 3, flexWrap: 'wrap' }}>
                  <QuantityStepper
                    value={line.qty}
                    onChange={(n) => setQty(line, n)}
                    min={format.minQty}
                    unitLabel={undefined}
                    size="sm"
                  />
                  <span style={{ fontFamily: avios.fontSans, fontSize: 13, color: avios.ink500 }}>
                    {noun}
                  </span>
                  <button
                    onClick={() => remove(line)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      fontFamily: avios.fontSans,
                      fontSize: 13.5,
                      color: avios.ink500,
                      textDecoration: 'underline',
                    }}
                  >
                    Quitar
                  </button>
                </div>

                {upgrade && <UpgradeHint upgrade={upgrade} compact />}
              </div>

              <span
                style={{
                  fontFamily: avios.fontSans,
                  fontSize: 17,
                  fontWeight: 600,
                  color: avios.ink900,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatUYU(entry.subtotalUyu)}
              </span>
            </li>
          )
        })}
      </ul>

      <div
        style={{
          borderTop: `2px solid ${avios.ink900}`,
          marginTop: 8,
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {cart.savedUyu > 0 && (
          <div style={rowStyle}>
            <span style={{ color: avios.saving700 }}>Descuento aplicado</span>
            <span style={{ color: avios.saving700, fontWeight: 600 }}>
              −{formatUYU(cart.savedUyu)}
            </span>
          </div>
        )}
        <div style={{ ...rowStyle, fontSize: 21, fontWeight: 700, color: avios.ink900 }}>
          <span>Total</span>
          <span>{formatUYU(cart.subtotalUyu)}</span>
        </div>

        {/* Entrega: lo que Alejandra iba a preguntar igual. */}
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend
            style={{
              fontFamily: avios.fontSans,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: avios.ink500,
              padding: 0,
              marginBottom: 9,
            }}
          >
            ¿Cómo lo recibís?
          </legend>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {(
              [
                { key: 'retiro', label: 'Retiro en el local', icon: 'storefront' },
                { key: 'envio', label: 'Envío por agencia', icon: 'truck' },
              ] as const
            ).map((opt) => {
              const on = delivery === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDelivery(on ? null : opt.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 44,
                    padding: '0 16px',
                    borderRadius: 9,
                    fontFamily: avios.fontSans,
                    fontSize: 14,
                    fontWeight: on ? 600 : 400,
                    background: on ? avios.brand50 : '#fff',
                    color: avios.ink900,
                    border: `1.5px solid ${on ? avios.brand600 : avios.ink100}`,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={opt.icon} size={17} color={on ? avios.brand600 : avios.ink500} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          {delivery === 'envio' && (
            <div style={{ marginTop: 12, maxWidth: 380 }}>
              <TextInput
                placeholder="¿A qué localidad? Ej: Salto, Maldonado…"
                value={destination}
                onChange={setDestination}
                aria-label="Localidad de destino"
              />
              <p style={{ fontFamily: avios.fontSans, fontSize: 12.5, color: avios.ink500, margin: '7px 0 0' }}>
                {shippingEstimate || 'El costo del envío lo confirmamos por WhatsApp antes de despachar.'}
              </p>
            </div>
          )}
        </fieldset>

        <div style={{ maxWidth: 520 }}>
          <TextInput
            placeholder="¿Algo que agregar? Colores, medidas, para cuándo lo necesitás…"
            value={note}
            onChange={setNote}
            aria-label="Nota para el pedido"
          />
        </div>

        <MessagePreview mensaje={message} />

        <Button variant="whatsapp" size="lg" full onClick={handleCheckout}>
          <Icon name="whatsapp-logo" weight="fill" size={20} /> Enviar el pedido por WhatsApp
        </Button>

        {enviado && (
          <div className="pedido-enviado" role="status">
            <strong>¿No se abrió WhatsApp?</strong>
            <div>
              <a href={pedidoUrl} target="_blank" rel="noopener noreferrer">
                Abrir de nuevo
              </a>
              <button type="button" onClick={copiarPedido}>
                {copiado ? '✓ Pedido copiado' : 'Copiar mi pedido'}
              </button>
            </div>
          </div>
        )}

        <p
          style={{
            fontFamily: avios.fontSans,
            fontSize: 13,
            color: avios.ink500,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Se abre WhatsApp con el pedido escrito. Todavía no estás comprando: confirmamos stock,
          envío y forma de pago por chat.
        </p>

        <Link
          href="/tienda"
          style={{
            fontFamily: avios.fontSans,
            fontSize: 14,
            color: avios.brand600,
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          ← Seguir agregando
        </Link>
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '36px 22px 90px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  color: 'var(--ink-700)',
}
