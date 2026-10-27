CREATE TABLE IF NOT EXISTS public.reservas_vehiculos (
  id BIGSERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL
    REFERENCES public.vehiculos (id)
    ON DELETE RESTRICT,
  cliente_id BIGINT
    REFERENCES public.clientes (id)
    ON DELETE SET NULL,
  cliente_nombre_manual VARCHAR(200),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_entrega TIME NOT NULL DEFAULT '09:00',
  hora_devolucion TIME NOT NULL DEFAULT '09:00',
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'confirmada'
    CHECK (estado IN ('confirmada', 'cancelada')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin >= fecha_inicio),
  CHECK (cliente_id IS NULL OR cliente_nombre_manual IS NULL)
);

CREATE INDEX IF NOT EXISTS reservas_vehiculos_rango_idx
  ON public.reservas_vehiculos (vehiculo_id, fecha_inicio, fecha_fin)
  WHERE estado = 'confirmada';

CREATE TABLE IF NOT EXISTS public.contrato_extensiones (
  id BIGSERIAL PRIMARY KEY,
  contrato_id BIGINT NOT NULL
    REFERENCES public.contratos (id)
    ON DELETE RESTRICT,
  fecha_fin_anterior DATE NOT NULL,
  fecha_fin_nueva DATE NOT NULL,
  hora_devolucion TIME NOT NULL,
  monto_adicional NUMERIC(12, 2) NOT NULL CHECK (monto_adicional > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (estado IN ('pendiente_aprobacion', 'aprobada', 'rechazada')),
  notas TEXT,
  aprobada_en TIMESTAMPTZ,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin_nueva > fecha_fin_anterior),
  CHECK (
    (estado = 'aprobada' AND aprobada_en IS NOT NULL)
    OR (estado != 'aprobada' AND aprobada_en IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS contrato_extensiones_contrato_idx
  ON public.contrato_extensiones (contrato_id, creada_en DESC, id DESC);
CREATE INDEX IF NOT EXISTS contrato_extensiones_rango_idx
  ON public.contrato_extensiones (fecha_fin_anterior, fecha_fin_nueva)
  WHERE estado IN ('pendiente_aprobacion', 'aprobada');
