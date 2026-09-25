# Meta Pixel y API de conversiones

La web utiliza el conjunto de datos `920694894141920` para enviar los eventos `PageView`, `ViewContent`, `Contact` y `Lead` desde el navegador y el servidor.

Cada interacción genera un solo `event_id`, compartido por Pixel y API de conversiones para que Meta deduplique ambas fuentes. `ViewContent` incluye el identificador estable del vehículo, marca, modelo, año, precio y moneda `MXN`. `Contact` se dispara al abrir WhatsApp y `Lead` únicamente después de una entrega exitosa del formulario.

## Variables privadas del servidor

```ini
META_PIXEL_ID=920694894141920
META_CONVERSIONS_ACCESS_TOKEN=TOKEN_GENERADO_EN_META
META_GRAPH_API_VERSION=v23.0
```

Para validar temporalmente desde **Probar eventos**, también se configura:

```ini
META_TEST_EVENT_CODE=CODIGO_MOSTRADO_POR_META
```

`META_TEST_EVENT_CODE` debe eliminarse al terminar las pruebas. Ninguna variable privada debe llevar el prefijo `VITE_`.

Los datos de nombre, teléfono y correo de un lead se normalizan y cifran con SHA-256 en el servidor antes de enviarse a Meta. El servidor también adjunta IP, agente del navegador y, cuando existen, las cookies `_fbp` y `_fbc`.
