# Rediseño del catálogo de Avíos

## Diagnóstico y prioridades
- 597 artículos distribuidos en 22 categorías: 198 en galones, flecos y borlas frente a 5 en sesgos. La tira horizontal de categorías oculta opciones en teléfono.
- Los filtros actuales son independientes de la URL (salvo la búsqueda), sin chips para deshacer una selección. El orden no permite comparar ahorro mayorista.
- Las fichas con muchos modelos necesitan búsqueda dentro del selector y una identificación persistente del modelo elegido.
- Mantener tandas de 24 y el índice liviano; nunca enviar variantes completas para filtrar.

## Datos comprobados
Categoría, eje de variante y presentaciones existen. Material explícito sólo en 74 artículos y colores informativos sólo en 35: no derivar colores/materiales de fotos ni ofrecer una cobertura engañosa. Exponer unidad de presentación, eje, disponibilidad y precio mayorista. El precio para ordenar sigue saliendo de pricing.ts y no incluye los artículos a consultar como si costaran cero.

## Organización
Seis familias: Cintas y pasamanería; Costura; Tejido y bordado; Brillos y decoración; Manualidades; Complementos. Cada una conserva las categorías y sus URLs. Dentro de galones, reglas ordenadas sobre el nombre explícito: flecos, borlas, plumas, strass/piedras, pompón, bordados y otros galones. La clasificación vive aparte del JSON generado, con una opción residual para no perder artículos.

## Referencias y alcance de investigación
Referencias solicitadas: Hobbycraft (navegar por familias y luego tipo de artículo), Minerva (facetas específicas del rubro), Mercado Libre (filtros activos visibles), Baymard (conteos, eliminación individual de filtros y orden), NN/g (divulgación progresiva). URLs: https://www.hobbycraft.co.uk/sewing/ ; https://www.minerva.com/ ; https://www.mercadolibre.com.uy/ ; https://baymard.com/blog/product-listing-page-filters ; https://www.nngroup.com/articles/filters-vs-facets/ .
El proxy devolvió 403 al intentar consultar referencias externas. Estos son patrones propuestos para contrastar, no hallazgos atribuidos a páginas inspeccionadas. Se guardaron los dominios en el borrador del entorno; falta aplicar esa configuración para completar la investigación web.
Skills aplicadas: avios-storefront y quality-gate del repositorio. No hay otras skills de diseño en el catálogo conectado.

## Implementación por impacto
1. Familias visibles, subcategorías de galones y migas de pan.
2. Facetas combinables con conteos, URL compartible, chips y limpiar todo; panel móvil accesible.
3. Orden por relevancia/ahorro y precios desconocidos al final. Tolerancia conservadora a un error de tipeo sin aproximar códigos ni números.
4. Selector de muchos modelos con búsqueda y miniaturas vinculadas a su foto real; elección explícita.
5. Portada con accesos a familias y explicación breve de compra.
6. Pruebas de facetas, clasificación y búsquedas; verify y auditoría móvil. Documentar bloqueos externos sin falsear resultados.

## Revisión visual
El recorrido a 390 px cubrió portada, tienda, galones, búsqueda, carrito vacío, mayorista y mostrador. La ficha M2 está en `/tienda/marroqui-m2-2-5-cm` (la URL abreviada no existe). Sus 26 miniaturas ocupaban varias filas antes de llegar a la elección: se pasan a una tira horizontal, conservando las 26 fotos y el zoom. El selector permite buscar entre los 91 modelos y sigue usando `mediaIndex` para mostrar la foto real. El panel de filtros usa diálogo nativo: foco inicial, Escape y aislamiento del fondo.

## Segunda revisión y referencias verificadas
Se consultaron los componentes públicos de [Vercel Commerce](https://github.com/vercel/commerce/blob/main/components/layout/search/filter/index.tsx) y [Medusa Next.js Starter](https://github.com/medusajs/nextjs-starter-medusa/blob/main/src/modules/store/components/refinement-list/index.tsx). Commerce separa navegación de filtros entre móvil y escritorio; Medusa conserva orden y filtros en query params. Se adopta el principio de estado compartible y navegación adaptada al teléfono, sin incorporar sus dependencias ni copiar su UI.
Mobbin, Screenlane y Curated Design devolvieron 403 del proxy; quedan como referencias propuestas, no inspeccionadas. Tampoco se incorporan datos de entrevistas sin una fuente verificable.
La portada deja de repetir las 22 categorías en una segunda grilla: la entrada por familias concentra la navegación y acorta el recorrido hacia el argumento mayorista y el contacto. Instagram pasa de un banner de degradado a una tarjeta integrada a la marca, con el usuario legible en teléfono. Se incorpora una entrada breve del panel de filtros que respeta reducción de movimiento.
También se corrigió un texto residual de la portada que decía que faltaba cargar el catálogo. El contacto final lleva directamente al WhatsApp configurado, evitando un paso intermedio por Contacto. La búsqueda espera una pausa de 300 ms antes de actualizar la URL para mantener la escritura fluida y evitar una navegación por cada tecla.
La auditoría detectó una vista previa masiva del panel con casi 2.000 renglones simultáneos. Se pagina de a 50 con anterior/siguiente; el conteo y el botón indican el alcance total y la función de aplicación conserva el conjunto completo de cambios. Hay una prueba de navegador para el tamaño de cada página y el avance.

## Validación final
- `npm run verify`: aprobado (TypeScript, ESLint, cuatro suites de lógica y build).
- `npm run test:e2e -- --url=http://localhost:3004`: las cuatro suites completas aprobadas; 43 comprobaciones de catálogo, pedido, panel y navegación.
- `npm run audit -- --url=http://localhost:3004 --puerto=9224`: aprobado sobre el build de producción. 247 HTML sin tokens vacíos; 27 rutas sin violaciones WCAG ni desborde a 390 px; 675 destinos internos sin enlaces rotos. Las cinco rutas de rendimiento cumplen LCP ≤ 2.500 ms y CLS ≤ 0,1 con 4G lenta, CPU 4× y caché vacía.
- JSON generado, pricing.ts, package.json y lockfile permanecen idénticos a la base. Los cambios de precios de las pruebas ocurren en un navegador aislado y se restaura el catálogo al finalizar.

## Límites y siguiente paso
Queda completar la revisión visual de Mobbin/alternativas y las entrevistas cuando sus dominios estén accesibles. No se añadieron datos históricos sin fuente. Para materiales y colores se necesita completar los datos faltantes antes de ofrecer facetas generales. Conviene recorrer con Alejandra los galones de nombre genérico que quedan en «Otros galones», confirmar sus términos y medir búsquedas sin resultado durante la prueba del sitio. La demo conserva el acceso de demostración y el almacenamiento local que ya explica el panel.

## Revisión solicitada después de ver la demo
El primer rediseño quedó corto: cambió la organización, pero conservó una portada casi enteramente tipográfica y un listado móvil con demasiada interfaz antes de los productos. Esta segunda pasada cambia la composición: mercadería real visible en la portada, búsqueda más directa, menú de rubros lateral en escritorio, cabecera de categoría compacta y tipos en una tira horizontal en teléfono. Se mantiene la paleta y tipografía del sistema. La herramienta `sites-preview` reporta «preview relay unavailable» y el escritorio no está disponible; una URL localhost no permite acceder desde la computadora del usuario. No hay un proyecto Netlify existente informado.
En el pedido, el resumen pasa a una columna lateral en escritorio; un acceso al total en móvil lleva a entrega y confirmación cuando el pedido es largo. Carrito y panel lateral conservan ahora la foto del modelo elegido (`mediaIndex`), cubierto por una prueba con el modelo N 91. En las rutas de tienda se evita que las burbujas de contacto y volver arriba tapen precios o compitan con la barra de compra de la ficha.

### Validación de la segunda pasada
`npm run verify` aprobado tras los ajustes finales. La suite completa de navegador aprobó 44 comprobaciones, incluida la foto del modelo 91 dentro del pedido. La auditoría de la nueva composición aprobó 27 rutas sin violaciones de accesibilidad ni desbordes y 689 destinos internos sin enlaces rotos. En la medición con 4G lenta/CPU 4×: portada LCP 1.572 ms, catálogo 1.052 ms, ficha 1.840 ms; todas las cinco rutas medidas cumplieron el objetivo. Un pedido de 20 artículos se revisó a 390 px, con acceso al resumen y sin violaciones de axe. Se comprobó también `sites-preview status` fuera del aislamiento: el relay sigue no disponible. La URL pública permanece bloqueada por esa capacidad ausente; localhost es únicamente una dirección interna de desarrollo.
La portada usa también las ediciones locales del panel: textos, categorías, selección de artículos y precios de las tarjetas se recalculan desde el overlay de la demo. El caso de editar la cinta y volver a la portada se agrega a la prueba de administración. La visita normal sigue recibiendo únicamente tarjetas livianas, sin el catálogo de productos completo.
La validación posterior de sincronización con el panel pasó `npm run verify` y la suite completa de navegador: 45 comprobaciones. La medición de rendimiento durante el reinicio de desarrollo registró LCP 3.848 ms en portada y 6.716 ms en /ig; tras cerrar los navegadores de pruebas y estabilizar los procesos, la repetición aislada sobre el mismo build dio portada 2.124 ms, catálogo 1.192 ms, ficha 1.340 ms, mayorista 920 ms e /ig 1.516 ms, con CLS 0 en las cinco rutas. Se conserva la distinción entre ambas ejecuciones; son mediciones de laboratorio, no datos de tráfico real.
