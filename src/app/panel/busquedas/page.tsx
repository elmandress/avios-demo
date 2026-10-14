'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  clearMissedSearches,
  getMissedSnapshot,
  getServerMissedSnapshot,
  subscribeMissed,
} from '@/lib/search/log'
import { whatsappLink } from '@/lib/cart/whatsapp'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { BRAND } from '@/lib/env'
import { Button, Icon } from '@/components/ui/Primitives'

// Qué buscan y no está.
//
// Es el único dato del panel que no sale del catálogo sino del comportamiento de
// los visitantes, y por eso el más útil: dice qué comprar y qué publicar. Una
// mercería recibe pedidos de cosas que sí tiene en el mostrador pero no cargó en
// el sitio — cada una de esas búsquedas es una venta que se fue.

export default function PanelBusquedas() {
  const { terms, hydrated } = useSyncExternalStore(
    subscribeMissed,
    getMissedSnapshot,
    getServerMissedSnapshot
  )
  const { catalog } = useAdminCatalog()
  const waUrl = catalog.settings.contact_whatsapp_url || BRAND.whatsappUrl

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <h1>Qué buscan y no está</h1>
          <p>Términos que alguien escribió en el buscador y no devolvieron ningún artículo.</p>
        </div>
        {terms.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm('¿Borrar el registro de búsquedas?')) clearMissedSearches()
            }}
          >
            Vaciar registro
          </Button>
        )}
      </header>

      {/* El alcance real, dicho de frente. Prometer que esto son "todas las
          búsquedas del sitio" sería mentir: sin base de datos cada navegador
          guarda las suyas. */}
      <p className="panel-note">
        <Icon name="info" size={17} />
        <span>
          En esta demo el registro vive en <strong>este navegador</strong>: vas a ver sólo las
          búsquedas hechas desde esta computadora. Con la base de datos conectada pasa a juntar las
          de todos los visitantes, que es cuando el dato sirve de verdad.
        </span>
      </p>

      {!hydrated ? (
        <div className="sk-shimmer" style={{ width: 260, height: 22, borderRadius: 6 }} />
      ) : terms.length === 0 ? (
        <div className="panel-empty-box">
          <Icon name="magnifying-glass" size={26} />
          <h2>Todavía no hay búsquedas sin resultado</h2>
          <p>
            Probá buscar algo que no tengas cargado —«elástico», «cierre», «velcro»— en{' '}
            <Link href="/tienda" target="_blank">
              la tienda
            </Link>{' '}
            y volvé acá.
          </p>
        </div>
      ) : (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th scope="col">Buscaron</th>
                <th scope="col">Veces</th>
                <th scope="col">Última vez</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.term}>
                  <th scope="row">{t.term}</th>
                  <td>
                    <strong>{t.count}</strong>
                  </td>
                  <td className="panel-muted">
                    {new Date(t.lastAt).toLocaleDateString('es-UY', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </td>
                  <td className="panel-actions">
                    <Link href="/panel/productos/nuevo">Cargar artículo</Link>
                    <a
                      href={whatsappLink(waUrl, `Consulta sobre "${t.term}"`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
