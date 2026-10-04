-- =====================================================================
-- PRESUPUESTO ↔ INVENTARIO (stock de materiales)
--
-- Ejecutar UNA vez en Supabase (SQL Editor) DESPUÉS de PRESUPUESTO_FORMATO.sql.
-- Es idempotente: se puede volver a correr.
--
-- Cómo funciona:
--  * Cada rubro consume los MATERIALES de su APU:
--        consumo = cantidad del material en el APU × cantidad del rubro.
--  * Al GUARDAR un presupuesto se descuenta ese consumo de materiales.stock.
--  * Al ACTUALIZAR se devuelve lo que se había descontado y se descuenta lo nuevo
--    (es decir, solo se mueve la diferencia).
--  * Al ELIMINAR el presupuesto, todo lo descontado vuelve al inventario.
--  * Si algún material no alcanza, NO se guarda nada (todo o nada) y se
--    devuelve un error "STOCK_INSUFICIENTE: ..." con el detalle.
-- =====================================================================

-- Lo que cada presupuesto descontó del inventario (para poder devolverlo exacto)
create table if not exists public.presupuesto_consumo (
  id              bigint generated always as identity primary key,
  presupuesto_id  bigint not null references public.presupuestos(id) on delete cascade,
  material_id     bigint not null,
  cantidad        numeric not null default 0
);

create index if not exists idx_presupuesto_consumo_presupuesto on public.presupuesto_consumo(presupuesto_id);

-- Los consumos de un APU suelen ser decimales (ej. 0.35 sacos × 120 m²);
-- si el stock era entero se pasa a numeric para no perder ni redondear cantidades.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'materiales'
       and column_name = 'stock' and data_type <> 'numeric'
  ) then
    alter table public.materiales
      alter column stock type numeric
      using nullif(trim(stock::text), '')::numeric;
  end if;
end $$;

-- Stock con máximo 2 decimales (limpia valores como 81.57999999999998)
update public.materiales
   set stock = round(stock::numeric, 2)
 where stock is not null and stock::numeric <> round(stock::numeric, 2);

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'equipos' and column_name = 'stock'
                and data_type in ('numeric', 'double precision', 'real')) then
    execute 'update public.equipos set stock = round(stock::numeric, 2)
              where stock is not null and stock::numeric <> round(stock::numeric, 2)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Guardar (crear o actualizar) un presupuesto + mover el stock
--   p_id        : null para crear; id del presupuesto para actualizar
--   p_cabecera  : {nombre, numero_tramite, fecha_presupuesto, area_construccion,
--                  porcentaje_indirecto, costo_directo, costo_indirecto, total}
--   p_items     : [ {categoria_clave, categoria_nombre, ..., es_personalizado}, ... ]
--   p_consumo   : [ {material_id, cantidad}, ... ]
-- Devuelve el id del presupuesto.
--
-- SECURITY DEFINER: se ejecuta con los permisos del dueño de la función, así
-- las políticas RLS de presupuestos/materiales no bloquean el guardado.
-- ---------------------------------------------------------------------
drop function if exists public.presupuesto_guardar(bigint, jsonb, jsonb, jsonb);

create or replace function public.presupuesto_guardar(
  p_id        bigint,
  p_cabecera  jsonb,
  p_items     jsonb,
  p_consumo   jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       bigint;
  v_falta    text;
  v_consumo  jsonb;
begin
  -- Consumo nuevo agrupado por material: [{material_id, cantidad}]
  select coalesce(jsonb_agg(jsonb_build_object('material_id', material_id, 'cantidad', cantidad)), '[]'::jsonb)
    into v_consumo
    from (
      select (e->>'material_id')::bigint as material_id, round(sum((e->>'cantidad')::numeric), 2) as cantidad
        from jsonb_array_elements(coalesce(p_consumo, '[]'::jsonb)) e
       where coalesce((e->>'cantidad')::numeric, 0) > 0
       group by 1
    ) t;

  if p_id is null then
    insert into presupuestos (
      nombre, total, numero_tramite, fecha_presupuesto, area_construccion,
      porcentaje_indirecto, costo_directo, costo_indirecto
    ) values (
      p_cabecera->>'nombre',
      coalesce((p_cabecera->>'total')::numeric, 0),
      nullif(p_cabecera->>'numero_tramite', ''),
      coalesce(nullif(p_cabecera->>'fecha_presupuesto', '')::date, current_date),
      nullif(p_cabecera->>'area_construccion', '')::numeric,
      coalesce((p_cabecera->>'porcentaje_indirecto')::numeric, 0),
      coalesce((p_cabecera->>'costo_directo')::numeric, 0),
      coalesce((p_cabecera->>'costo_indirecto')::numeric, 0)
    ) returning id into v_id;
  else
    v_id := p_id;

    update presupuestos set
      nombre               = p_cabecera->>'nombre',
      total                = coalesce((p_cabecera->>'total')::numeric, 0),
      numero_tramite       = nullif(p_cabecera->>'numero_tramite', ''),
      fecha_presupuesto    = coalesce(nullif(p_cabecera->>'fecha_presupuesto', '')::date, fecha_presupuesto),
      area_construccion    = nullif(p_cabecera->>'area_construccion', '')::numeric,
      porcentaje_indirecto = coalesce((p_cabecera->>'porcentaje_indirecto')::numeric, 0),
      costo_directo        = coalesce((p_cabecera->>'costo_directo')::numeric, 0),
      costo_indirecto      = coalesce((p_cabecera->>'costo_indirecto')::numeric, 0)
    where id = v_id;

    if not found then
      raise exception 'El presupuesto % no existe', v_id;
    end if;

    -- Devolver al inventario lo que este presupuesto había descontado
    perform 1 from materiales m
      where m.id in (select material_id from presupuesto_consumo where presupuesto_id = v_id)
      for update;

    update materiales m
       set stock = round(coalesce(m.stock, 0) + c.cantidad, 2)
      from (select material_id, sum(cantidad) as cantidad
              from presupuesto_consumo
             where presupuesto_id = v_id
             group by material_id) c
     where m.id = c.material_id;

    delete from presupuesto_consumo where presupuesto_id = v_id;
    delete from presupuesto_items   where presupuesto_id = v_id;
  end if;

  -- Rubros del presupuesto
  insert into presupuesto_items (
    presupuesto_id, categoria_clave, categoria_nombre, categoria_codigo,
    subcategoria_nombre, subcategoria_codigo, rubro_id, rubro_codigo,
    rubro_descripcion, unidad_medida, costo_unitario, cantidad, total, es_personalizado
  )
  select v_id, x.categoria_clave, x.categoria_nombre, x.categoria_codigo,
         x.subcategoria_nombre, x.subcategoria_codigo, x.rubro_id, x.rubro_codigo,
         x.rubro_descripcion, x.unidad_medida, coalesce(x.costo_unitario, 0),
         coalesce(x.cantidad, 0), coalesce(x.total, 0), coalesce(x.es_personalizado, false)
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(
      categoria_clave text, categoria_nombre text, categoria_codigo text,
      subcategoria_nombre text, subcategoria_codigo text, rubro_id bigint,
      rubro_codigo text, rubro_descripcion text, unidad_medida text,
      costo_unitario numeric, cantidad numeric, total numeric, es_personalizado boolean
    );

  -- Bloquear las filas de esos materiales y validar disponibilidad
  perform 1 from materiales m
    where m.id in (select (e->>'material_id')::bigint from jsonb_array_elements(v_consumo) e)
    for update;

  select string_agg(
           format('%s %s (disponible %s %s, requerido %s %s)',
                  coalesce(m.codigo::text, ''), m.descripcion,
                  round(coalesce(m.stock, 0)::numeric, 2), coalesce(m.unidad, ''),
                  round((e->>'cantidad')::numeric, 2), coalesce(m.unidad, '')),
           '; ')
    into v_falta
    from jsonb_array_elements(v_consumo) e
    join materiales m on m.id = (e->>'material_id')::bigint
   where coalesce(m.stock, 0) < (e->>'cantidad')::numeric;

  if v_falta is not null then
    -- La excepción deshace TODO (incluida la devolución de stock anterior)
    raise exception 'STOCK_INSUFICIENTE: %', v_falta;
  end if;

  update materiales m
     set stock = round(coalesce(m.stock, 0) - (e->>'cantidad')::numeric, 2)
    from jsonb_array_elements(v_consumo) e
   where m.id = (e->>'material_id')::bigint;

  insert into presupuesto_consumo (presupuesto_id, material_id, cantidad)
  select v_id, (e->>'material_id')::bigint, (e->>'cantidad')::numeric
    from jsonb_array_elements(v_consumo) e
    join materiales m on m.id = (e->>'material_id')::bigint;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Eliminar un presupuesto devolviendo su consumo al inventario
-- ---------------------------------------------------------------------
create or replace function public.presupuesto_eliminar(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from materiales m
    where m.id in (select material_id from presupuesto_consumo where presupuesto_id = p_id)
    for update;

  update materiales m
     set stock = round(coalesce(m.stock, 0) + c.cantidad, 2)
    from (select material_id, sum(cantidad) as cantidad
            from presupuesto_consumo
           where presupuesto_id = p_id
           group by material_id) c
   where m.id = c.material_id;

  delete from presupuestos where id = p_id;   -- items y consumo se borran en cascada
end;
$$;

grant execute on function public.presupuesto_guardar(bigint, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.presupuesto_eliminar(bigint) to anon, authenticated;
grant select, insert, update, delete on public.presupuesto_consumo to anon, authenticated;

-- Que la API (PostgREST) vea las funciones nuevas de inmediato
notify pgrst, 'reload schema';
