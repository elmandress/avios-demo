# Especificación — Catálogo operativo de Mercería Avíos

Documento técnico del sistema. No es material de venta: la propuesta comercial
va aparte y se apoya en esto.

**Versión** 1.0 · **Estado** demo funcional, pendiente de aprobación de alcance
**Cliente** Alejandra Calvete — Mercería Avíos, San José 851 esq. Andes, Montevideo

---

## 1. Propósito

Avíos ya tiene su catálogo. El problema no es que le falte: es que **el que
tiene no se puede consultar**.

Hoy conviven dos soportes, y los dos tienen el mismo defecto:

- un **libro de papel** en el mostrador, donde se busca a mano mientras el
  cliente espera;
- un **PDF de aproximadamente 720 páginas** que se manda por WhatsApp cuando
  alguien pide el catálogo, y que el cliente tiene que recorrer solo.

Ninguno de los dos se puede buscar, ninguno se actualiza sin rehacerlo entero, y
ninguno sabe qué le están pidiendo.

Este sistema no reemplaza esos soportes por un sitio web: los convierte en **una
sola fuente de datos consultable**, de la que salen el mostrador, la tienda
pública, el catálogo de WhatsApp, la ficha de Google y la lista impresa.

### 1.1 Objetivos medibles

| ID | Objetivo | Cómo se mide |
|---|---|---|
| OBJ-1 | Encontrar cualquier artículo en menos de 5 segundos | Tiempo desde que se empieza a escribir hasta ver el precio |
| OBJ-2 | Dejar de mandar el PDF completo | Se manda un enlace o una lista, nunca el archivo |
| OBJ-3 | Un aumento de precios pasa de horas a minutos | Ajuste masivo con vista previa |
| OBJ-4 | Un precio se cambia en un solo lugar | Los cinco canales leen del mismo dato |
| OBJ-5 | Saber qué piden y no está | Registro de búsquedas sin resultado |

### 1.2 Fuera de alcance

Explícito, para que no haya discusión después:

- **No hay cobro en línea.** Ni pasarela, ni tarjetas, ni MercadoPago. Todos los
  pedidos terminan en WhatsApp.
- **No hay control de stock.** El sistema no sabe cuántos metros quedan. Un
  artículo se marca "sin stock" a mano.
- **No hay cuentas de cliente.** Nadie se registra. Los datos del comprador
  viven en su navegador.
- **No hay facturación.** Eso lo sigue haciendo el sistema de gestión actual.
- **No hay logística ni seguimiento de envíos.**
- **No se generan las fotos.** Las provee el cliente.
- **No se redactan descripciones de producto** más allá de las que ya existen en
  el catálogo en papel.

---

## 2. Actores

| Actor | Quién es | Qué necesita |
|---|---|---|
| **Dueña** | Alejandra | Cargar y mantener el catálogo, mover precios, publicar |
| **Quien atiende** | Ella o un empleado | Contestar en segundos con el cliente enfrente |
| **Cliente minorista** | Alguien que necesita 3 metros de cinta | Saber si lo tienen y cuánto sale, sin preguntar |
| **Cliente mayorista** | Modista, taller, escuela de costura | Comparar precios, armar un pedido grande, repetirlo |
| **Buscadores y catálogos** | Google, Meta | Datos estructurados y feeds válidos |

---

## 3. Requisitos funcionales

Numerados para poder trazarlos contra el código y contra las pruebas. El estado
es el de hoy, no el del contrato.

### 3.1 Catálogo — modelo de datos

| ID | Requisito | Estado |
|---|---|---|
| RF-01 | Un producto pertenece a una categoría y tiene nombre, descripción, código y fotos | ✅ |
| RF-02 | Un producto tiene una o más **variantes** (ancho, color, medida, modelo) | ✅ |
| RF-03 | Una variante tiene una o más **presentaciones** (por metro, pieza cerrada, unidad) | ✅ |
| RF-04 | Cada presentación guarda precio total, contenido y precio por unidad | ✅ |
| RF-05 | El precio por mayor cuelga de la presentación, **no del cliente** | ✅ |
| RF-06 | Un dato que no existe se guarda como `null` y se marca en `needsReview`; **nunca se completa con un valor verosímil** | ✅ |
| RF-07 | El sistema verifica que precio, contenido y precio unitario sean consistentes | ✅ `integrity.ts` |

### 3.2 Búsqueda

| ID | Requisito | Estado |
|---|---|---|
| RF-10 | Buscar por nombre, categoría, medida y **código** | ✅ |
| RF-11 | El código tiene prioridad sobre cualquier otra coincidencia | ✅ |
| RF-12 | La búsqueda acepta palabras sueltas en cualquier orden ("cinta gross 15") | ✅ |
| RF-13 | Conoce el vocabulario del rubro (piolín, humita, grosgrain, satén) | ✅ `match.ts` |
| RF-14 | Los números se comparan como palabra entera: "4 mm" no trae la de 40 mm | ✅ |
| RF-15 | **No inventa resultados**: lo que no se vende no aparece | ✅ probado |
| RF-16 | Una búsqueda sin resultado queda registrada con fecha | ✅ |

### 3.3 Mostrador — quien atiende

| ID | Requisito | Estado |
|---|---|---|
| RF-20 | Pantalla propia, sin navegación ni carrito, con el foco en la búsqueda | ✅ `/mostrador` |
| RF-21 | Los resultados son **por variante**, no por producto | ✅ |
| RF-22 | Cada resultado muestra precio, precio por unidad, código y si es por mayor | ✅ |
| RF-23 | Copiar la respuesta lista para pegar en el chat, con enlace | ✅ |
| RF-24 | Armar una lista de varios artículos y copiarla entera | ✅ |
| RF-25 | Usable en teléfono, de pie, con una mano | ✅ |

### 3.4 Tienda pública — el cliente

| ID | Requisito | Estado |
|---|---|---|
| RF-30 | Catálogo navegable por categoría, con filtros y orden | ✅ |
| RF-31 | Ficha con fotos, variantes, presentaciones y precios | ✅ |
| RF-32 | Aviso automático cuando conviene la pieza cerrada | ✅ |
| RF-33 | Carrito que acepta artículos por menor y por mayor mezclados | ✅ |
| RF-34 | El pedido se envía **por WhatsApp**, con el detalle armado | ✅ |
| RF-35 | Vista previa del mensaje antes de enviarlo | ✅ |
| RF-36 | **Volver a pedir** el pedido anterior, con los precios de hoy | ✅ |
| RF-37 | Guardar artículos en una lista | ✅ `/mi-lista` |
| RF-38 | Búsqueda sin resultado ofrece preguntar por WhatsApp | ✅ |

### 3.5 Panel — la dueña

| ID | Requisito | Estado |
|---|---|---|
| RF-40 | Alta, baja, edición y orden de productos, variantes y presentaciones | ✅ |
| RF-41 | Categorías y descuentos | ✅ |
| RF-42 | **Ajuste masivo de precios** por porcentaje, con redondeo y vista previa | ✅ |
| RF-43 | Edición de los textos del sitio | ✅ |
| RF-44 | Importar el catálogo desde planilla, con validación fila por fila | ✅ |
| RF-45 | La importación **no aplica nada si hay un error**, y no borra por omisión | ✅ |
| RF-46 | Exportar el catálogo en planilla y en respaldo restaurable | ✅ |
| RF-47 | Generar texto de publicación para Instagram y para la ficha de Google | ✅ |
| RF-48 | Ver qué buscaron y no encontraron | ✅ |
| RF-49 | Lista de pendientes de datos por confirmar | ✅ |

### 3.6 Salidas y canales

| ID | Requisito | Estado |
|---|---|---|
| RF-50 | Lista de precios completa, imprimible en A4 y guardable en PDF | ✅ |
| RF-51 | Feed para Meta (catálogo de WhatsApp e Instagram) | ✅ |
| RF-52 | Feed para Google Merchant Center | ✅ |
| RF-53 | Datos estructurados de negocio local (dirección, horario, mapa) | ✅ |
| RF-54 | Mapa del sitio y robots | ✅ |
| RF-55 | Página para el enlace de la bio de Instagram | ✅ `/ig` |

---

## 4. Requisitos no funcionales

Cada uno con su forma de comprobarlo. **Un RNF sin forma de medirlo es una
opinión**, y no entra acá.

### 4.1 Rendimiento

| ID | Requisito | Cómo se verifica | Medición actual |
|---|---|---|---|
| RNF-01 | LCP ≤ 2.500 ms en 4G lenta con CPU 4× más lenta | `npm run audit` | 920–1.608 ms |
| RNF-02 | CLS ≤ 0,1 | `npm run audit` | 0–0,025 |
| RNF-03 | Ninguna vista renderiza el catálogo completo de una vez | Revisión de código | Tandas de 24 |
| RNF-04 | Las páginas se sirven pre-renderizadas desde CDN | Salida del build | 25 rutas estáticas |

### 4.2 Costo de operación

| ID | Requisito | Cómo se verifica |
|---|---|---|
| RNF-10 | El egress de la base **no crece con el tráfico** | Caché compartida por etiqueta; una lectura por regeneración |
| RNF-11 | La base se lee sólo cuando los datos cambian | `revalidate: false` + webhook a `/api/revalidar` |
| RNF-12 | Las imágenes **no** se sirven desde la base de datos | CDN estático |
| RNF-13 | El sistema opera dentro de planes gratuitos para un cliente | Ver §6.3 |

### 4.3 Accesibilidad y compatibilidad

| ID | Requisito | Cómo se verifica | Medición actual |
|---|---|---|---|
| RNF-20 | Cero violaciones WCAG 2.1 AA | axe-core sobre todas las rutas | 0 en 25 rutas |
| RNF-21 | Ninguna página se corre horizontalmente a 390 px | `npm run audit` | 0 en 25 rutas |
| RNF-22 | Todo lo interactivo alcanzable por teclado con foco visible | Revisión manual |
| RNF-23 | Área táctil mínima de 44 px en el mostrador | Revisión de estilos |

### 4.4 Corrección de los datos

| ID | Requisito | Cómo se verifica |
|---|---|---|
| RNF-30 | La ficha, el carrito, el mensaje de WhatsApp y la lista impresa dicen **el mismo precio** | Un solo módulo de cálculo: `pricing.ts` |
| RNF-31 | Un catálogo inconsistente detiene el build en desarrollo | `assertCatalogIntegrity` |
| RNF-32 | El respaldo vuelve a entrar sin perder ningún precio | `npm test` — 58 de 58 idénticos |
| RNF-33 | La planilla se lee con separador coma **y** punto y coma, y con decimales en los dos formatos | `npm test` |

### 4.5 Seguridad

| ID | Requisito | Estado |
|---|---|---|
| RNF-40 | El panel no es indexable | ✅ `robots.ts` |
| RNF-41 | El endpoint de invalidación exige secreto y **falla cerrado** sin él | ✅ |
| RNF-42 | La demo declara en pantalla que su login **no es seguridad** | ✅ |
| RNF-43 | Antes de publicar con datos reales: autenticación real y RLS | ⚠️ **pendiente, bloqueante** |

### 4.6 Mantenibilidad y portabilidad

| ID | Requisito | Estado |
|---|---|---|
| RNF-50 | Identidad, dirección, teléfono y horario en un solo módulo | ✅ `env.ts` (`BRAND`) |
| RNF-51 | Tokens de diseño en un módulo neutro, usable desde servidor y cliente | ✅ `tokens.ts` |
| RNF-52 | El sitio funciona **sin base de datos** (modo demo) | ✅ |
| RNF-53 | Si la base falla, se sirve el catálogo local completo, nunca uno a medias | ✅ |
| RNF-54 | Puerta de calidad reproducible con un comando | ✅ `npm run verify` |
| RNF-55 | Los datos del cliente son exportables en formato abierto | ✅ CSV y JSON |

### 4.7 Idioma y localización

| ID | Requisito |
|---|---|
| RNF-60 | Todo en español rioplatense, con voseo |
| RNF-61 | Precios en pesos uruguayos, con punto de miles y coma decimal |
| RNF-62 | Fechas en formato local; la lista impresa se fecha en UTC para no correrse un día |

---

## 5. Casos de uso principales

### CU-01 · Contestar una consulta en el mostrador

**Actor** Quien atiende · **Disparador** Un cliente pregunta por un artículo

1. Abre `/mostrador` en el teléfono.
2. Escribe el código, el nombre o la medida.
3. El sistema muestra las presentaciones que coinciden, con precio.
4. Le dice el precio, o copia la respuesta y la pega en el chat.

**Alternativo 4a** — Son varios artículos: los suma a la lista y copia la lista
entera.
**Alternativo 3a** — Sin resultados: queda registrado en el panel.

**Criterio de aceptación** Menos de 5 segundos desde la primera tecla.

### CU-02 · Un cliente arma un pedido solo

**Actor** Cliente mayorista · **Disparador** Necesita reponer

1. Entra por el enlace de Instagram, por Google o por un enlace que le mandaron.
2. Busca o navega por categoría.
3. Elige variante, presentación y cantidad.
4. Si conviene la pieza cerrada, el sistema se lo dice.
5. Agrega al pedido y repite.
6. Revisa el pedido y la vista previa del mensaje.
7. Envía por WhatsApp.

**Alternativo 1a** — Ya compró antes: "volver a pedir lo mismo" arma el pedido
con los precios de hoy.

**Criterio de aceptación** Un pedido de 20 artículos se arma sin escribir 20
mensajes.

### CU-03 · Aumentar los precios

**Actor** Dueña · **Disparador** Cambio de lista de un proveedor

1. Entra al panel → Ajustar precios.
2. Elige alcance (todo, una categoría, un producto), porcentaje y redondeo.
3. **Ve la vista previa**: cada precio, antes y después.
4. Aplica.
5. El sistema invalida la caché y los cinco canales quedan al día.

**Criterio de aceptación** Ningún precio cambia sin haberse visto antes.

### CU-04 · Cargar cientos de artículos

**Actor** Dueña o quien digitalice · **Disparador** Alta masiva

1. Baja la planilla desde Respaldo.
2. La completa en Excel.
3. La sube.
4. El sistema informa cuántos entran, cuántos se actualizan, cuántos quedan
   intactos y **qué fila tiene cada error**.
5. Confirma.

**Excepción** Si hay un solo error, **no entra ninguna fila**.

**Criterio de aceptación** El catálogo nunca queda cargado a medias.

---

## 6. Diseño

### 6.1 Modelo de dominio

```
Categoría ──1:N── Producto ──1:N── Variante ──1:N── Presentación
                     │                                   │
                     ├── Foto (0:N)                      ├── nivel: menor | mayor
                     ├── Color (0:N, informativo)        ├── unidad: m | yd | u
                     └── needsReview (0:N)               ├── contenido
                                                         ├── precio
Descuento ──aplica a── Producto | Categoría | Todo       └── precio por unidad
```

**La decisión que sostiene todo:** el precio por mayor cuelga de la
**presentación**, no del cliente. Por eso el sistema no necesita login de
mayorista — el descuento depende de *qué* se lleva, no de *quién* es.

El sistema anterior modelaba esto como un "talle" cuyo texto decía
`"4 mm (Nro 0) · mayorista, pieza x100m"`. Con el precio adentro de una cadena,
nada podía calcular el total, el ahorro ni el precio por metro — que es
justamente lo que decide la compra.

### 6.2 Arquitectura

```
┌──────────────┐   webhook al cambiar   ┌─────────────────┐
│   Supabase   │ ─────────────────────▶ │ /api/revalidar  │
│ (una lectura │                        │ revalidateTag   │
│  por cambio) │ ◀───── lee ──────      └────────┬────────┘
└──────────────┘                                 │ invalida
                                                 ▼
                                        ┌──────────────────┐
                                        │  caché por tag   │
                                        └────────┬─────────┘
                                                 │ una lectura compartida
                        ┌────────────────────────┼────────────────────────┐
                        ▼            ▼           ▼            ▼           ▼
                   /mostrador    /tienda    lista impresa  feed Meta  feed Google
                   (atiende)    (cliente)    (papel)      (WhatsApp)  (buscador)
```

**Decisiones y su motivo:**

| Decisión | Por qué |
|---|---|
| Generación estática + revalidación por etiqueta | El egress de la base deja de depender del tráfico |
| Caché sin vencimiento por tiempo, invalidada por webhook | Releer "por las dudas" es lo que agota la cuota |
| Imágenes fuera de la base | Es de donde saldría el 95% del egress |
| Un solo módulo de precios | Cinco canales no pueden decir cinco números |
| El catálogo del panel guarda **la elección**, no los precios | Un carrito viejo no puede cobrar un precio viejo |
| Modo demo sin red | Se puede mostrar y desarrollar sin base ni costo |

### 6.3 Costo de operación

Con la arquitectura de arriba, para **un** cliente:

| Componente | Plan | Costo |
|---|---|---|
| Base de datos | Supabase Free (5 GB egress, 500 MB) | USD 0 |
| Alojamiento | CDN con ancho de banda incluido | USD 0 |
| Imágenes | Storage con egress gratuito | USD 0 |
| Dominio | — | ~USD 15/año |

**Cuándo deja de alcanzar:** con el tercer cliente (el plan gratuito admite dos
proyectos), no por tráfico. Con un proyecto compartido y aislamiento por fila,
un solo plan pago cubre decenas de clientes.

**Advertencia operativa:** un proyecto gratuito **se pausa a la semana sin
actividad**. Requiere un ping programado.

---

## 7. Supuestos y restricciones

| ID | Supuesto | Si no se cumple |
|---|---|---|
| SUP-1 | El catálogo se entrega en algún formato digital (PDF, planilla, fotos) | El proyecto no puede empezar |
| SUP-2 | El cliente provee las fotos | Los artículos sin foto no entran a los catálogos externos |
| SUP-3 | Existe una cuenta de Google y una de Meta del negocio | No se pueden conectar los canales |
| SUP-4 | Se confirma **cuál de los dos teléfonos** es el correcto | Los pedidos van a un número equivocado |
| SUP-5 | El cliente compra un dominio | El sitio queda en una dirección provisoria |

---

## 8. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | El PDF no se puede extraer con calidad suficiente | Alto — es el corazón del proyecto | Prueba sobre 20 páginas **antes** de cerrar el alcance |
| R-2 | El catálogo entregado está incompleto o desactualizado | Alto | Los faltantes se marcan, no se inventan |
| R-3 | El sitio se publica y no se mantiene | Medio | La cuota incluye la carga; se dice de frente que esto funciona si se usa |
| R-4 | Se supera la cuota del navegador en la demo | Bajo | Avisa en pantalla; desaparece con la base conectada |
| R-5 | El login de demo llega a producción | **Crítico** | RNF-43 es bloqueante para publicar |

---

## 9. Criterios de aceptación

El sistema se considera entregado cuando:

1. `npm run verify` pasa entero (typecheck, lint, pruebas, build).
2. `npm run audit` da cero violaciones de accesibilidad y cero desbordes.
3. El catálogo acordado está cargado y los pendientes están marcados.
4. Un artículo cualquiera se encuentra en menos de 5 segundos en `/mostrador`.
5. Un pedido llega completo y correcto al WhatsApp del negocio.
6. La lista de precios imprime en A4 sin nada del marco del sitio.
7. Los canales acordados están conectados y leyendo el feed.
8. La dueña cargó, editó y borró un producto **por su cuenta**, sin ayuda.

El punto 8 es el que importa. Un sistema que sólo puede operar quien lo hizo no
está entregado.

---

## 10. Verificación

| Comando | Qué comprueba | Necesita |
|---|---|---|
| `npm test` | Búsqueda, respaldo e importación | Nada |
| `npm run typecheck` | Tipos | Nada |
| `npm run lint` | Reglas del proyecto y de React | Nada |
| `npm run build` | Que compile y pre-renderice | Nada |
| `npm run verify` | Los cuatro anteriores, en orden | Nada |
| `npm run audit` | Accesibilidad, layout móvil, enlaces, rendimiento | Sitio andando + navegador |
| `npm run test:e2e` | Recorridos completos en navegador | Sitio andando + navegador |

Al agregar una página hay que sumarla a `scripts/audit/lib/rutas.mjs`. Si no, la
auditoría pasa en verde sin haberla mirado nunca.

---

## 11. Matriz de trazabilidad

Cada requisito contra el código que lo implementa y la prueba que lo comprueba.

**Para qué sirve de verdad:** un requisito sin prueba es una intención, y un
archivo sin requisito es código que nadie pidió. Las filas con «revisión manual»
son deuda declarada, no un olvido.

| Requisito | Dónde vive | Cómo se comprueba |
|---|---|---|
| RF-01 … RF-05 · Modelo producto → variante → presentación | `catalog/types.ts` | Tipos + `npm run typecheck` |
| RF-06 · Los datos que faltan no se inventan | `catalog/data.ts` (`needsReview`) | Revisión manual + `/panel` |
| RF-07 · Integridad de precios | `catalog/integrity.ts` | Corre en cada build |
| RF-10 … RF-13 · Búsqueda por código, palabras y sinónimos | `search/match.ts` | `test/busqueda.mjs` — 33 casos |
| RF-14 · Los números son palabra entera | `search/match.ts` (`contiene`) | `test/busqueda.mjs` — «4 mm» no trae 40 mm |
| RF-15 · No inventa resultados | `search/match.ts` | `test/busqueda.mjs` — 7 casos que deben dar vacío |
| RF-16 · Registro de búsquedas sin resultado | `search/log.ts` | Revisión manual en `/panel/busquedas` |
| RF-20 … RF-25 · Mostrador | `app/mostrador/` | `npm run audit` + prueba manual guiada |
| RF-21 · Resultados por variante | `search/match.ts` (`textoDeFila`) | Verificado en navegador |
| RF-30 … RF-32 · Grilla, ficha y aviso de pieza | `app/(tienda)/tienda/` | `npm run audit` |
| RF-33 … RF-35 · Carrito y mensaje | `lib/cart/`, `cart/whatsapp.ts` | `test:e2e/compra.mjs` |
| RF-36 · Volver a pedir | `cart/ultimo-pedido.ts` | Verificado de punta a punta |
| RF-40 … RF-43 · Panel | `app/panel/` | `test:e2e/panel.mjs` |
| RF-42 · Ajuste masivo | `admin/store.ts` (`previewPriceAdjustment`) | Aritmética verificada en los 3 redondeos |
| RF-44 · Importar planilla | `admin/importar.ts` | `test/importar.mjs` — ida y vuelta completa |
| RF-45 · Todo o nada, sin borrar por omisión | `admin/importar.ts` | `test/importar.mjs` — 6 casos de rechazo |
| RF-46 · Respaldo | `admin/respaldo.ts` | `test/respaldo.mjs` — 58 de 58 precios |
| RF-47 · Textos de publicación | `admin/publicacion.ts` | Revisión manual |
| RF-50 · Lista imprimible | `app/(tienda)/lista-de-precios/` | PDF generado y verificado |
| RF-51 · Feed de Meta | `app/catalogo-meta.csv/` + `catalog/feed.ts` | Columnas verificadas |
| RF-52 · Feed de Google | `app/merchant-feed.xml/` + `catalog/feed.ts` | Misma fuente que RF-51 |
| RNF-01, RNF-02 · Rendimiento | Generación estática | `npm run audit --solo=vitals` |
| RNF-10, RNF-11 · Egress desacoplado del tráfico | `catalog/index.ts` + `api/revalidar/` | Revisión de arquitectura |
| RNF-20 · Accesibilidad | Todo el sitio | `npm run audit --solo=a11y` — 25 rutas |
| RNF-21 · Sin desborde móvil | Todo el sitio | `npm run audit --solo=layout` — 25 rutas |
| RNF-30 · Un solo cálculo de plata | `catalog/pricing.ts` | Todos los consumidores importan de ahí |
| RNF-32, RNF-33 · Respaldo e importación robustos | `admin/respaldo.ts`, `admin/importar.ts` | `npm test` |
| RNF-41 · Endpoint con secreto que falla cerrado | `api/revalidar/route.ts` | Devuelve 503 sin secreto, 401 con secreto malo |
| RNF-50 · Identidad en un solo lugar | `lib/env.ts` (`BRAND`) | Revisión de acoplamiento |

### 11.1 Deuda declarada

Lo que hoy sólo se comprueba mirando. Está acá para que se decida, no para que
se descubra:

| Qué | Riesgo si se rompe |
|---|---|
| RF-16 y RF-47 no tienen prueba automática | Un cambio podría romperlos en silencio |
| RF-20…RF-25 (mostrador) se prueba a mano | Es la pantalla más usada; merece prueba propia |
| RNF-22 (teclado) y RNF-23 (área táctil) | axe no los cubre enteros |

---

## 12. Árbol de decisión técnica

Las bifurcaciones donde se eligió, y qué había del otro lado. Sirve para que el
próximo que lea no repita la discusión — o para revertir con conocimiento.

```
¿Dónde vive el catálogo?
├── Sólo en un archivo del repo
│     + gratis, cero infraestructura
│     − la dueña no puede editar sin un despliegue          → descartado
├── Base de datos consultada en cada visita
│     + siempre fresco
│     − el egress crece con el tráfico; revienta la cuota   → descartado
└── Base + generación estática + invalidación por webhook   ← ELEGIDO
      + el egress depende de los cambios, no del tráfico
      − hay que configurar el webhook una vez

¿Cómo se paga?
├── Pasarela de pago en línea
│     − comisiones, contracargos, y el 64% de los compradores
│       latinoamericanos prefiere cerrar en el chat          → descartado
└── El pedido termina en WhatsApp                            ← ELEGIDO
      + es donde el negocio ya vende

¿Hace falta carrito?
├── No, sólo catálogo
│     − quien necesita 20 artículos escribe 20 mensajes      → descartado
└── Sí, pero termina en WhatsApp                             ← ELEGIDO
      + los portales de autogestión bajan 30-60% las consultas
        repetitivas y suben 25-40% los pedidos recurrentes

¿Login de mayorista?
├── Sí, con precios por cliente
│     − el mayorista que llega de Instagram no crea cuenta   → descartado
└── No: el precio por mayor cuelga de la presentación        ← ELEGIDO
      + el modelo de datos lo soporta si algún día hace falta

¿Cómo entran cientos de artículos?
├── De a uno por formulario
│     − semanas de trabajo; no lo hace nadie                 → descartado
└── Por planilla, con validación fila por fila               ← ELEGIDO
      + la planilla es la misma que exporta el respaldo

¿Dónde viven las imágenes?
├── En la base de datos
│     − 10.000 visitas = 12 GB/mes = cuota agotada           → descartado
└── En el CDN, con egress gratuito                           ← ELEGIDO

¿Una pantalla para todos?
├── Sí, /tienda sirve para atender también
│     − quien atiende necesita una respuesta, no una ficha   → descartado
└── Dos modos sobre el mismo catálogo                        ← ELEGIDO
      + /mostrador para atender, /tienda para el cliente
      + una sola fuente de verdad; nadie mantiene dos catálogos
```
