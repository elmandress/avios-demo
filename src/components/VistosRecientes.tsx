'use client'

import Image from 'next/image'
import { Enlace } from './Enlace'
import { useSyncExternalStore } from 'react'
import { leerVistos, leerVistosServidor, suscribirVistos } from '@/lib/vistos'
import { ProductPlaceholder } from './ProductPlaceholder'

/**
 * "Viste hace poco" — tira compacta con los últimos artículos abiertos.
 *
 * Patrón de Dahila: quien compara tres cintas va y viene entre fichas, y sin
 * esto tiene que volver a buscarlas. Va al pie de la grilla y de la ficha, no
 * arriba: aparece recién después de leer el navegador, y arriba empujaría todo
 * lo demás hacia abajo justo cuando la persona empieza a mirar.
 *
 * Sin precio a propósito (ver lib/vistos.ts).
 */
export function VistosRecientes({ excluir }: { excluir?: string }) {
  const vistos = useSyncExternalStore(suscribirVistos, leerVistos, leerVistosServidor)
  const lista = vistos.filter((v) => v.slug !== excluir).slice(0, 6)
  if (lista.length < 2) return null

  return (
    <section aria-labelledby="vistos-titulo" className="vistos">
      <h2 id="vistos-titulo">Viste hace poco</h2>
      <ul>
        {lista.map((v) => (
          <li key={v.slug}>
            <Enlace href={`/tienda/${v.slug}`}>
              <span className="vistos-foto">
                {v.photo ? (
                  <Image src={v.photo.url} alt="" fill sizes="64px" quality={82} style={{ objectFit: 'cover' }} />
                ) : (
                  <ProductPlaceholder categorySlug={v.categorySlug} />
                )}
              </span>
              <span className="vistos-nombre">{v.name}</span>
            </Enlace>
          </li>
        ))}
      </ul>
    </section>
  )
}
