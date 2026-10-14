'use client'

import { useState } from 'react'
import { updateSettings } from '@/lib/admin/store'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Button, Icon } from '@/components/ui/Primitives'

// Agrupa las claves de configuración por DÓNDE SE VEN, no por su nombre técnico.
// Una lista alfabética de `about_body_2` y `promo_bar_link` no le dice nada a la
// dueña; "esto es lo primero que se lee al entrar" sí.

interface FieldDef {
  key: string
  label: string
  /** Área de texto en vez de una línea. */
  long?: boolean
  placeholder?: string
}

const GROUPS: Array<{ title: string; where: string; fields: FieldDef[] }> = [
  {
    title: 'Barra superior',
    where: 'La franja bordó arriba de todo, en todas las páginas',
    fields: [
      { key: 'promo_bar_text', label: 'Texto' },
      { key: 'promo_bar_link', label: 'A dónde lleva', placeholder: '/mayorista' },
    ],
  },
  {
    title: 'Portada',
    where: 'Lo primero que se lee al entrar al sitio',
    fields: [
      { key: 'hero_eyebrow', label: 'Línea chica de arriba' },
      { key: 'hero_title', label: 'Título grande' },
      { key: 'hero_subtitle', label: 'Bajada', long: true },
      { key: 'hero_cta', label: 'Botón principal' },
      { key: 'hero_cta_secondary', label: 'Botón secundario' },
    ],
  },
  {
    title: 'La mercería',
    where: 'La página /nosotros',
    fields: [
      { key: 'about_eyebrow', label: 'Línea chica' },
      { key: 'about_title', label: 'Título' },
      { key: 'about_body', label: 'Primer párrafo', long: true },
      { key: 'about_body_2', label: 'Segundo párrafo', long: true },
    ],
  },
  {
    title: 'Contacto',
    where: 'Pie de página, /contacto y todos los botones de WhatsApp',
    fields: [
      { key: 'contact_whatsapp', label: 'Teléfono visible' },
      { key: 'contact_whatsapp_url', label: 'Link de WhatsApp', placeholder: 'https://wa.me/598…' },
      { key: 'contact_instagram', label: 'Usuario de Instagram' },
      { key: 'contact_instagram_url', label: 'Link de Instagram' },
      { key: 'contact_address', label: 'Dirección' },
      {
        key: 'instagram_followers',
        label: 'Seguidores en Instagram',
        placeholder: 'Vacío = no se muestra el número',
      },
    ],
  },
  {
    title: 'Envíos, pagos y cambios',
    where: 'La página /info, la ficha de producto y el pedido',
    fields: [
      { key: 'shipping_estimate', label: 'Resumen corto de envío' },
      { key: 'info_shipping', label: 'Envíos', long: true },
      { key: 'info_payment', label: 'Formas de pago', long: true },
      { key: 'info_returns', label: 'Cambios', long: true },
    ],
  },
  {
    title: 'Venta por mayor',
    where: 'La página /mayorista',
    fields: [
      {
        key: 'wholesale_min_order',
        label: 'Mínimo de compra',
        placeholder: 'Vacío = el sitio dice que no hay mínimo publicado',
      },
      { key: 'wholesale_note', label: 'Aclaración extra', long: true },
    ],
  },
]

export default function PanelTextos() {
  const { catalog } = useAdminCatalog()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // El borrador arranca vacío y sólo guarda lo que se tocó: así, si otra pestaña
  // cambia un texto, no se pisa con un valor viejo que quedó en este formulario.
  const valueOf = (key: string) => draft[key] ?? catalog.settings[key] ?? ''
  const dirty = Object.keys(draft).length > 0

  const save = () => {
    updateSettings(draft)
    setDraft({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <header className="panel-header panel-header-row">
        <div>
          <h1>Textos del sitio</h1>
          <p>Todo lo que se puede cambiar sin tocar código, y dónde se ve cada cosa.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span className="panel-saved" role="status">
              <Icon name="check" size={16} /> Guardado
            </span>
          )}
          <Button variant="primary" onClick={save} disabled={!dirty}>
            {dirty ? `Guardar ${Object.keys(draft).length} cambio(s)` : 'Sin cambios'}
          </Button>
        </div>
      </header>

      {GROUPS.map((group) => (
        <section key={group.title} className="panel-section">
          <h2>{group.title}</h2>
          <p className="panel-where">{group.where}</p>

          <div className="panel-settings">
            {group.fields.map((f) => (
              <label key={f.key} className="panel-field">
                <span className="panel-field-label">
                  {f.label}
                  <code>{f.key}</code>
                </span>
                {f.long ? (
                  <textarea
                    rows={3}
                    value={valueOf(f.key)}
                    placeholder={f.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    value={valueOf(f.key)}
                    placeholder={f.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="panel-save-bar">
        <Button variant="primary" size="lg" onClick={save} disabled={!dirty}>
          Guardar cambios
        </Button>
      </div>
    </>
  )
}
