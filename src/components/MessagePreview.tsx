'use client'

import { useState } from 'react'
import { avios, Icon } from './ui/Primitives'

// Vista previa del mensaje de WhatsApp.
//
// El pedido de esta tienda ES un mensaje de texto: no hay pasarela de pago, así
// que ese texto es la factura, el remito y la orden de compra juntos. Mandarlo
// a ciegas es pedirle a alguien que firme algo sin leerlo.
//
// Para quien compra: ve exactamente qué va a mandar antes de mandarlo, y si algo
// está mal vuelve a corregirlo en vez de descubrirlo en el chat.
//
// Para quien vende: es la prueba de que el sitio hace el trabajo que hoy hace a
// mano. Un pedido que hoy llega como "hola tenes cinta de raso?" y son ocho
// mensajes de ida y vuelta, llega escrito, con cantidades, medidas y total.
//
// Se muestra en una burbuja parecida a la de WhatsApp a propósito: que se
// entienda de un vistazo qué es esto, sin leer un rótulo.

export function MessagePreview({ mensaje }: { mensaje: string }) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      // Sin permiso de portapapeles (o en un contexto no seguro) no se puede
      // copiar. El texto igual está a la vista para seleccionarlo a mano.
    }
  }

  return (
    <div className="msg-preview">
      <button
        type="button"
        className="msg-preview-toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="vista-previa-mensaje"
      >
        <Icon name="chat-text" size={17} color={avios.ink500} />
        <span>{abierto ? 'Ocultar el mensaje' : 'Ver el mensaje que se envía'}</span>
        <span className="msg-preview-caret" data-abierto={abierto} aria-hidden>
          <Icon name="caret-up" size={14} />
        </span>
      </button>

      {abierto && (
        <div id="vista-previa-mensaje" className="msg-preview-body">
          <pre>{mensaje}</pre>

          <div className="msg-preview-actions">
            <button type="button" onClick={copiar}>
              {copiado ? (
                <>
                  <Icon name="check" size={15} /> Copiado
                </>
              ) : (
                <>
                  <Icon name="share-network" size={15} /> Copiar el texto
                </>
              )}
            </button>
            <span>Se envía tal cual. Podés cambiar algo arriba y volver a mirarlo.</span>
          </div>
        </div>
      )}
    </div>
  )
}
