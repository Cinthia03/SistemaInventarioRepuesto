import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { esSoloLectura, MENSAJE_SOLO_LECTURA, usuarioActual } from './rol';

/**
 * fetch que usa el cliente de Supabase.
 * Si el usuario es de solo consulta, cualquier escritura (POST / PATCH / PUT / DELETE:
 * insertar, actualizar, eliminar o llamar funciones que modifican datos) se rechaza
 * aquí mismo, antes de llegar a la base de datos. Las lecturas (GET) funcionan normal.
 */
const fetchSegunRol: typeof fetch = (input, init) => {
  const metodo = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  // La bitácora de auditoría (ingresos/salidas) se registra también para usuarios de consulta.
  const esAuditoria = metodo === 'POST' && url.includes('/rest/v1/auditoria');
  // "Mi perfil": cualquier usuario puede actualizar sus propios datos (nombre y contraseña).
  const esPerfilPropio = metodo === 'PATCH' && url.includes('/rest/v1/usuarios?')
    && new URL(url).searchParams.get('usuario') === `eq.${usuarioActual()}`;
  if (esSoloLectura() && !esAuditoria && !esPerfilPropio && metodo !== 'GET' && metodo !== 'HEAD' && metodo !== 'OPTIONS') {
    const cuerpo = JSON.stringify({ message: MENSAJE_SOLO_LECTURA, code: 'SOLO_LECTURA', details: null, hint: null });
    return Promise.resolve(new Response(cuerpo, { status: 403, headers: { 'Content-Type': 'application/json' } }));
  }
  return fetch(input, init);
};

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
    { global: { fetch: fetchSegunRol } }
  );

}
