// Dejar la demo como recién salida de fábrica.
//
// Entre una reunión y la siguiente queda el rastro de la anterior: el carrito
// con los tres artículos que se agregaron para mostrar el total, la lista con lo
// que se guardó, el registro de búsquedas, y el catálogo con el precio que se
// cambió para probar el panel.
//
// Nada de eso está roto —es el sitio funcionando— pero abrir una demo y que lo
// primero que se vea sea el desorden de la demo anterior le resta a lo que se
// está mostrando. Este botón lo borra todo de una.
//
// Cuando el sitio tenga base de datos, esto sólo debería tocar lo que vive en el
// navegador. El catálogo pasa a ser de la base y no se restaura desde acá.

/** Todo lo que el sitio guarda en el navegador, con su nombre en castellano. */
const CLAVES: Array<{ clave: string; que: string; donde: 'local' | 'sesion' }> = [
  { clave: 'avios.panel.catalogo.v1', que: 'las ediciones del panel', donde: 'local' },
  { clave: 'avios.cart.v1', que: 'el pedido en curso', donde: 'local' },
  { clave: 'avios.lista.v1', que: 'los artículos guardados', donde: 'local' },
  { clave: 'avios.busquedas-sin-resultado.v1', que: 'las búsquedas sin resultado', donde: 'local' },
  { clave: 'avios.attribution.v1', que: 'de dónde llegó la visita', donde: 'local' },
  // La sesión del panel NO se borra: quien aprieta el botón está adentro y
  // echarlo al login en el medio de una demostración es un mal chiste.
]

export interface ResultadoReset {
  /** Qué se borró, para poder decirlo en pantalla. */
  borrado: string[]
}

export function resetearDemo(): ResultadoReset {
  const borrado: string[] = []

  for (const { clave, que, donde } of CLAVES) {
    try {
      const almacen = donde === 'local' ? localStorage : sessionStorage
      if (almacen.getItem(clave) !== null) {
        almacen.removeItem(clave)
        borrado.push(que)
      }
    } catch {
      // Storage bloqueado: no había nada que borrar de todas formas.
    }
  }

  return { borrado }
}

/** Cuántas de las cosas de arriba tienen algo guardado ahora mismo. */
export function contarRastro(): number {
  let n = 0
  for (const { clave, donde } of CLAVES) {
    try {
      const almacen = donde === 'local' ? localStorage : sessionStorage
      if (almacen.getItem(clave) !== null) n++
    } catch {
      // Sin storage no hay rastro.
    }
  }
  return n
}
