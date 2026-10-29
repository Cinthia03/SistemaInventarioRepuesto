-- =====================================================================
-- MENÚ, ROLES, PERMISOS Y AUDITORÍA
--
-- Ejecutar UNA vez en Supabase (SQL Editor) sobre el proyecto BDConstruccion.
-- Es idempotente: se puede volver a correr sin duplicar datos.
--
--  * roles          : catálogo de roles (admin, consulta, ...).
--  * opciones       : opciones del menú (Inicio, Mantenimiento, Parametrización,
--                     Procesos y Reportes).
--  * rol_opciones   : Opciones x Rol (qué opciones del menú ve cada rol).
--  * usuarios.rol   : Usuarios x Rol (cada usuario tiene un rol).
--  * usuarios.activo: permite desactivar un usuario sin borrarlo.
--  (Las tablas existentes no se modifican, solo se agrega usuarios.activo.)
--  * auditoria      : bitácora de acciones (ingresos, cambios de usuarios
--                     y permisos) usada por Reportes > Auditoría.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ROLES
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  id           bigint generated always as identity primary key,
  codigo       character varying not null unique,      -- se guarda en usuarios.rol
  nombre       character varying not null,
  descripcion  text,
  solo_lectura boolean not null default false,          -- no puede crear/editar/eliminar
  activo       boolean not null default true,
  creado_en    timestamp with time zone not null default now()
);

insert into public.roles (codigo, nombre, descripcion, solo_lectura) values
  ('admin',    'Administrador',      'Acceso total al sistema', false),
  ('consulta', 'Usuario de consulta', 'Solo puede ver la información', true)
on conflict (codigo) do nothing;

-- Roles que ya usan los usuarios existentes (para no dejar a nadie sin rol)
insert into public.roles (codigo, nombre)
select distinct lower(trim(u.rol)), initcap(trim(u.rol))
  from public.usuarios u
 where coalesce(trim(u.rol), '') <> ''
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------
-- 2. OPCIONES DEL MENÚ
-- ---------------------------------------------------------------------
create table if not exists public.opciones (
  id        bigint generated always as identity primary key,
  codigo    character varying not null unique,
  nombre    character varying not null,
  modulo    character varying not null,      -- INICIO | MANTENIMIENTO | PARAMETRIZACION | PROCESOS | REPORTES
  ruta      character varying not null,
  icono     character varying,
  orden     integer not null default 0,
  activo    boolean not null default true
);

insert into public.opciones (codigo, nombre, modulo, ruta, icono, orden) values
  ('INICIO',              'Inicio',                 'INICIO',          '/inicio',                         'home',          10),
  ('MANT_USUARIOS',       'Usuarios',               'MANTENIMIENTO',   '/mantenimiento/usuarios',         'group',         20),
  ('MANT_ROLES',          'Roles',                  'MANTENIMIENTO',   '/mantenimiento/roles',            'badge',         21),
  ('MANT_OPCIONES',       'Opciones',               'MANTENIMIENTO',   '/mantenimiento/opciones',         'list_alt',      22),
  ('PARAM_OPCIONES_ROL',  'Opciones x Rol',         'PARAMETRIZACION', '/parametrizacion/opciones-rol',   'rule',          30),
  ('PARAM_USUARIOS_ROL',  'Usuarios x Rol',         'PARAMETRIZACION', '/parametrizacion/usuarios-rol',   'manage_accounts',31),
  ('PROC_INVENTARIO',     'Inventario',             'PROCESOS',        '/inventario',                     'inventory_2',   40),
  ('PROC_CALCULO',        'Cálculo por rubro',      'PROCESOS',        '/calculo',                        'calculate',     41),
  ('PROC_PRESUPUESTO',    'Presupuesto',            'PROCESOS',        '/presupuesto',                    'request_quote', 42),
  ('PROC_PREDICTIVO',     'Modelos predictivos',    'PROCESOS',        '/modelos-predictivos',            'query_stats',   43),
  ('REP_OPERACIONALES',   'Reportes operacionales', 'REPORTES',        '/reportes/operacionales',         'assignment',    50),
  ('REP_ESTRATEGICOS',    'Reportes estratégicos',  'REPORTES',        '/reportes/estrategicos',          'insights',      51),
  ('REP_AUDITORIA',       'Auditoría',              'REPORTES',        '/reportes/auditoria',             'policy',        52)
on conflict (codigo) do update
   set nombre = excluded.nombre, modulo = excluded.modulo, ruta = excluded.ruta,
       icono = excluded.icono, orden = excluded.orden;

-- ---------------------------------------------------------------------
-- 3. OPCIONES x ROL
-- ---------------------------------------------------------------------
create table if not exists public.rol_opciones (
  rol_id     bigint not null references public.roles(id)    on delete cascade,
  opcion_id  bigint not null references public.opciones(id) on delete cascade,
  primary key (rol_id, opcion_id)
);

-- Permisos iniciales (solo si el rol todavía no tiene ninguno asignado):
--   admin    -> todas las opciones
--   consulta -> todo menos Mantenimiento y Parametrización
--   otros    -> Inicio, Procesos y Reportes (lo que tenían hasta ahora)
insert into public.rol_opciones (rol_id, opcion_id)
select r.id, o.id
  from public.roles r
  cross join public.opciones o
 where not exists (select 1 from public.rol_opciones x where x.rol_id = r.id)
   and (
         r.codigo in ('admin', 'administrador')
      or o.modulo in ('INICIO', 'PROCESOS', 'REPORTES')
   )
on conflict do nothing;

-- Modelos predictivos (opción agregada después): la reciben los roles
-- que ya tenían Inventario.
insert into public.rol_opciones (rol_id, opcion_id)
select ro.rol_id, (select id from public.opciones where codigo = 'PROC_PREDICTIVO')
  from public.rol_opciones ro
  join public.opciones o on o.id = ro.opcion_id and o.codigo = 'PROC_INVENTARIO'
on conflict do nothing;

-- Roles y Opciones (agregadas después a Mantenimiento): las reciben los
-- roles que ya tenían Usuarios y los administradores.
insert into public.rol_opciones (rol_id, opcion_id)
select r.id, o.id
  from public.roles r
  join public.opciones o on o.codigo in ('MANT_ROLES', 'MANT_OPCIONES')
 where r.codigo in ('admin', 'administrador')
    or exists (select 1 from public.rol_opciones x
                 join public.opciones ox on ox.id = x.opcion_id
                where x.rol_id = r.id and ox.codigo = 'MANT_USUARIOS')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. USUARIOS: estado activo
-- ---------------------------------------------------------------------
alter table public.usuarios add column if not exists activo boolean not null default true;

-- ---------------------------------------------------------------------
-- 5. AUDITORÍA
-- ---------------------------------------------------------------------
create table if not exists public.auditoria (
  id        bigint generated always as identity primary key,
  fecha     timestamp with time zone not null default now(),
  usuario   character varying,
  accion    character varying not null,   -- INGRESO | SALIDA | CREAR | EDITAR | ELIMINAR | PERMISOS
  modulo    character varying,
  detalle   text
);

create index if not exists idx_auditoria_fecha on public.auditoria (fecha desc);

-- ---------------------------------------------------------------------
-- 6. ACCESO DESDE LA APP
-- La app usa la clave pública (anon) de Supabase, igual que en las demás
-- tablas. Si el proyecto activa RLS automáticamente en tablas nuevas, sin
-- estas políticas la app no podría leerlas y el menú quedaría vacío.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['roles', 'opciones', 'rol_opciones', 'auditoria'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acceso_app" on public.%I', t);
    execute format('create policy "acceso_app" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant select, insert, update, delete on public.roles, public.opciones, public.rol_opciones, public.auditoria to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. ASIGNAR EL ROL ADMINISTRADOR
-- Cambie 'su_usuario' por el usuario con el que ingresa al sistema.
-- ---------------------------------------------------------------------
-- update public.usuarios set rol = 'admin' where usuario = 'su_usuario';

-- Verificación
select r.codigo as rol, o.modulo, o.nombre as opcion
  from public.rol_opciones ro
  join public.roles r    on r.id = ro.rol_id
  join public.opciones o on o.id = ro.opcion_id
 order by r.codigo, o.orden;
