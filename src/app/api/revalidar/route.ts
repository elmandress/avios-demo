import { revalidateTag } from 'next/cache'
import { CATALOGO_TAG } from '@/lib/catalog'

// Invalidación del catálogo.
//
// Es la otra mitad de la caché de `lib/catalog/index.ts`. Ahí el catálogo se
// guarda SIN vencimiento por tiempo; acá se lo marca vencido cuando los datos
// cambian de verdad.
//
// Cómo se conecta, una sola vez, en el panel de Supabase:
//
//   Database → Webhooks → Create a new hook
//     · Tabla:   products (y otro hook igual para categories, discounts,
//                site_settings)
//     · Eventos: Insert, Update, Delete
//     · Tipo:    HTTP Request → POST
//     · URL:     https://<el-sitio>/api/revalidar
//     · Header:  x-revalidar-secreto: <el valor de REVALIDAR_SECRETO>
//
// Por qué importa: sin esto, la única forma de que el sitio se entere de un
// precio nuevo es releer la base cada tanto "por las dudas". Con miles de
// artículos, releer por las dudas es lo que agota la cuota gratuita. Con el
// webhook, Supabase se lee unas pocas veces por semana — que es cuántas veces
// cambia de verdad el catálogo de una mercería.
//
// El secreto NO es opcional: sin él, cualquiera puede forzar regeneraciones
// hasta agotar la cuota de builds. Es el único endpoint del sitio que escribe
// (en la caché), así que es el único que necesita puerta.

export async function POST(request: Request): Promise<Response> {
  const esperado = process.env.REVALIDAR_SECRETO

  // Sin secreto configurado el endpoint queda cerrado, no abierto. Un endpoint
  // que se abre solo cuando falta una variable de entorno es un agujero que
  // aparece justo el día del despliegue.
  if (!esperado) {
    return Response.json(
      { ok: false, error: 'Falta REVALIDAR_SECRETO en el entorno.' },
      { status: 503 }
    )
  }

  const recibido =
    request.headers.get('x-revalidar-secreto') ??
    new URL(request.url).searchParams.get('secreto')

  if (recibido !== esperado) {
    return Response.json({ ok: false }, { status: 401 })
  }

  // Dos argumentos: en Next 16 la forma de uno solo está deprecada.
  //
  // 'max' da semántica stale-while-revalidate: quien entre justo después del
  // cambio recibe la versión anterior al instante y la nueva se arma detrás.
  // Para un catálogo es lo correcto — nadie prefiere esperar dos segundos a ver
  // un precio actualizado tres segundos antes.
  revalidateTag(CATALOGO_TAG, 'max')

  return Response.json({
    ok: true,
    revalidado: CATALOGO_TAG,
    en: new Date().toISOString(),
  })
}

// GET responde qué es esto, sin revalidar nada. Sirve para comprobar desde el
// navegador que la ruta está desplegada antes de configurar el webhook.
export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    que: 'Invalidación del catálogo. Se usa con POST y el header x-revalidar-secreto.',
    configurado: Boolean(process.env.REVALIDAR_SECRETO),
  })
}
