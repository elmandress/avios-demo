// Resuelve el alias `@/` para poder importar los módulos del sitio desde Node.
//
// Node 24 ejecuta TypeScript directo (borra los tipos y corre), así que la
// lógica pura del sitio —precios, búsqueda, integridad del catálogo— se puede
// probar sin levantar un navegador ni compilar nada. Lo único que le falta es
// entender `@/lib/...`, que es una convención de tsconfig, no de Node.
//
// Uso:
//   node --import ./scripts/test/lib/alias.mjs scripts/test/busqueda.mjs
//
// Por qué importa: hasta ahora toda la verificación pasaba por CDP y un Edge
// headless. Eso sirve para lo que sólo se ve en pantalla (contraste, desborde,
// LCP), pero para comprobar que "cinta gross 15" encuentra la cinta gross es
// una infraestructura enorme para una pregunta chica — y tan lenta que termina
// no corriéndose.

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolvePath(AQUI, '..', '..', '..')

// El hook hace dos cosas: traduce `@/` a `src/`, y prueba las extensiones que
// TypeScript deja implícitas. Node exige la extensión en un import ESM; el
// código del sitio escribe `from '@/lib/media'` porque tsconfig se la completa.
register(
  `data:text/javascript,
   import { existsSync } from 'node:fs';
   import { fileURLToPath } from 'node:url';
   const RAIZ = ${JSON.stringify(pathToFileURL(RAIZ).href)};
   const EXT = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
   export async function resolve(especificador, contexto, siguiente) {
     if (!especificador.startsWith('@/')) return siguiente(especificador, contexto);
     const base = new URL('src/' + especificador.slice(2), RAIZ + '/').href;
     for (const ext of EXT) {
       const url = base + ext;
       if (existsSync(fileURLToPath(url))) return siguiente(url, contexto);
     }
     return siguiente(base, contexto);
   }`,
  import.meta.url
)
