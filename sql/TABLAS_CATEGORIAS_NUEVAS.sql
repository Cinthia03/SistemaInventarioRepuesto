-- =====================================================================
-- SCRIPT: Réplica de la metodología de Obra Gris para HIDRÁULICO,
-- ELÉCTRICO y ACABADOS
--
-- Se dejan intactas: rubros, apus_rubros, apu_detalles (uso exclusivo
-- de OBRA GRIS) y los catálogos compartidos: equipos, mano_obra,
-- materiales, categorias, subcategorias.
--
-- Se crean 3 tablas nuevas POR CADA sistema, con las mismas columnas
-- y tipos que ya usa Obra Gris, para que el módulo de cálculo (APU)
-- funcione igual apuntando a la tabla correspondiente.
-- =====================================================================

-- =====================================================================
-- 1) HIDRÁULICO
-- =====================================================================

-- 1.1 Listado maestro de rubros (pantalla "Ver Rubros")
create table public.hidraulico_rubros (
  id                    bigint generated always as identity primary key,
  subcategoria_id       bigint references public.subcategorias(id),
  codigo                character varying not null,
  descripcion           character varying not null,
  unidad_medida         character varying default 'u'::character varying,
  costo_directo_total   numeric default 0.0000,
  created_at            timestamp with time zone default now()
);

-- 1.2 Cabecera del APU calculado para cada rubro
create table public.hidraulico_apus_rubros (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint references public.hidraulico_rubros(id), -- FK directa (mejora sobre el original)
  rubro_codigo          character varying not null,
  rubro_descripcion     text not null,
  categoria             character varying not null default 'HIDRAULICO',
  subtotal_equipos      numeric not null default 0,
  subtotal_mano_obra    numeric not null default 0,
  subtotal_materiales   numeric not null default 0,
  subtotal_transporte   numeric not null default 0,
  total_directo         numeric not null default 0,
  fecha                 timestamp with time zone not null default now(),
  creado_en             timestamp with time zone not null default now(),
  actualizado_en        timestamp with time zone not null default now()
);

-- 1.3 Detalle de insumos (equipos / mano de obra / materiales) por APU
create table public.hidraulico_apu_detalles (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint not null references public.hidraulico_apus_rubros(id) on delete cascade,
  tipo_insumo           character varying, -- 'equipo' | 'mano_obra' | 'material'
  insumo_id             bigint not null,   -- FK "manual" hacia equipos.id / mano_obra.id / materiales.id según tipo_insumo
  cantidad              numeric default 0,
  rendimiento           numeric default 0,
  costo_unitario        numeric default 0,
  subtotal              numeric default 0,
  descripcion           character varying,
  unidad                character varying
);

create index idx_hidraulico_rubros_subcategoria on public.hidraulico_rubros(subcategoria_id);
create index idx_hidraulico_apus_rubros_rubro on public.hidraulico_apus_rubros(rubro_id);
create index idx_hidraulico_apu_detalles_rubro on public.hidraulico_apu_detalles(rubro_id);
create index idx_hidraulico_apu_detalles_insumo on public.hidraulico_apu_detalles(tipo_insumo, insumo_id);


-- =====================================================================
-- 2) ELÉCTRICO
-- =====================================================================

create table public.electrico_rubros (
  id                    bigint generated always as identity primary key,
  subcategoria_id       bigint references public.subcategorias(id),
  codigo                character varying not null,
  descripcion           character varying not null,
  unidad_medida         character varying default 'u'::character varying,
  costo_directo_total   numeric default 0.0000,
  created_at            timestamp with time zone default now()
);

create table public.electrico_apus_rubros (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint references public.electrico_rubros(id),
  rubro_codigo          character varying not null,
  rubro_descripcion     text not null,
  categoria             character varying not null default 'ELECTRICO',
  subtotal_equipos      numeric not null default 0,
  subtotal_mano_obra    numeric not null default 0,
  subtotal_materiales   numeric not null default 0,
  subtotal_transporte   numeric not null default 0,
  total_directo         numeric not null default 0,
  fecha                 timestamp with time zone not null default now(),
  creado_en             timestamp with time zone not null default now(),
  actualizado_en        timestamp with time zone not null default now()
);

create table public.electrico_apu_detalles (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint not null references public.electrico_apus_rubros(id) on delete cascade,
  tipo_insumo           character varying,
  insumo_id             bigint not null,
  cantidad              numeric default 0,
  rendimiento           numeric default 0,
  costo_unitario        numeric default 0,
  subtotal              numeric default 0,
  descripcion           character varying,
  unidad                character varying
);

create index idx_electrico_rubros_subcategoria on public.electrico_rubros(subcategoria_id);
create index idx_electrico_apus_rubros_rubro on public.electrico_apus_rubros(rubro_id);
create index idx_electrico_apu_detalles_rubro on public.electrico_apu_detalles(rubro_id);
create index idx_electrico_apu_detalles_insumo on public.electrico_apu_detalles(tipo_insumo, insumo_id);


-- =====================================================================
-- 3) ACABADOS
-- =====================================================================

create table public.acabados_rubros (
  id                    bigint generated always as identity primary key,
  subcategoria_id       bigint references public.subcategorias(id),
  codigo                character varying not null,
  descripcion           character varying not null,
  unidad_medida         character varying default 'u'::character varying,
  costo_directo_total   numeric default 0.0000,
  created_at            timestamp with time zone default now()
);

create table public.acabados_apus_rubros (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint references public.acabados_rubros(id),
  rubro_codigo          character varying not null,
  rubro_descripcion     text not null,
  categoria             character varying not null default 'ACABADOS',
  subtotal_equipos      numeric not null default 0,
  subtotal_mano_obra    numeric not null default 0,
  subtotal_materiales   numeric not null default 0,
  subtotal_transporte   numeric not null default 0,
  total_directo         numeric not null default 0,
  fecha                 timestamp with time zone not null default now(),
  creado_en             timestamp with time zone not null default now(),
  actualizado_en        timestamp with time zone not null default now()
);

create table public.acabados_apu_detalles (
  id                    bigint generated always as identity primary key,
  rubro_id              bigint not null references public.acabados_apus_rubros(id) on delete cascade,
  tipo_insumo           character varying,
  insumo_id             bigint not null,
  cantidad              numeric default 0,
  rendimiento           numeric default 0,
  costo_unitario        numeric default 0,
  subtotal              numeric default 0,
  descripcion           character varying,
  unidad                character varying
);

create index idx_acabados_rubros_subcategoria on public.acabados_rubros(subcategoria_id);
create index idx_acabados_apus_rubros_rubro on public.acabados_apus_rubros(rubro_id);
create index idx_acabados_apu_detalles_rubro on public.acabados_apu_detalles(rubro_id);
create index idx_acabados_apu_detalles_insumo on public.acabados_apu_detalles(tipo_insumo, insumo_id);


-- =====================================================================
-- 4) QUERIES DE LA METODOLOGÍA DE CÁLCULO (idéntica a Obra Gris)
--    Reemplaza {sistema} por hidraulico / electrico / acabados
-- =====================================================================

-- 4.1 Listar rubros de un sistema agrupados por subcategoría
--     (pantalla "Todas las subcategorías" que ya usas en Obra Gris)
select r.id, r.codigo, r.descripcion, r.unidad_medida, r.costo_directo_total,
       s.nombre as subcategoria
from public.hidraulico_rubros r
join public.subcategorias s on s.id = r.subcategoria_id
order by s.id, r.codigo;

-- 4.2 Crear la cabecera del APU cuando el usuario presiona "Calcular"
insert into public.hidraulico_apus_rubros
  (rubro_id, rubro_codigo, rubro_descripcion, categoria)
values
  (:rubro_id, :rubro_codigo, :rubro_descripcion, 'HIDRAULICO')
returning id;

-- 4.3 Insertar una línea de insumo (equipo, mano de obra o material)
--     costo_unitario = precio del catálogo (equipos/mano_obra/materiales)
--     subtotal = cantidad * costo_unitario * rendimiento   (igual a la fórmula D = C*R del Excel)
insert into public.hidraulico_apu_detalles
  (rubro_id, tipo_insumo, insumo_id, cantidad, rendimiento, costo_unitario, subtotal, descripcion, unidad)
values
  (:apu_id, 'equipo', :equipo_id, :cantidad, :rendimiento,
   (select precio from public.equipos where id = :equipo_id),
   :cantidad * (select precio from public.equipos where id = :equipo_id) * :rendimiento,
   (select descripcion from public.equipos where id = :equipo_id),
   (select unidad from public.equipos where id = :equipo_id));

-- Lo mismo para mano de obra:
insert into public.hidraulico_apu_detalles
  (rubro_id, tipo_insumo, insumo_id, cantidad, rendimiento, costo_unitario, subtotal, descripcion, unidad)
values
  (:apu_id, 'mano_obra', :mo_id, :cantidad, :rendimiento,
   (select precio from public.mano_obra where id = :mo_id),
   :cantidad * (select precio from public.mano_obra where id = :mo_id) * :rendimiento,
   (select descripcion from public.mano_obra where id = :mo_id),
   (select unidad from public.mano_obra where id = :mo_id));

-- Lo mismo para materiales:
insert into public.hidraulico_apu_detalles
  (rubro_id, tipo_insumo, insumo_id, cantidad, rendimiento, costo_unitario, subtotal, descripcion, unidad)
values
  (:apu_id, 'material', :mat_id, :cantidad, :rendimiento,
   (select precio from public.materiales where id = :mat_id),
   :cantidad * (select precio from public.materiales where id = :mat_id) * :rendimiento,
   (select descripcion from public.materiales where id = :mat_id),
   (select unidad from public.materiales where id = :mat_id));

-- 4.4 Recalcular los subtotales de la cabecera del APU
--     (equivalente al SUBTOTAL M / SUBTOTAL MANO DE OBRA del Excel)
update public.hidraulico_apus_rubros ar
set subtotal_equipos     = coalesce((select sum(subtotal) from public.hidraulico_apu_detalles d
                                      where d.rubro_id = ar.id and d.tipo_insumo = 'equipo'), 0),
    subtotal_mano_obra   = coalesce((select sum(subtotal) from public.hidraulico_apu_detalles d
                                      where d.rubro_id = ar.id and d.tipo_insumo = 'mano_obra'), 0),
    subtotal_materiales  = coalesce((select sum(subtotal) from public.hidraulico_apu_detalles d
                                      where d.rubro_id = ar.id and d.tipo_insumo = 'material'), 0),
    total_directo        = coalesce((select sum(subtotal) from public.hidraulico_apu_detalles d
                                      where d.rubro_id = ar.id), 0) + ar.subtotal_transporte,
    actualizado_en       = now()
where ar.id = :apu_id;

-- 4.5 Trasladar el costo unitario ya calculado al listado maestro de rubros
update public.hidraulico_rubros r
set costo_directo_total = (select total_directo from public.hidraulico_apus_rubros ar where ar.id = :apu_id)
where r.id = (select rubro_id from public.hidraulico_apus_rubros where id = :apu_id);

-- 4.6 Traer un APU completo con el detalle (para mostrar/editar en pantalla)
select ar.id, ar.rubro_codigo, ar.rubro_descripcion,
       ar.subtotal_equipos, ar.subtotal_mano_obra, ar.subtotal_materiales, ar.total_directo,
       d.tipo_insumo, d.insumo_id, d.descripcion, d.unidad, d.cantidad, d.rendimiento, d.costo_unitario, d.subtotal
from public.hidraulico_apus_rubros ar
left join public.hidraulico_apu_detalles d on d.rubro_id = ar.id
where ar.id = :apu_id
order by d.tipo_insumo, d.id;

-- =====================================================================
-- NOTA: repite exactamente los queries 4.1 a 4.6 cambiando el prefijo
-- "hidraulico_" por "electrico_" o "acabados_" (y 'HIDRAULICO' por
-- 'ELECTRICO' / 'ACABADOS') para cubrir los otros dos sistemas.
-- =====================================================================


-- =====================================================================
-- FIX: la FK de *_apu_detalles.rubro_id apuntaba a *_apus_rubros
-- en vez de apuntar a *_rubros (que es lo que espera el código Angular,
-- igual que en Obra Gris: apu_detalles.rubro_id -> rubros.id).
--
-- Esto causa el error 400 "Could not find a relationship between
-- hidraulico_rubros and hidraulico_apu_detalles" que ves en consola.
-- =====================================================================

-- ---------- HIDRÁULICO ----------
alter table public.hidraulico_apu_detalles
  drop constraint hidraulico_apu_detalles_rubro_id_fkey;

alter table public.hidraulico_apu_detalles
  add constraint hidraulico_apu_detalles_rubro_id_fkey
  foreign key (rubro_id) references public.hidraulico_rubros(id) on delete cascade;

-- ---------- ELÉCTRICO ----------
alter table public.electrico_apu_detalles
  drop constraint electrico_apu_detalles_rubro_id_fkey;

alter table public.electrico_apu_detalles
  add constraint electrico_apu_detalles_rubro_id_fkey
  foreign key (rubro_id) references public.electrico_rubros(id) on delete cascade;

-- ---------- ACABADOS ----------
alter table public.acabados_apu_detalles
  drop constraint acabados_apu_detalles_rubro_id_fkey;

alter table public.acabados_apu_detalles
  add constraint acabados_apu_detalles_rubro_id_fkey
  foreign key (rubro_id) references public.acabados_rubros(id) on delete cascade;

-- =====================================================================
-- VERIFICACIÓN: las 3 deben ahora apuntar a *_rubros, no a *_apus_rubros
-- =====================================================================
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as tabla_referenciada
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in ('hidraulico_apu_detalles', 'electrico_apu_detalles', 'acabados_apu_detalles');


-- =====================================================================
-- AUTO-SINCRONIZACIÓN DE PRECIOS
-- Si cambia equipos.precio, mano_obra.precio o materiales.precio,
-- este trigger recalcula automáticamente:
--   1) costo_unitario y subtotal en cada línea de *_apu_detalles que
--      use ese insumo (en las 4 categorías a la vez).
--   2) costo_directo_total del rubro afectado en *_rubros.
--
-- Fórmulas (igual que en calculo-apu-component.ts):
--   EQUIPO / MANO_OBRA : subtotal = cantidad * rendimiento * precio
--   MATERIAL / TRANSPORTE : subtotal = cantidad * precio   (sin rendimiento)
-- =====================================================================

create or replace function fn_sync_precio_insumo()
returns trigger
language plpgsql
as $$
declare
  tipos text[];
  sistema record;
begin
  if TG_TABLE_NAME = 'equipos' then
    tipos := array['EQUIPO','TRANSPORTE'];   -- el transporte también se elige del catálogo de equipos
  elsif TG_TABLE_NAME = 'mano_obra' then
    tipos := array['MANO_OBRA'];
  elsif TG_TABLE_NAME = 'materiales' then
    tipos := array['MATERIAL'];
  else
    return NEW;
  end if;

  for sistema in
    select * from (values
      ('apu_detalles',            'rubros'),
      ('hidraulico_apu_detalles', 'hidraulico_rubros'),
      ('electrico_apu_detalles',  'electrico_rubros'),
      ('acabados_apu_detalles',   'acabados_rubros')
    ) as s(tabla_detalle, tabla_rubro)
  loop
    -- 1) Actualiza costo_unitario y subtotal de cada línea afectada
    execute format(
      'update %I set
         costo_unitario = $1,
         subtotal = case
           when tipo_insumo in (''EQUIPO'',''MANO_OBRA'') then cantidad * rendimiento * $1
           else cantidad * $1
         end
       where tipo_insumo = any($2) and insumo_id = $3',
      sistema.tabla_detalle
    ) using NEW.precio, tipos, NEW.id;

    -- 2) Recalcula el costo_directo_total de los rubros que tenían ese insumo
    execute format(
      'update %I r
       set costo_directo_total = coalesce((
         select sum(subtotal) from %I d where d.rubro_id = r.id
       ), 0)
       where r.id in (
         select distinct rubro_id from %I where tipo_insumo = any($1) and insumo_id = $2
       )',
      sistema.tabla_rubro, sistema.tabla_detalle, sistema.tabla_detalle
    ) using tipos, NEW.id;
  end loop;

  return NEW;
end;
$$;

-- ---------- Triggers en los 3 catálogos ----------
drop trigger if exists trg_sync_precio_equipos on equipos;
create trigger trg_sync_precio_equipos
after update of precio on equipos
for each row
when (OLD.precio is distinct from NEW.precio)
execute function fn_sync_precio_insumo();

drop trigger if exists trg_sync_precio_mano_obra on mano_obra;
create trigger trg_sync_precio_mano_obra
after update of precio on mano_obra
for each row
when (OLD.precio is distinct from NEW.precio)
execute function fn_sync_precio_insumo();

drop trigger if exists trg_sync_precio_materiales on materiales;
create trigger trg_sync_precio_materiales
after update of precio on materiales
for each row
when (OLD.precio is distinct from NEW.precio)
execute function fn_sync_precio_insumo();

-- =====================================================================
-- PRUEBA: cambia el precio de un equipo/mano de obra que ya esté usado
-- en algún rubro y confirma que el detalle y el total se actualizaron.
-- Ejemplo (ajusta el id a uno real de tu tabla mano_obra):
--
-- update mano_obra set precio = precio + 0.10 where id = 8;
--
-- select * from apu_detalles where insumo_id = 8 and tipo_insumo = 'MANO_OBRA';
-- select id, codigo, costo_directo_total from rubros where id = 52;
-- =====================================================================