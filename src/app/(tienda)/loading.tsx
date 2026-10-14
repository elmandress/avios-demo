export default function HomeLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <section style={{ position: 'relative' }}>
        <div
          className="sk-shimmer"
          style={{ height: 'clamp(420px, 72vh, 720px)', width: '100%', borderRadius: 0 }}
        />
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 24px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 32,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(31,26,27,0.08)',
          }}
        >
          <div className="sk-shimmer" style={{ width: 80, height: 18, borderRadius: 4 }} />
          <div className="sk-shimmer" style={{ width: 60, height: 12, borderRadius: 4 }} />
        </div>
        <div
          className="home-skeleton-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 22 }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className="sk-shimmer"
                style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: 12 }}
              />
              <div className="sk-shimmer" style={{ width: '70%', height: 14, borderRadius: 4 }} />
              <div className="sk-shimmer" style={{ width: '40%', height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @keyframes sk-shimmer-anim {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .sk-shimmer {
          background: linear-gradient(90deg,
            rgba(31,26,27,0.05) 0%,
            rgba(31,26,27,0.10) 40%,
            rgba(31,26,27,0.05) 80%);
          background-size: 200% 100%;
          animation: sk-shimmer-anim 1.6s linear infinite;
        }
        @media (max-width: 720px) {
          .home-skeleton-grid { grid-template-columns: 1fr 1fr !important; gap: 14px !important; }
        }
      `}</style>
    </div>
  )
}
