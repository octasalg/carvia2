# 🚀 Despliegue de CARVÍA en Hostinger VPS + Easypanel (Docker)

Guía para desplegar la web de catálogo de seminuevos **CARVÍA** en un VPS de
Hostinger (KVM 2 · Ubuntu 24.04 · Easypanel) usando Docker, desde GitHub.

- **Framework:** React 19 + Vite 8 (SPA estática)
- **Servidor en runtime:** Nginx (puerto **80** dentro del contenedor)
- **Base de datos / Auth / Storage:** Supabase (claves públicas)

---

## 0. Requisitos previos

- VPS con Easypanel ya instalado y accesible (`https://IP_DEL_VPS:3000` o tu panel).
- Repositorio en GitHub con este proyecto (incluyendo `Dockerfile`, `nginx.conf`
  y `.dockerignore`, que ya están en el repo).
- Acceso al panel de Supabase del proyecto.
- (Opcional) Un dominio apuntando al VPS.

---

## 1. Crear la App en Easypanel

1. Entra a tu panel de Easypanel.
2. Crea (o entra a) un **Project** — p. ej. `carvia`.
3. Dentro del proyecto: **+ Create Service → App**.
4. Ponle un nombre, p. ej. `carvia-web`.

---

## 2. Conectar el repositorio de GitHub

En la pestaña **Source** del servicio:

1. Selecciona **GitHub** como origen.
2. Conecta tu cuenta de GitHub (si es la primera vez, autoriza la GitHub App de Easypanel).
3. Elige:
   - **Owner / Repository:** el repo de CARVÍA.
   - **Branch:** `main` (o la rama que uses para producción).
4. En **Build** elige **Dockerfile**.
   - **Build path / context:** `/` (raíz del repo).
   - **Dockerfile path:** `Dockerfile`.

> Easypanel detectará el `Dockerfile` y construirá la imagen multi-stage
> (Node para el build → Nginx para servir).

---

## 3. ⚠️ Variables de entorno (paso crítico)

> **Importante:** Vite "hornea" las variables `VITE_*` **durante el build**, no en
> tiempo de ejecución. Easypanel pasa las variables del entorno del servicio como
> **build args** al construir la imagen (el `Dockerfile` ya las declara como `ARG`).
> Por eso **debes definirlas ANTES de desplegar**; si las cambias después, hay que
> **redesplegar** para que tomen efecto.

En la pestaña **Environment** del servicio, agrega:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
VITE_EMAILJS_SERVICE_ID=tu_service_id
VITE_EMAILJS_TEMPLATE_ID=tu_template_id
VITE_EMAILJS_PUBLIC_KEY=tu_public_key
VITE_WHATSAPP_NUMBER=521XXXXXXXXXX
```

(Los nombres exactos están en `.env.example`.)

**Seguridad:**
- Usa **solo** la `anon key` pública de Supabase. La protección real son las
  **políticas RLS** de tu base de datos, no el ocultar la clave.
- **NUNCA** pongas la `SUPABASE_SERVICE_ROLE_KEY` aquí: es secreta y, al ser una
  SPA, quedaría expuesta en el JavaScript del navegador. El proyecto no la usa.

---

## 4. Puerto a exponer

Este proyecto se sirve con **Nginx dentro del contenedor en el puerto `80`**.

En la pestaña **Proxy / Domains** del servicio:

- **Port (puerto interno del contenedor):** `80`

> Nota: el `80` es el puerto *interno* del contenedor. Easypanel (Traefik) se
> encarga del enrutado externo por HTTP/HTTPS; no necesitas abrir puertos a mano.

---

## 5. Agregar el dominio

En la pestaña **Domains** del servicio:

1. **Add Domain** → escribe tu dominio, p. ej. `carvia.com` o `www.carvia.com`.
2. Asegúrate de que el **Port** asociado al dominio sea `80`.
3. En tu proveedor DNS, crea un registro **A** apuntando a la **IP del VPS**:
   ```
   A    @      IP_DEL_VPS
   A    www    IP_DEL_VPS
   ```
   (o un `CNAME` de `www` hacia el dominio raíz).

Espera a que el DNS propague (minutos a unas horas).

---

## 6. Activar SSL (HTTPS)

Easypanel usa Let's Encrypt automáticamente:

1. En **Domains**, en el dominio agregado, activa **HTTPS / SSL** (toggle de candado).
2. Easypanel emite el certificado automáticamente una vez el DNS apunta al VPS.
3. Activa **Redirect HTTP → HTTPS** para forzar tráfico seguro.

> Si el certificado falla, casi siempre es porque el DNS aún no apunta al VPS.
> Verifica el registro A y reintenta.

---

## 7. Desplegar

1. Pulsa **Deploy**.
2. Observa los **logs de build**: verás `npm ci`, luego `vite build` y, al final,
   el arranque de Nginx.
3. Cuando termine, abre tu dominio: la web debe cargar y las rutas internas
   (`/catalogo`, `/auto/:id`, `/admin`, etc.) deben funcionar al recargar
   (gracias al fallback a `index.html` en `nginx.conf`).

**Despliegue continuo:** activa **Auto Deploy** en la pestaña Source para que cada
`git push` a la rama de producción dispare un nuevo build automáticamente.

---

## 8. Supabase Auth — Redirect URLs (panel de administración)

El proyecto tiene login de administrador con Supabase Auth (`/admin`). Para que el
login funcione en producción, en el **panel de Supabase**:

1. Ve a **Authentication → URL Configuration**.
2. **Site URL:** `https://tudominio.com`
3. **Redirect URLs:** agrega (uno por línea):
   ```
   https://tudominio.com
   https://tudominio.com/admin
   https://www.tudominio.com
   ```
4. Guarda. (Si usas login email/password simple sin OAuth ni magic links, basta con
   el Site URL correcto, pero conviene listar las Redirect URLs igualmente.)

---

## 9. Imágenes del catálogo — recomendaciones

**Estado actual del proyecto:**
- **Fotos de los autos:** se suben y se sirven desde **Supabase Storage** (bucket
  `autos`), vía URL pública (`getPublicUrl`). El uploader ya **comprime** imágenes
  > 2 MB a máx. 1920 px antes de subirlas (`browser-image-compression`).
- **Imágenes del Hero (portada):** URLs guardadas en la tabla `settings` de Supabase
  (también apuntan a Storage cuando está configurado).
- **Assets de marca** (logo, hero de respaldo): empaquetados en el build (`src/assets`,
  `public/`), servidos por Nginx con cache de 1 año.

**Recomendaciones (con ~80 autos × varias fotos):**
1. **Habilita el CDN de Supabase Storage** (Smart CDN) para servir las imágenes con
   cache en el borde y reducir latencia. El ancho de banda (8 TB) es de sobra.
2. **Convierte a WebP** las fotos del catálogo: peso ~25–35 % menor que JPEG con
   calidad equivalente. El uploader ya acepta WebP; puedes ajustarlo para forzar la
   salida en WebP al comprimir. **AVIF** comprime aún más pero es más lento de
   codificar; WebP es el mejor balance para este caso.
3. Sirve **thumbnails** en el listado/catálogo y la imagen completa solo en el detalle
   (Supabase permite transformaciones de imagen on-the-fly con `?width=...`).
4. Mantén `loading="lazy"` en las imágenes del grid (ya se usa en el uploader).

> No es necesario cambiar nada para desplegar: las imágenes viven en Supabase y se
> sirven independientemente del contenedor. Las optimizaciones de arriba son mejoras
> de rendimiento, no requisitos.

---

## 10. Comprobaciones post-deploy

- [ ] La home carga con HTTPS y candado verde.
- [ ] El catálogo muestra los autos (imágenes desde Supabase).
- [ ] Recargar en una ruta profunda (p. ej. `/catalogo`) **no** da 404.
- [ ] El login de `/admin` funciona (Redirect URLs configuradas).
- [ ] El formulario de contacto (EmailJS) y el botón de WhatsApp funcionan.

---

## Notas de configuración para Easypanel (resumen)

| Ajuste                         | Valor                          |
|--------------------------------|--------------------------------|
| Source                         | GitHub → repo, branch `main`   |
| Build method                   | Dockerfile (`/Dockerfile`)     |
| Puerto interno del contenedor  | **80**                         |
| Variables de entorno           | `VITE_*` (ver sección 3)       |
| SSL                            | Let's Encrypt (automático)     |
| Auto Deploy                    | Recomendado: ON                |
