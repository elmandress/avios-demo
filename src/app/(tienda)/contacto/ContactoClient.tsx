'use client'

import { avios, Eyebrow, Icon } from '@/components/ui/Primitives'

interface ContactChannel {
  icon: string
  label: string
  value: string
  href: string
  ariaLabel: string
}

interface Props {
  settings: Partial<Record<
    | 'contact_whatsapp' | 'contact_whatsapp_url'
    | 'contact_instagram' | 'contact_instagram_url'
    | 'contact_address',
    string
  >>
}

// Embed público de Google Maps — no requiere API key ni facturación, solo la
// dirección en la URL. Reforzar el local físico es una señal de confianza
// real para un negocio con vidriera (a diferencia de una marca sin local).
const MAPS_EMBED_SRC = 'https://www.google.com/maps?q=San+Jos%C3%A9+851+esquina+Andes,+Montevideo,+Uruguay&output=embed'
const MAPS_LINK = 'https://www.google.com/maps/search/?api=1&query=San+Jos%C3%A9+851+esquina+Andes,+Montevideo,+Uruguay'

const HOURS = [
  { day: 'Lunes a viernes', time: '9:00 – 18:30' },
  { day: 'Sábados', time: '9:00 – 13:30' },
]

export default function ContactoClient({ settings }: Props) {
  const igLabel = settings.contact_instagram || '@merceria_avios_montevideo'
  const igUrl   = settings.contact_instagram_url || 'https://www.instagram.com/merceria_avios_montevideo/'
  const waLabel = settings.contact_whatsapp || '+598 98 526 943'
  const waUrl   = settings.contact_whatsapp_url || 'https://wa.me/59898526943'
  const location = settings.contact_address || 'San José 851 esq. Andes, Montevideo'

  const CHANNELS: ContactChannel[] = [
    {
      icon: 'whatsapp-logo',
      label: 'WhatsApp',
      value: waLabel,
      href: waUrl,
      ariaLabel: 'Escribir por WhatsApp',
    },
    {
      icon: 'instagram-logo',
      label: 'Instagram',
      value: igLabel,
      href: igUrl,
      ariaLabel: 'Abrir Instagram',
    },
    {
      icon: 'map-pin',
      label: 'Local',
      value: location,
      href: MAPS_LINK,
      ariaLabel: 'Abrir ubicación en Google Maps',
    },
  ]

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '60px 24px 0', textAlign: 'center' }}>
      <Eyebrow>Contacto</Eyebrow>
      <h1 style={{
        fontFamily: avios.fontDisplay, fontWeight: 400, fontSize: 'clamp(30px, 4.6vw, 46px)',
        lineHeight: 1.05, letterSpacing: '-0.02em', color: avios.ink900, margin: '12px 0 14px',
      }}>Pasá por el local o escribinos.</h1>
      <p style={{ fontFamily: avios.fontSans, fontSize: 16, color: avios.ink700, margin: '0 auto 48px', maxWidth: 540 }}>
        Estamos en pleno centro, sobre San José entre Andes y Río Negro. Si preferís, consultá por WhatsApp o Instagram antes de venir y te decimos si lo tenemos.
      </p>
      <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 32 }}>
        {CHANNELS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            aria-label={c.ariaLabel}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: avios.paper100,
              borderRadius: 12, padding: '28px 18px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              textDecoration: 'none', color: 'inherit',
              transition: 'transform 160ms cubic-bezier(0.22,0.61,0.36,1), background 160ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = avios.paper200
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.background = avios.paper100
            }}
          >
            <Icon name={c.icon} size={22} color={avios.ink900}/>
            <div style={{ fontFamily: avios.fontSans, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: avios.ink500 }}>{c.label}</div>
            <div style={{ fontFamily: avios.fontSans, fontSize: 14, fontWeight: 400, color: avios.ink900 }}>{c.value}</div>
          </a>
        ))}
      </div>
      <p style={{
        fontFamily: avios.fontSans, fontSize: 12, fontWeight: 300,
        color: avios.ink500, margin: '0 auto 24px',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {location}
      </p>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap',
        margin: '0 auto 40px',
      }}>
        {HOURS.map((h) => (
          <div key={h.day} style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: avios.fontSans, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: avios.ink500 }}>{h.day}</div>
            <div style={{ fontFamily: avios.fontSans, fontSize: 14, fontWeight: 500, color: avios.ink900 }}>{h.time}</div>
          </div>
        ))}
      </div>

      {/* Mapa embebido — señal de confianza real para un local físico, no
          requiere API key (solo la dirección en la URL). */}
      <div style={{
        maxWidth: 640, margin: '0 auto 64px', borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${avios.border}`, aspectRatio: '16/9',
      }}>
        <iframe
          src={MAPS_EMBED_SRC}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación de Mercería Avíos en el mapa"
        />
      </div>
    </div>
  )
}
