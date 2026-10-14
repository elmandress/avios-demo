import { ImageResponse } from 'next/og'

// Tarjeta social del sitio.
//
// Es la convención de archivo de Next en la raíz de /app, así que cubre TODA
// página que no declare su propia imagen — WhatsApp, Instagram, Facebook y X
// muestran esto cuando alguien comparte cualquier URL del sitio.
//
// Se dibuja entera acá, sin foto: todavía no hay una foto del local en buena
// calidad (la que circula está dentro de un flyer, con texto encima) y una
// imagen de stock se nota. El botón es una reconstrucción vectorial del isotipo
// para que Satori pueda dibujarlo sin cargar el PNG.
//
// Cuando llegue la foto del local, este archivo es el único lugar a tocar.

export const alt = 'Mercería Avíos — mercería por mayor y por menor en Montevideo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FUCSIA = '#CA1A4B'
const FUCSIA_RIM = '#8E1038'
const ORO = '#C79A3E'
const CREMA = '#FEFAF1'
const TINTA = '#36231D'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: CREMA,
          // Satori no hereda fuentes: sin familia explícita cae a la del
          // sistema, que en el runtime de la imagen es una sans neutra.
          fontFamily: 'sans-serif',
        }}
      >
        {/* Columna de texto */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 0 64px 68px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', width: 56, height: 5, background: ORO, borderRadius: 3 }} />
            <span
              style={{
                marginTop: 26,
                fontSize: 21,
                letterSpacing: 5,
                color: ORO,
                fontWeight: 700,
              }}
            >
              MERCERÍA · MONTEVIDEO
            </span>
            <span style={{ fontSize: 68, lineHeight: 1.05, color: TINTA, fontWeight: 700, marginTop: 14 }}>
              Por mayor
            </span>
            <span style={{ fontSize: 68, lineHeight: 1.05, color: FUCSIA, fontWeight: 700 }}>
              y por menor
            </span>
            <span style={{ fontSize: 26, color: '#5C463E', marginTop: 20, lineHeight: 1.4 }}>
              Cintas · Hilos · Cordones · Tul
              <br />
              Herramientas de costura
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 23, color: '#5C463E' }}>
            <span>San José 851 esq. Andes · Montevideo</span>
            <span style={{ color: FUCSIA, fontWeight: 700, marginTop: 4 }}>
              Envíos a todo el país
            </span>
          </div>
        </div>

        {/* Botón de la marca */}
        <div
          style={{
            width: 470,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="330" height="330" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill={FUCSIA_RIM} />
            <circle cx="100" cy="100" r="86" fill={FUCSIA} />
            <circle cx="100" cy="100" r="66" fill="none" stroke={FUCSIA_RIM} strokeWidth="3" opacity="0.55" />
            <circle cx="78" cy="78" r="9" fill={FUCSIA_RIM} />
            <circle cx="122" cy="78" r="9" fill={FUCSIA_RIM} />
            <circle cx="78" cy="122" r="9" fill={FUCSIA_RIM} />
            <circle cx="122" cy="122" r="9" fill={FUCSIA_RIM} />
            {/* El cordón dorado que cruza el botón, como en el logo */}
            <path
              d="M14 118 C 52 96, 62 74, 100 74 C 138 74, 148 96, 186 82"
              fill="none"
              stroke={ORO}
              strokeWidth="9"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    ),
    size
  )
}
