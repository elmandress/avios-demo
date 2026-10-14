import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  // Las páginas que no queremos indexadas (/carrito, /mi-lista) quedan FUERA de
  // `disallow` a propósito: cada una manda su propia etiqueta `noindex`, y para
  // verla el crawler tiene que poder entrar. Bloquearlas acá conseguiría lo
  // contrario — Google no leería el noindex y podría listar la URL igual.
  //
  // Bloqueado de verdad: el panel. Decía '/admin', que es la ruta del clon:
  // desde que el panel se mudó a /panel, esta regla no protegía nada.
  const disallow = ['/panel', '/panel/', '/api/']

  // Answer engines are already covered by '*', but we welcome them explicitly so
  // there's zero ambiguity for AI Overviews, ChatGPT, Claude, Perplexity, Gemini
  // and Apple. (Perplexity, for one, respects per-agent rules.)
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended',
  ]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: aiBots, allow: '/', disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
