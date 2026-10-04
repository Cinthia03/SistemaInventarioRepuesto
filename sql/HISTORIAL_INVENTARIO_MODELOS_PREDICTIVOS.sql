-- ============================================================
--  HISTORIAL DE INVENTARIO (para los Modelos Predictivos)
-- ============================================================
--
--  Guarda una "fotografía" (snapshot) del stock y el precio de cada
--  ítem de materiales / mano_obra / equipos en una fecha dada.
--  El módulo "Modelos Predictivos" usa estas fotografías para calcular
--  una regresión lineal simple por ítem y proyectar:
--    - el stock esperado a 30 días,
--    - cuántos días faltan para que un ítem se agote,
--    - la tendencia del precio a 30 días.
--
--  La fotografía de "hoy" se registra desde la app con el botón
--  "Registrar punto de hoy" dentro del módulo de Modelos Predictivos
--  (o puede completarse manualmente insertando filas con fechas
--  pasadas, si se cuenta con datos históricos de otra fuente).
--
--  Ejecutar este script una sola vez en el SQL Editor de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_inventario (
    id            BIGSERIAL PRIMARY KEY,
    tipo          VARCHAR(20)   NOT NULL
                  CHECK (tipo IN ('materiales', 'mano_obra', 'equipos')),
    codigo        VARCHAR(50)   NOT NULL,
    descripcion   TEXT,
    categoria     VARCHAR(100),
    stock         NUMERIC(14,4),              -- NULL para mano_obra (no maneja stock)
    precio        NUMERIC(14,4) NOT NULL DEFAULT 0,
    fecha         DATE          NOT NULL DEFAULT CURRENT_DATE,
    creado_en     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Un solo registro por ítem, por catálogo, por día
    CONSTRAINT historial_inventario_unico UNIQUE (tipo, codigo, fecha)
);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_tipo_codigo
    ON historial_inventario (tipo, codigo, fecha);

COMMENT ON TABLE historial_inventario IS
    'Fotografías diarias de stock/precio usadas por el módulo de Modelos Predictivos';
