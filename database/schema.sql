-- ============================================================
-- Mercería Avíos — esquema de base (schema.sql)
--
-- Correr COMPLETO en el SQL Editor de Supabase. Idempotente: se puede
-- re-ejecutar sin romper nada.
--
-- ESTADO: la demo NO usa esta base. El catálogo se sirve desde
-- src/lib/catalog/data.ts (modo demo). Este archivo es el destino: define el
-- esquema al que mapea src/lib/catalog/index.ts cuando se conecte un proyecto
-- real. Está acá para que la migración sea un paso y no un rediseño.
--
-- La decisión central: el precio por mayor NO es un talle ni una variante.
-- Es una PRESENTACIÓN de venta (product_formats) — la forma concreta en que el
-- artículo sale del local. Esa es la tabla que faltaba, y su ausencia obligaba
-- a meter "4 mm · mayorista, pieza x100m" como si fuera un talle.
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── Categorías ─────────────────────────────────────────────

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── Tonos (informativos: "viene en estos colores") ─────────

create table if not exists colors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  hex        text not null,
  sort_order int  not null default 0
);

-- ─── Productos ──────────────────────────────────────────────

do $$ begin
  create type product_status as enum ('active', 'soldout', 'draft');
exception when duplicate_object then null;
end $$;

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  category_id      uuid references categories(id) on delete set null,
  status           product_status not null default 'draft',
  badge            text,
  -- Código del catálogo en papel. El comprador mayorista busca por código.
  sku              text,
  material         text,
  sort_order       int  not null default 0,
  discount_percent int  not null default 0 check (discount_percent between 0 and 90),
  discount_active  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists products_status_idx   on products(status);

-- ─── Fotos ──────────────────────────────────────────────────

create table if not exists product_media (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  alt        text,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_media_product_idx on product_media(product_id);

-- ─── Variantes: el atributo físico ──────────────────────────
-- El ancho de la cinta, el color del cordón, la medida de la pinza.

do $$ begin
  create type variant_axis as enum ('ancho', 'color', 'medida', 'modelo');
exception when duplicate_object then null;
end $$;

create table if not exists product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  -- Vacío en un producto de una sola variante: existe la fila, no se muestra.
  label      text not null default '',
  axis       variant_axis,
  available  boolean not null default true,
  sort_order int  not null default 0
);

create index if not exists product_variants_product_idx on product_variants(product_id);

-- ─── Presentaciones: cómo sale del local ────────────────────
-- "Por metro" ($ 13 el metro) y "Pieza cerrada · 100 m" ($ 396, o sea $ 3,96 el
-- metro) son DOS presentaciones de la MISMA variante. Acá vive el mayoreo.

do $$ begin
  create type price_tier   as enum ('menor', 'mayor');
  create type measure_unit as enum ('m', 'yd', 'u');
exception when duplicate_object then null;
end $$;

create table if not exists product_formats (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references product_variants(id) on delete cascade,
  tier           price_tier   not null default 'menor',
  -- "Por metro", "Pieza cerrada · 100 m", "Cono · 169 m", "Unidad".
  label          text not null,
  unit           measure_unit not null default 'u',
  -- Cuántas unidades base trae UNA presentación.
  -- NULL = la medida de la pieza está a confirmar con la dueña.
  content_qty    numeric(10, 2) check (content_qty is null or content_qty > 0),
  -- Precio de UNA presentación. NULL cuando content_qty es NULL.
  price_uyu      numeric(10, 2) check (price_uyu is null or price_uyu >= 0),
  -- Precio por unidad base. SIEMPRE presente: es lo que hace comparables entre
  -- sí presentaciones distintas, y de donde sale el porcentaje de ahorro.
  unit_price_uyu numeric(10, 4) not null check (unit_price_uyu > 0),
  available      boolean not null default true,
  min_qty        int not null default 1 check (min_qty >= 1),
  sort_order     int not null default 0,

  -- Los dos campos de "medida a confirmar" van juntos o no van. Sin esto, una
  -- fila con content_qty y sin price_uyu deja la ficha sin precio y el carrito
  -- sin poder calcular un total.
  constraint formats_pack_pair check (
    (content_qty is null and price_uyu is null) or
    (content_qty is not null and price_uyu is not null)
  )
);

create index if not exists product_formats_variant_idx on product_formats(variant_id);

-- Coherencia de plata: unit_price × content = price, con tolerancia para el
-- redondeo de centésimos, amplificada por el tamaño de la pieza (en una pieza
-- de 169 m, un centésimo por metro son $ 1,69).
create or replace function check_format_price_consistency()
returns trigger language plpgsql as $$
declare
  expected numeric;
  tolerance numeric;
begin
  if new.content_qty is null or new.price_uyu is null then
    return new;
  end if;
  expected  := new.unit_price_uyu * new.content_qty;
  tolerance := greatest(0.02, 0.011 * new.content_qty);
  if abs(expected - new.price_uyu) > tolerance then
    raise exception
      'Precio inconsistente en la presentación "%": % x % = %, pero price_uyu = %',
      new.label, new.unit_price_uyu, new.content_qty, round(expected, 2), new.price_uyu;
  end if;
  return new;
end $$;

drop trigger if exists product_formats_price_check on product_formats;
create trigger product_formats_price_check
  before insert or update on product_formats
  for each row execute function check_format_price_consistency();

-- ─── Tonos por producto (informativos) ──────────────────────

create table if not exists product_colors (
  product_id uuid not null references products(id) on delete cascade,
  color_id   uuid not null references colors(id)   on delete cascade,
  primary key (product_id, color_id)
);

-- ─── Descuentos por lote ────────────────────────────────────

create table if not exists discounts (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  scope         text not null default 'all' check (scope in ('all', 'category')),
  category_slug text,
  percent       int  not null check (percent between 0 and 90),
  active        boolean not null default false,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── Textos editables del sitio ─────────────────────────────

create table if not exists site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── Seguridad ──────────────────────────────────────────────
--
-- Todas las tablas son de LECTURA PÚBLICA y escritura sólo para usuarios
-- autenticados: el catálogo es público por definición y el sitio no guarda
-- datos de ningún visitante. El carrito y la lista viven en el navegador
-- (localStorage), así que no hay tabla que scopear por cookie — que era
-- justamente el problema sin solución del carrito del clon.

do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'colors', 'products', 'product_media', 'product_variants',
    'product_formats', 'product_colors', 'discounts', 'site_settings'
  ] loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "lectura publica" on %I', t);
    execute format(
      'create policy "lectura publica" on %I for select using (true)', t
    );

    execute format('drop policy if exists "escritura autenticada" on %I', t);
    execute format(
      'create policy "escritura autenticada" on %I for all
         to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ─── updated_at automático ──────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on products;
create trigger products_touch before update on products
  for each row execute function touch_updated_at();

drop trigger if exists site_settings_touch on site_settings;
create trigger site_settings_touch before update on site_settings
  for each row execute function touch_updated_at();
