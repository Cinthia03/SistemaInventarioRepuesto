-- =====================================================================
-- USUARIO DE SOLO CONSULTA
-- Puede ver todos los módulos, pero no crear, editar ni eliminar.
-- La app reconoce el rol 'consulta' (ver src/app/core/services/rol.ts).
--
-- Cambia el usuario / contraseña si quieres otros antes de ejecutarlo.
-- Se puede ejecutar más de una vez: si el usuario ya existe, no lo duplica.
-- =====================================================================
do $$
begin
  if not exists (select 1 from public.usuarios where usuario = 'Consulta') then
    begin
      -- si "id" se genera solo (identity / serial)
      insert into public.usuarios (usuario, password, nombre, rol)
      values ('Consulta', 'consulta2026', 'Usuario de Consulta', 'consulta');
    exception when not_null_violation then
      -- si "id" no tiene valor por defecto, se usa el siguiente número
      insert into public.usuarios (id, usuario, password, nombre, rol)
      select coalesce(max(id), 0) + 1, 'Consulta', 'consulta2026', 'Usuario de Consulta', 'consulta'
        from public.usuarios;
    end;
  end if;
end $$;

select id, usuario, nombre, rol from public.usuarios order by id;
