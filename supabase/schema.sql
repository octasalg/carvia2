-- ============================================================
-- CARVÍA — Supabase Schema
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Extensión UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

-- Tabla de autos
create table if not exists public.autos (
  id              uuid primary key default gen_random_uuid(),
  marca           text not null,
  modelo          text not null,
  version         text,
  anio            integer,
  precio          numeric,
  kilometraje     integer,
  transmision     text,
  motor           text,
  tipo            text,
  color_exterior  text,
  color_interior  text,
  descripcion     text,
  equipamiento    text[],
  imagenes        text[],
  destacado       boolean default false,
  visible         boolean default true,
  factura         text,
  oferta          boolean default false,
  proximamente    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Tabla de configuración general (key-value)
create table if not exists public.settings (
  key    text primary key,
  value  jsonb not null default '{}'::jsonb
);

-- Tabla de contactos
create table if not exists public.contactos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text,
  telefono     text,
  correo       text,
  auto_interes text,
  mensaje      text,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.autos enable row level security;
alter table public.contactos enable row level security;
alter table public.settings enable row level security;

-- Autos: usuarios anónimos solo ven los visibles
create policy "Anon puede ver autos visibles"
  on public.autos for select
  to anon
  using (visible = true);

-- Autos: usuarios autenticados ven todos
create policy "Auth puede ver todos los autos"
  on public.autos for select
  to authenticated
  using (true);

-- Autos: usuarios autenticados pueden insertar/actualizar/eliminar
create policy "Auth puede gestionar autos"
  on public.autos
  for all
  to authenticated
  using (true)
  with check (true);

-- Settings: cualquiera puede leer (hero images son públicas)
create policy "Anon puede leer settings"
  on public.settings for select
  using (true);

-- Settings: solo autenticados pueden escribir
create policy "Auth puede gestionar settings"
  on public.settings
  for all
  to authenticated
  using (true)
  with check (true);

-- Contactos: cualquiera puede insertar
create policy "Cualquiera puede crear contactos"
  on public.contactos for insert
  with check (true);

-- Contactos: solo autenticados pueden leer
create policy "Auth puede leer contactos"
  on public.contactos for select
  to authenticated
  using (true);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists autos_updated_at on public.autos;
create trigger autos_updated_at
  before update on public.autos
  for each row execute function public.set_updated_at();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Bucket público para imágenes de autos
insert into storage.buckets (id, name, public)
values ('autos', 'autos', true)
on conflict (id) do nothing;

-- Política: cualquiera puede leer
create policy "Public puede leer imágenes"
  on storage.objects for select
  using (bucket_id = 'autos');

-- Política: autenticados pueden subir
create policy "Auth puede subir imágenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'autos');

-- Política: autenticados pueden eliminar
create policy "Auth puede eliminar imágenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'autos');

-- ============================================================
-- DATOS DE EJEMPLO
-- ============================================================

insert into public.autos (
  marca, modelo, version, anio, precio, kilometraje,
  transmision, motor, tipo, color_exterior, color_interior,
  descripcion, equipamiento, imagenes, destacado, visible
) values
(
  'Mazda', 'Mazda 3', 'i Grand Touring', 2021, 339000, 38500,
  'Automática', '2.5L 4 cil. 186 hp', 'Hatchback',
  'Rojo Soul Metálico', 'Negro piel',
  'Mazda 3 Grand Touring en estado impecable, un solo dueño, servicios de agencia al corriente. Conducción deportiva con acabados premium.',
  array['Quemacocos eléctrico','Pantalla MZD Connect','Cámara de reversa','Head-Up Display','Asientos en piel','CarPlay / Android Auto','Sensores de punto ciego'],
  array[
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80'
  ],
  true, true
),
(
  'Nissan', 'Versa', 'Advance', 2022, 289000, 24300,
  'CVT', '1.6L 4 cil. 118 hp', 'Sedán',
  'Gris Plata', 'Negro tela',
  'Versa Advance modelo reciente con bajo kilometraje. Ideal por su rendimiento de combustible y amplitud interior.',
  array['Pantalla táctil 7"','Cámara de reversa','Control crucero','Climatizador automático','Llave inteligente','Bluetooth'],
  array[
    'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=1200&q=80'
  ],
  true, true
),
(
  'Kia', 'Rio', 'EX Pack', 2021, 269000, 41200,
  'Automática', '1.6L 4 cil. 121 hp', 'Sedán',
  'Blanco Perla', 'Negro tela',
  'Kia Rio EX bien cuidado, perfecto primer auto. Garantía de fábrica vigente y excelente equipamiento de seguridad.',
  array['Pantalla 8"','CarPlay / Android Auto','6 bolsas de aire','Cámara de reversa','Faros LED','Rines de aluminio'],
  array[
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80'
  ],
  false, true
),
(
  'Toyota', 'Corolla', 'LE', 2020, 319000, 52800,
  'CVT', '1.8L 4 cil. 139 hp', 'Sedán',
  'Gris Oxford', 'Beige tela',
  'Toyota Corolla LE, sinónimo de confiabilidad. Mantenimientos documentados y excelente estado general de carrocería.',
  array['Toyota Safety Sense','Pantalla 8"','Control crucero adaptativo','Cámara de reversa','Climatizador','Faros LED'],
  array[
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
  ],
  true, true
),
(
  'Honda', 'Civic', 'Turbo', 2019, 359000, 61500,
  'CVT', '1.5L Turbo 174 hp', 'Sedán',
  'Negro Cristal', 'Negro piel',
  'Honda Civic Turbo con motor potente y eficiente. Look deportivo, interior espacioso y tecnología de punta.',
  array['Honda Sensing','Quemacocos','Asientos en piel','Pantalla táctil','Arranque por botón','Rines deportivos','Sensores de proximidad'],
  array[
    'https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80'
  ],
  false, true
);
