'use client'

import { useState } from 'react'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { replaceCatalog } from '@/lib/admin/store'
import {
  catalogoACSV,
  descargar,
  leerRespaldo,
  nombreDeArchivo,
  type ResultadoImportacion,
} from '@/lib/admin/respaldo'
import { previsualizarImportacion, type ResumenImportacion } from '@/lib/admin/importar'
import { Button, Icon } from '@/components/ui/Primitives'

// Respaldo e importación.
//
// Dos cosas que parecen de mantenimiento y son de negocio:
//
// · El respaldo contesta la pregunta que nadie hace en voz alta: "esto que
//   estoy cargando, ¿es mío?". La respuesta tiene que ser un botón.
// · La importación es lo que hace viable un catálogo de cientos de artículos.
//   Cargarlos de a uno, aunque el panel sea bueno, son semanas. La planilla
//   sale de acá mismo, se trabaja en Excel y vuelve.

export default function PanelRespaldo() {
  const { catalog } = useAdminCatalog()
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [importacion, setImportacion] = useState<ResumenImportacion | null>(null)

  const precios = catalog.products.reduce(
    (n, p) => n + p.variants.reduce((m, v) => m + v.formats.length, 0),
    0
  )

  const bajarCSV = () => {
    descargar(catalogoACSV(catalog), nombreDeArchivo('csv'), 'text/csv;charset=utf-8')
  }

  const bajarJSON = () => {
    descargar(
      JSON.stringify(catalog, null, 2),
      nombreDeArchivo('json'),
      'application/json;charset=utf-8'
    )
  }

  const alElegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const texto = await file.text()
    const r = leerRespaldo(texto)
    setResultado(r)
    // El input se limpia para poder elegir el MISMO archivo otra vez si el
    // primer intento se canceló en la confirmación.
    e.target.value = ''
  }

  const restaurar = () => {
    if (!resultado?.catalogo) return
    if (
      !confirm(
        'Esto reemplaza el catálogo actual por el del respaldo. Lo que tengas cargado ahora se pierde.\n\n¿Seguir?'
      )
    ) {
      return
    }
    replaceCatalog(resultado.catalogo)
    setResultado({ ok: true, mensaje: 'Catálogo restaurado.' })
  }

  const alElegirPlanilla = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportacion(previsualizarImportacion(await file.text(), catalog))
    e.target.value = ''
  }

  const aplicarImportacion = () => {
    if (!importacion?.catalogo) return
    const { nuevos, actualizados } = importacion
    if (
      !confirm(
        `Se van a cargar ${nuevos.length} artículos nuevos y actualizar ${actualizados.length}.\n\n` +
          'Los que la planilla no menciona quedan como están.\n\n¿Seguir?'
      )
    ) {
      return
    }
    replaceCatalog(importacion.catalogo)
    setImportacion(null)
  }

  return (
    <>
      <header className="panel-header">
        <h1>Respaldo</h1>
        <p>
          El catálogo es tuyo: bajalo cuando quieras, en planilla o como archivo para volver a
          cargarlo acá.
        </p>
      </header>

      <div className="resp">
        <section className="resp-card">
          <h2>
            <Icon name="download" size={19} /> Bajar el catálogo
          </h2>
          <p className="resp-cifra">
            {catalog.products.length} artículos · {precios} precios
          </p>

          <div className="resp-opcion">
            <div>
              <strong>Planilla (CSV)</strong>
              <p>
                Se abre en Excel o en Google Sheets. Una fila por precio, con la categoría, la
                medida, la presentación y si es por mayor. Es el catálogo en un papel que podés
                revisar con quien quieras.
              </p>
            </div>
            <Button variant="secondary" onClick={bajarCSV}>
              Bajar la planilla
            </Button>
          </div>

          <div className="resp-opcion">
            <div>
              <strong>Respaldo completo (JSON)</strong>
              <p>
                El archivo para volver a cargar acá abajo y dejar todo como estaba. Guarda también
                los textos del sitio, las categorías y los descuentos, que la planilla no incluye.
              </p>
            </div>
            <Button variant="secondary" onClick={bajarJSON}>
              Bajar el respaldo
            </Button>
          </div>
        </section>

        <section className="resp-card">
          <h2>
            <Icon name="arrow-clockwise" size={19} /> Restaurar
          </h2>
          <p>
            Cargá un respaldo <code>.json</code> bajado desde acá. Antes de tocar nada te decimos
            qué trae.
          </p>

          {/* Un <label> que envuelve al input, y no un botón que lo clickea con
              un ref: es el mismo patrón que usa la carga de fotos del panel.
              Con el botón, el input quedaba enfocable por teclado y sin nombre
              accesible — axe lo marcó como "Form elements must have labels" —
              y además había dos controles haciendo lo mismo en el recorrido. */}
          <label className="resp-archivo">
            <Icon name="download" size={17} />
            <span>Elegir un archivo</span>
            <input type="file" accept="application/json,.json" onChange={alElegirArchivo} />
          </label>

          {resultado && (
            <div
              className={resultado.ok ? 'resp-aviso resp-aviso-ok' : 'resp-aviso resp-aviso-mal'}
              role="status"
            >
              <Icon name={resultado.ok ? 'check' : 'warning'} size={17} />
              <span>{resultado.mensaje}</span>
              {resultado.ok && resultado.catalogo && (
                <Button variant="primary" size="sm" onClick={restaurar}>
                  Restaurar este catálogo
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Importación: la pieza que hace viable un catálogo de cientos. */}
      <section className="resp-card resp-card-ancha">
        <h2>
          <Icon name="stack" size={19} /> Cargar desde una planilla
        </h2>
        <p>
          Bajás la planilla de arriba, la completás en Excel con todos los artículos que faltan y
          la subís acá. Es la misma planilla: no hay que aprender otro formato. Te decimos qué va
          a pasar <strong>antes</strong> de tocar nada.
        </p>

        <label className="resp-archivo">
          <Icon name="stack" size={17} />
          <span>Elegir la planilla</span>
          <input type="file" accept=".csv,text/csv" onChange={alElegirPlanilla} />
        </label>

        {importacion && !importacion.ok && (
          <div className="resp-aviso resp-aviso-mal" role="status">
            <Icon name="warning" size={17} />
            <span>
              <strong>
                No se cargó nada: hay {importacion.errores.length}{' '}
                {importacion.errores.length === 1 ? 'fila con problema' : 'filas con problemas'}.
              </strong>
              {/* Todo o nada: un catálogo importado a medias es peor que no
                  haberlo importado, porque nadie sabe qué quedó adentro. */}
              <span className="resp-nada">
                Se corrigen en la planilla y se vuelve a subir. No se cargó ninguna fila.
              </span>
            </span>
          </div>
        )}

        {importacion && !importacion.ok && (
          <ul className="resp-errores">
            {importacion.errores.slice(0, 12).map((e) => (
              <li key={`${e.fila}-${e.motivo}`}>
                <b>Fila {e.fila}</b>
                {e.motivo}
              </li>
            ))}
            {importacion.errores.length > 12 && (
              <li className="resp-errores-mas">
                y {importacion.errores.length - 12} más. Se ven todos corrigiendo estos primero.
              </li>
            )}
          </ul>
        )}

        {importacion?.ok && (
          <>
            <div className="resp-previa">
              <div>
                <b>{importacion.nuevos.length}</b>
                <span>artículos nuevos</span>
              </div>
              <div>
                <b>{importacion.actualizados.length}</b>
                <span>se actualizan</span>
              </div>
              <div>
                <b>{importacion.intactos}</b>
                <span>quedan como están</span>
              </div>
              <div>
                <b>{importacion.precios}</b>
                <span>precios en la planilla</span>
              </div>
            </div>

            {importacion.categoriasNuevas.length > 0 && (
              <p className="resp-detalle">
                Se van a crear estas categorías: {importacion.categoriasNuevas.join(', ')}.
              </p>
            )}

            {importacion.nuevos.length > 0 && (
              <p className="resp-detalle">
                Nuevos: {importacion.nuevos.slice(0, 8).join(', ')}
                {importacion.nuevos.length > 8 && ` y ${importacion.nuevos.length - 8} más`}.
              </p>
            )}

            <div className="resp-aviso resp-aviso-ok" role="status">
              <Icon name="check" size={17} />
              <span>
                La planilla está bien. Al aplicar, los artículos que ya existen conservan sus
                fotos y su descripción: la planilla sólo trae precios y medidas.
              </span>
              <Button variant="primary" size="sm" onClick={aplicarImportacion}>
                Cargar la planilla
              </Button>
            </div>
          </>
        )}
      </section>

      <p className="panel-note">
        <Icon name="info" size={17} />
        <span>
          En esta demo el catálogo vive en este navegador, así que el respaldo es la única copia
          que sobrevive a borrar los datos del sitio. Con la base de datos conectada el respaldo
          sigue sirviendo igual, para llevarte los datos o para volver atrás una edición grande.
        </span>
      </p>
    </>
  )
}
