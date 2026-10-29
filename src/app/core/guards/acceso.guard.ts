import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';
import { opcionDeRuta } from '../menu/menu.config';
import { usuarioActual } from '../services/rol';

/**
 * Protege las pantallas del sistema:
 *  1. Sin sesión iniciada  -> vuelve al login.
 *  2. Sin permiso para la opción (Opciones x Rol) -> vuelve a Inicio.
 */
export const accesoGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const permisos = inject(PermisosService);

  if (!usuarioActual()) {
    return router.createUrlTree(['/login']);
  }

  await permisos.cargar();

  const codigo = opcionDeRuta(state.url);
  if (!codigo || permisos.puede(codigo)) return true;

  return router.createUrlTree(['/inicio'], { queryParams: { sinPermiso: 1 } });
};
