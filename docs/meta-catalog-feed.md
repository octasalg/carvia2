# Feed de vehículos para Meta

## Formato elegido

Los archivos entregados por Meta corresponden a **Vehicle Offers / Automotive Model Offers** porque su identificador es `vehicle_offer_id` y contienen campos de una oferta (`amount_price`, `downpayment`, `term_length`, etc.). No corresponden al formato **Automotive Inventory**, que normalmente representa unidades individuales mediante `vehicle_id`, VIN, kilometraje, estado del vehículo y datos del distribuidor.

Carvía administra unidades reales individuales, pero actualmente no guarda VIN, número de stock, combustible, tracción ni información estructurada del distribuidor. Para no mezclar esquemas ni inventar datos, esta integración conserva exactamente el formato Vehicle Offer proporcionado y representa cada unidad publicada como una oferta individual. El UUID permanente de `autos.id` se utiliza como `vehicle_offer_id`.

Si más adelante se requiere Automotive Inventory, primero deben añadirse a la base los campos obligatorios que falten y debe crearse un mapper independiente.

## Endpoints

- CSV prioritario: `/feeds/meta/vehicles.csv?token=TOKEN`
- XML opcional: `/feeds/meta/vehicles.xml?token=TOKEN`

Ambos se generan en cada petición desde Supabase y solo incluyen vehículos visibles, no vendidos y que no estén marcados como “Próximamente”. El CSV conserva el orden de columnas del archivo `catalog_vehicle_offer.csv` entregado por Meta y omite su primera fila de comentarios.

## Configuración

Variables del servidor:

```env
META_CATALOG_FEED_TOKEN=un_valor_largo_y_aleatorio
PUBLIC_BASE_URL=https://www.tudominio.com
```

Variables que ya usa el servidor para consultar Supabase:

```env
VITE_SUPABASE_URL=https://proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=clave_anon_publica
```

El token del feed nunca debe usar el prefijo `VITE_`, porque no debe quedar incluido en el JavaScript público.

Para el Pixel:

```env
VITE_META_PIXEL_ID=920694894141920
```

Después de agregar o modificar una variable de Vite se necesita volver a compilar y desplegar.

## Mapeo actual

| Campo Meta | Campo Carvía / regla |
|---|---|
| `vehicle_offer_id` | `autos.id` (UUID permanente) |
| `title` | año + marca + modelo + versión |
| `availability` | `AVAILABLE` cuando está visible, no vendido y no próximamente |
| `price` | `precio` con dos decimales + `MXN` |
| `amount_price` | mismo precio publicado; importe de la oferta de contado |
| `offer_type` | `cash` cuando existe un precio publicado |
| `offer_description` | `descripcion`; si falta, resumen con datos existentes |
| `url` | `PUBLIC_BASE_URL/auto/{autos.id}` |
| `image[0].url` | primera URL pública válida de `imagenes` |
| `image[0].tag[0]` | `EXTERIOR` |
| `make` | `marca` |
| `model` | `modelo` |
| `year` | `anio` |
| `transmission` | `transmision`, normalizada |
| `body_style` | `tipo`, normalizado |
| `exterior_color` | `color_exterior` |
| `interior_color` | `color_interior` |
| `trim` | `version` |
| `custom_label_0` | `Seminuevo` |
| `custom_label_1` | `tipo` |
| `custom_label_2` | `transmision` |
| `custom_number_0` | `kilometraje` |
| `product_tags[0]` | `Certificado x Carvía` |
| `product_tags[1]` | `Destacado`, cuando corresponde |

## Campos vacíos

Se dejan vacíos los campos para los que la base no contiene información confiable: disclaimer legal y su URL, videos, app links, cashback, fechas de vigencia, códigos ComScore, margen, combustible, tracción, generación, tapicería, prioridades y los campos de financiamiento (`amount_percentage`, `downpayment`, `term_length` y sus calificadores). `amount_price` y `offer_type` sí se llenan como oferta de contado utilizando exactamente el precio publicado del vehículo.

Aunque la web calcula una mensualidad estimada, ese cálculo no se guarda como una oferta contractual en la base. Por esa razón no se exporta como financiamiento a Meta.

## Imágenes

`getVehiclePublicImageUrls(vehicle)` elimina valores inválidos y duplicados, rechaza rutas locales, `localhost`, base64, blobs, URLs firmadas/temporales y credenciales en la URL. Convierte rutas relativas en absolutas utilizando `PUBLIC_BASE_URL` y mantiene primero el orden guardado en `imagenes`, donde la primera fotografía es la principal.

El CSV de referencia solo define `image[0].url`, por lo que el CSV publica la foto principal sin inventar columnas fuera del template. El endpoint XML reutiliza el mismo mapper y agrega todas las imágenes públicas válidas mediante elementos `<image>` repetidos.

## Pixel y coincidencia de IDs

El Pixel carga una sola vez desde `https://connect.facebook.net/en_US/fbevents.js`. Registra `PageView` en la carga inicial y una vez por navegación de la SPA.

En `/auto/:id`, `ViewContent` usa `getMetaVehicleId(vehicle)`, la misma función que genera `vehicle_offer_id`:

```js
fbq("track", "ViewContent", {
  content_type: "vehicle",
  content_ids: [vehicle_offer_id],
});
```

Aunque el catálogo es de tipo Vehicle Offer, la coincidencia se mantiene mediante el mismo ID exacto entre el artículo del catálogo y `content_ids`. Antes de migrar a Automotive Inventory se debe validar en Commerce Manager el tipo de catálogo y cambiar de forma coordinada tanto el mapper como el evento; no se deben mezclar `vehicle_id` y `vehicle_offer_id`.

La función `trackMetaLead` queda preparada, pero no se conecta todavía a formularios ni WhatsApp para evitar alterar conversiones sin una definición de negocio.

## Configuración en Commerce Manager

1. Abre Commerce Manager y selecciona o crea un catálogo automotriz compatible con Vehicle Offers.
2. En **Orígenes de datos / Data sources**, elige **Feed de datos**.
3. Selecciona una actualización programada mediante URL.
4. Ingresa la URL CSV completa con el token.
5. Configura una actualización diaria o con la frecuencia permitida que prefieras.
6. Selecciona MXN y la zona horaria de México cuando la interfaz lo solicite.
7. Ejecuta una carga de prueba y revisa los diagnósticos de artículos rechazados.
8. Conserva el token como secreto. Para revocar el acceso, cambia `META_CATALOG_FEED_TOKEN` y vuelve a desplegar.

La ubicación exacta de estos controles puede variar en la interfaz de Meta. Consulta la ayuda oficial de [catálogos de Meta](https://www.facebook.com/business/help/1275400645914358) si Commerce Manager presenta nombres diferentes.
