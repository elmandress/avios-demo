// Tokens de diseño de Mercería Avíos.
//
// ⚠️ Este archivo NO lleva 'use client', y eso es el punto.
//
// Antes los tokens vivían dentro de Primitives.tsx, que sí es un módulo de
// cliente. Cuando un componente de SERVIDOR importa un valor de un módulo
// marcado 'use client', Next no le entrega el objeto: le entrega una referencia
// de cliente. El resultado era que `avios.brand600` valía `undefined` en todo
// componente de servidor, y el HTML salía con cosas como
// `background: linear-gradient(160deg, undefined 0%, undefined 100%)` y
// `border: 1px solid undefined`.
//
// El síntoma visible: las ilustraciones de producto sin foto se renderizaban
// invisibles en /ig, y varios bordes y colores de texto caían al valor por
// defecto en /info, /terminos, /nosotros, /mayorista y la portada.
//
// Como son datos y no componentes, su lugar es un módulo neutro. Primitives
// los reexporta para que los imports existentes sigan funcionando.

//
// La paleta NO se inventó: sale del logo real de Avíos (public/logo.png —
// el botón fucsia con "Avíos" en cordón dorado sobre crema), muestreando sus
// píxeles. Los valores son los que efectivamente están en el archivo.
//
// Criterio de uso, que es lo que sostiene el sistema:
//   · crema y marrón cálido son el papel y la tinta — el fondo neutro sobre el
//     que la mercadería (que ES color) se ve sin competencia;
//   · el fucsia de la marca marca lo accionable y las ofertas;
//   · el dorado es ornamento, nunca información;
//   · el VERDE está reservado a UNA sola cosa: el ahorro por mayor. Es el único
//     color que no pertenece a la marca, y por eso funciona como señal: si ves
//     verde, estás viendo plata que te queda en el bolsillo.

export const avios = {
  // Superficies — el crema del logo
  white: '#FFFFFF',
  paper50: '#FEFAF1',
  paper100: '#F7EDE4',
  paper200: '#E7D8C8',

  // Tinta — el marrón cálido de "MERCERÍA · MONTEVIDEO"
  ink900: '#36231D',
  ink700: '#5C463E',
  // Medido: el #8E7A70 anterior daba 4,06:1 sobre blanco y 2,91:1 sobre
  // paper200 — por debajo del 4,5:1 que pide WCAG AA para texto normal. axe
  // marcaba 204 nodos en el recorrido. Este llega a 6,48:1 / 4,64:1 y pasa en
  // los cuatro fondos del sistema.
  ink500: '#6E5A50',
  // ORNAMENTO, NO TEXTO: 1,94:1 sobre blanco. Sirve para bordes, separadores e
  // iconos decorativos. Cualquier texto que hoy lo use está mal.
  ink300: '#C7B7AC',
  ink100: '#EDE3D9',

  // Marca — el fucsia del botón, de la sombra al brillo
  brand700: '#8E1038',
  brand600: '#B91744',
  brand500: '#CA1A4B',
  brand400: '#D72457',
  brand100: '#F7D6E0',
  brand50: '#FDEFF3',

  // Dorado — el cordón del logo. ORNAMENTO Y SÓLO ORNAMENTO: filetes, bordes,
  // fondos suaves. Como TEXTO no llega a AA en ningún fondo del sistema
  // (3,46:1 sobre blanco, 2,48:1 sobre paper200), así que las rúbricas que lo
  // usaban pasaron a brand600. La regla ya estaba escrita en la skill del repo
  // y la rompía este mismo archivo.
  gold600: '#B0822C',
  gold500: '#C79A3E',
  gold100: '#F2E6CC',

  // Verde: SÓLO ahorro por mayor. No usarlo de decoración.
  saving700: '#0B5537',
  saving600: '#0F6B47',
  saving100: '#D8EDE1',
  saving50: '#F0F8F4',

  // Oferta: el burdeos profundo del aro del botón. Está en familia con el
  // fucsia principal pero no se confunde con él.
  sale: '#8E1038',
  sale50: '#FDEFF3',

  border: 'rgba(54,35,29,0.10)',
  borderStrong: 'rgba(54,35,29,0.22)',
  shadowSm: '0 4px 14px -8px rgba(54,35,29,0.18)',
  shadowMd: '0 14px 30px -18px rgba(54,35,29,0.26)',
  ease: 'cubic-bezier(0.22,0.61,0.36,1)',

  fontDisplay: 'var(--font-display)',
  fontSans: 'var(--font-sans)',
} as const

