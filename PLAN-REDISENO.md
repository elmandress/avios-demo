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
