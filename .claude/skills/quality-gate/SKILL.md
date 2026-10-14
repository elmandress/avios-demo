---
name: quality-gate
description: >
  Puerta de calidad de este repo. Usar antes de dar CUALQUIER cambio por
  terminado: typecheck, lint y build, en ese orden, sin declarar éxito si algo
  falla antes.
---

# Puerta de calidad

Antes de decir que un cambio está terminado, correr en orden y frenar en la
primera falla:

1. `npm run typecheck` — TypeScript estricto. Nunca `any` ni `@ts-ignore` para
   pasar un error: tiparlo bien.
2. `npm run lint` — **0 errores y 0 warnings**. Arreglar la causa, no silenciar
   la regla. Un `// eslint-disable-next-line <regla>` acotado se acepta sólo con
   una línea de motivo al lado.
   - `react-hooks/set-state-in-effect` salta seguido. Casi siempre la respuesta
     correcta NO es desactivarla: leer de localStorage va con
     `useSyncExternalStore` (ver `src/lib/cart/store.ts`), y reiniciar estado
     cuando cambia una prop va en el render (ver `TiendaClient.tsx`).
3. `npm run build` — tiene que compilar y pre-renderizar todas las rutas.

## Verificación de lo que se tocó

4. Si el cambio es visible, **mirarlo**, no confiar en un HTTP 200. Un build
   verde no ve un botón tapado por otro elemento.
   - Levantar `npm run dev` y abrir la ruta.
   - Para capturas: usar Edge por CDP, no `--window-size` a secas.
     `--window-size` recorta la imagen sin cambiar el viewport de layout, así que
     una página que entra perfecta se ve cortada y se persiguen bugs que no
     existen. Hay scripts de referencia en el scratchpad de la sesión que hizo la
     reforma (`shot.mjs`, `overflow.mjs`): emulan el dispositivo con
     `Emulation.setDeviceMetricsOverride` y miden `scrollWidth` vs `clientWidth`.
   - Ancho de control: **390 px**. La mayoría del tráfico de Avíos llega desde
     Instagram, en teléfono.

5. Si tocaste precios, carrito, presentaciones o el checkout: verificá a mano que
   el número de la ficha, el del carrito y el del mensaje de WhatsApp sean el
   mismo. Es el error que costó la reforma entera.

## Auditoría

Cuando el cambio es grande o toca estilos, además de los tres de arriba:

    npm run build
    npx next start -H 127.0.0.1 -p 3000    # en otra terminal
    npm run audit

Corre cuatro comprobaciones con un navegador real y **tiene que dar verde**:

- **tokens** — busca `undefined` en el HTML del build. Atrapa tokens importados
  desde un módulo de cliente hacia un componente de servidor, que fallan en
  silencio (ni TypeScript ni el linter los ven).
- **a11y** — axe-core sobre 20 rutas, WCAG 2.1 AA. Objetivo: cero.
- **layout** — desborde horizontal a 390 px.
- **enlaces** — que los 64 destinos internos respondan.
- **vitals** — LCP ≤ 2500 ms y CLS ≤ 0,1 con 4G lenta y CPU 4×. **Medir siempre
  contra el build de producción**: en desarrollo el JS va sin minificar y los
  números no significan nada.

`--solo=a11y` corre una sola. `--url=` apunta a otra dirección.

Si una ruta nueva no está en `scripts/audit/lib/rutas.mjs`, la auditoría pasa en
verde sin haberla mirado — que es peor que no tenerla. Agregarla ahí.

## Reglas

- No tapar un chequeo que falla.
- No commitear ni pushear salvo pedido explícito.
