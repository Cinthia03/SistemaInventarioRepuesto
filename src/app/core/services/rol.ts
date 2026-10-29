/**
 * Roles de usuario.
 *
 * El login guarda en localStorage el "rol" de la tabla usuarios.
 * Un usuario con rol de CONSULTA solo puede ver: no puede crear, editar ni eliminar.
 */
const ROLES_SOLO_LECTURA = ['consulta', 'lectura', 'solo_lectura', 'visor'];

export function rolActual(): string {
  try {
    return (localStorage.getItem('rol') || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function esSoloLectura(): boolean {
  if (ROLES_SOLO_LECTURA.includes(rolActual())) return true;
  // Marcado desde Parametrización (roles.solo_lectura); lo guarda PermisosService al cargar.
  try {
    return localStorage.getItem('rol_solo_lectura') === '1';
  } catch {
    return false;
  }
}

export function usuarioActual(): string {
  try {
    return (localStorage.getItem('usuario') || '').trim();
  } catch {
    return '';
  }
}

export const MENSAJE_SOLO_LECTURA =
  'Tu usuario es de solo consulta: no tiene permiso para crear, editar ni eliminar información.';
