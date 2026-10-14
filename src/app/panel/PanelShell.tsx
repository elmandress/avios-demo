'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  DEMO_PASSWORD,
  DEMO_USER,
  checkCredentials,
  closeSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  notifySessionChange,
  openSession,
  subscribeSession,
} from '@/lib/admin/auth'
import { resetCatalog } from '@/lib/admin/store'
import { resetearDemo } from '@/lib/admin/reset'
import { useAdminCatalog } from '@/lib/admin/useAdminCatalog'
import { Button, Icon, TextInput } from '@/components/ui/Primitives'

// Marco del panel: puerta de acceso, navegación y aviso de modo demo.
//
// Sobre la "puerta": NO es seguridad, y el propio login lo dice en pantalla.
// Ver el comentario largo en src/lib/admin/auth.ts. Está para que la demo se
// vea completa, no para proteger nada.

const ITEMS = [
  { href: '/panel', label: 'Resumen', icon: 'stack' },
  // El mostrador NO es del panel, es la pantalla de quien atiende. Va acá
  // igual porque es donde se la busca, y es la que más se usa en el día.
  { href: '/mostrador', label: 'Mostrador', icon: 'magnifying-glass-plus' },
  { href: '/panel/productos', label: 'Productos', icon: 'shopping-bag' },
  { href: '/panel/categorias', label: 'Categorías', icon: 'list' },
  { href: '/panel/precios', label: 'Ajustar precios', icon: 'arrow-clockwise' },
  { href: '/panel/descuentos', label: 'Descuentos', icon: 'tag' },
  { href: '/panel/publicar', label: 'Publicar', icon: 'instagram-logo' },
  { href: '/panel/busquedas', label: 'Qué buscan', icon: 'magnifying-glass' },
  { href: '/panel/textos', label: 'Textos del sitio', icon: 'chat-text' },
  { href: '/panel/conexiones', label: 'Conexiones', icon: 'share-network' },
  { href: '/panel/respaldo', label: 'Respaldo', icon: 'download' },
] as const

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // La sesión vive en sessionStorage, que el servidor no conoce. Se lee como
  // cualquier otro sistema externo, para que el primer render del cliente
  // coincida con el HTML y no parpadee el panel antes de decidir.
  const { authed, checked } = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  )
  const { edited } = useAdminCatalog()

  const onLogin = useCallback(() => {
    openSession()
    notifySessionChange()
  }, [])

  const onLogout = useCallback(() => {
    closeSession()
    notifySessionChange()
    router.push('/panel')
  }, [router])

  if (!checked) {
    return (
      <div className="panel-gate">
        <div className="sk-shimmer" style={{ width: 220, height: 20, borderRadius: 6 }} />
      </div>
    )
  }

  if (!authed) return <LoginScreen onSuccess={onLogin} />

  return (
    <div className="panel">
      <div className="panel-demo-bar" role="note">
        <strong>Modo demostración.</strong>{' '}
        {edited
          ? 'Estás viendo el catálogo con tus ediciones, guardadas en este navegador.'
          : 'Podés editar todo: los cambios se guardan en este navegador.'}{' '}
        <Link href="/">Ver el sitio</Link>
        <button type="button" onClick={onLogout} className="panel-logout">
          Salir
        </button>
      </div>

      <div className="panel-body">
        <nav className="panel-nav" aria-label="Secciones del panel">
          <span className="panel-nav-brand">Avíos · Panel</span>
          <ul>
            {ITEMS.map((item) => {
              // `/panel` matchea exacto; el resto acepta subrutas, para que la
              // ficha de un producto deje "Productos" marcado como sección.
              const active =
                item.href === '/panel' ? pathname === '/panel' : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined} data-active={active}>
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/*
            Dos botones distintos a propósito:

            · "Restaurar catálogo" deshace las ediciones de precios y productos,
              y sólo aparece cuando hay algo que deshacer.
            · "Dejar la demo en cero" borra ADEMÁS el pedido en curso, la lista
              guardada y el registro de búsquedas. Es el que se usa entre una
              demostración y la siguiente, para que lo primero que se vea no sea
              el desorden de la anterior.
          */}
          {edited && (
            <button
              type="button"
              className="panel-reset"
              onClick={() => {
                if (
                  confirm(
                    'Esto descarta tus ediciones y vuelve el catálogo al original. El pedido y la lista guardada no se tocan.\n\n¿Seguir?'
                  )
                ) {
                  resetCatalog()
                }
              }}
            >
              <Icon name="arrow-clockwise" size={16} />
              Restaurar catálogo original
            </button>
          )}

          <button
            type="button"
            className="panel-reset panel-reset-todo"
            onClick={() => {
              if (
                !confirm(
                  'Deja la demo como recién abierta: borra las ediciones del panel, el pedido en curso, los artículos guardados y el registro de búsquedas.\n\n¿Seguir?'
                )
              ) {
                return
              }
              const { borrado } = resetearDemo()
              resetCatalog()
              alert(
                borrado.length === 0
                  ? 'Ya estaba todo en cero.'
                  : `Listo. Se borró: ${borrado.join(', ')}.`
              )
            }}
          >
            <Icon name="sparkle" size={16} />
            Dejar la demo en cero
          </button>
        </nav>

        <main className="panel-main">{children}</main>
      </div>
    </div>
  )
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (checkCredentials(user, password)) {
      setError(null)
      onSuccess()
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="panel-gate">
      <form className="panel-login" onSubmit={submit}>
        <span className="panel-login-brand">Avíos · Panel</span>
        <h1>Entrar al panel</h1>

        <label>
          <span>Usuario</span>
          <TextInput value={user} onChange={setUser} autoComplete="username" />
        </label>
        <label>
          <span>Contraseña</span>
          <TextInput
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p role="alert" className="panel-login-error">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" full>
          Entrar
        </Button>

        {/* El aviso va acá, visible, y no escondido en un comentario: cualquiera
            que abra esta pantalla tiene que entender que no protege nada. */}
        <div className="panel-login-note">
          <Icon name="warning" size={17} />
          <span>
            <strong>Acceso de demostración.</strong> Usuario <code>{DEMO_USER}</code>, contraseña{' '}
            <code>{DEMO_PASSWORD}</code>. No es seguridad real: las credenciales están en el código
            del sitio. Antes de que haya un dato de verdad detrás, esto se reemplaza por login con
            Supabase Auth.
          </span>
        </div>
      </form>
    </div>
  )
}
