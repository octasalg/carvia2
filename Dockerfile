# syntax=docker/dockerfile:1

# ============================================================
#  CARVÍA — Dockerfile de producción (React + Vite → Nginx)
# ------------------------------------------------------------
#  Etapa 1: construye la SPA con Node.
#  Etapa 2: sirve los archivos estáticos con Nginx en :80.
#
#  IMPORTANTE: Vite inyecta las variables VITE_* en TIEMPO DE
#  BUILD (quedan "horneadas" en el JS). Por eso se reciben como
#  build args y se exponen como ENV antes de `npm run build`.
#  En Easypanel define estas variables en el entorno de la App;
#  Easypanel las pasa como build args durante el build.
# ============================================================

# ---------- Etapa 1: Build ----------
# Vite 8 requiere Node 20.19+ / 22.12+. Usamos la LTS 22 Alpine.
FROM node:22-alpine AS build
WORKDIR /app

# Instalación de dependencias (capa cacheable)
COPY package.json package-lock.json ./
RUN npm ci

# Variables de Vite (build-time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_PUBLIC_KEY
ARG VITE_WHATSAPP_NUMBER

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID \
    VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID \
    VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY \
    VITE_WHATSAPP_NUMBER=$VITE_WHATSAPP_NUMBER

# Código fuente + build de producción
COPY . .
RUN npm run build

# ---------- Etapa 2: Runtime (Node) ----------
# Se usa un pequeño servidor Node (server.js, sin dependencias) en lugar
# de Nginx porque necesita inyectar etiquetas Open Graph por petición
# (preview de WhatsApp/Facebook con la foto del auto). Los crawlers no
# ejecutan JS, así que la inyección DEBE hacerse en el servidor.
FROM node:22-alpine AS runtime
WORKDIR /app

# La anon key de Supabase es PÚBLICA (ya va embebida en el bundle del
# frontend), por eso es seguro exponerla también en runtime. Sirve para
# que el servidor consulte los datos del auto al generar el preview.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    NODE_ENV=production \
    PORT=80

# Archivos estáticos generados por Vite + servidor
COPY --from=build /app/dist ./dist
COPY server.js ./server.js

EXPOSE 80
CMD ["node", "server.js"]
