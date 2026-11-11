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
