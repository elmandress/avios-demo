import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Los que trae eslint-config-next por defecto y hay que repetir al
    // sobrescribir la lista.
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // axe-core viene minificado desde su CDN: no es código de este proyecto y
    // analizarlo produce cientos de avisos que tapan los que sí importan.
    'scripts/audit/lib/axe.min.js',
  ]),
])

export default eslintConfig
