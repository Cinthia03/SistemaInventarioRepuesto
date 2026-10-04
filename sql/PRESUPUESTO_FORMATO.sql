-- =====================================================================
-- MÓDULO DE PRESUPUESTO — Formato Excel + rubros personalizados
--
-- Ejecutar UNA vez en Supabase (SQL Editor) sobre el proyecto BDConstruccion.
-- Es idempotente: se puede volver a correr sin romper nada.
--
--  * presupuestos: guarda la cabecera del formato (Nº de trámite, fecha,
--    área de construcción, % de costos indirectos, costo directo/indirecto).
--  * presupuesto_items: admite rubros PERSONALIZADOS (sin rubro_id) y guarda
--    los códigos de categoría/subcategoría para reconstruir el formato
--    (1.0 OBRA GRIS > 1.1 INSTALACIONES PROVISIONALES > 1.1.01 ...).
-- =====================================================================

-- Por si las tablas aún no existen en algún entorno
create table if not exists public.presupuestos (
  id         bigint generated always as identity primary key,
  nombre     character varying not null,
  total      numeric not null default 0,
  creado_en  timestamp with time zone not null default now()
);

create table if not exists public.presupuesto_items (
  id                   bigint generated always as identity primary key,
  presupuesto_id       bigint not null references public.presupuestos(id) on delete cascade,
  categoria_clave      character varying,
  categoria_nombre     character varying,
  subcategoria_nombre  character varying,
  rubro_id             bigint,
  rubro_codigo         character varying,
  rubro_descripcion    text,
  unidad_medida        character varying,
  costo_unitario       numeric default 0,
  cantidad             numeric default 0,
  total                numeric default 0
);

-- ---------------------------------------------------------------------
-- Cabecera del formato
-- ---------------------------------------------------------------------
alter table public.presupuestos add column if not exists numero_tramite       character varying;
alter table public.presupuestos add column if not exists fecha_presupuesto    date default current_date;
alter table public.presupuestos add column if not exists area_construccion    numeric;
alter table public.presupuestos add column if not exists porcentaje_indirecto numeric not null default 0.20;
alter table public.presupuestos add column if not exists costo_directo        numeric not null default 0;
alter table public.presupuestos add column if not exists costo_indirecto      numeric not null default 0;

-- ---------------------------------------------------------------------
-- Ítems: rubros personalizados + códigos del formato
-- ---------------------------------------------------------------------
alter table public.presupuesto_items alter column rubro_id drop not null;

-- Si rubro_id tenía FK hacia "rubros" (solo Obra Gris), se quita: los ítems
-- pueden venir de acabados_rubros, hidraulico_rubros, electrico_rubros o ser
-- personalizados. El presupuesto guarda su propia copia de código/desc/P.U.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.presupuesto_items'::regclass
      and con.contype = 'f'
      and att.attname = 'rubro_id'
  loop
    execute format('alter table public.presupuesto_items drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.presupuesto_items add column if not exists categoria_codigo    character varying;
alter table public.presupuesto_items add column if not exists subcategoria_codigo character varying;
alter table public.presupuesto_items add column if not exists es_personalizado    boolean not null default false;

create index if not exists idx_presupuesto_items_presupuesto on public.presupuesto_items(presupuesto_id);

-- Presupuestos antiguos: el costo directo era el total (no tenían indirectos)
update public.presupuestos
   set costo_directo = total
 where costo_directo = 0 and total <> 0;
update public.presupuestos
   set porcentaje_indirecto = 0
 where costo_indirecto = 0 and costo_directo = total and total <> 0
   and numero_tramite is null;
