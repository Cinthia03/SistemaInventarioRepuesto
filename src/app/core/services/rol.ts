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
  return ROLES_SOLO_LECTURA.includes(rolActual());
}

export const MENSAJE_SOLO_LECTURA =
  'Tu usuario es de solo consulta: no tiene permiso para crear, editar ni eliminar información.';
