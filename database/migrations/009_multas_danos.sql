CREATE TABLE IF NOT EXISTS public.multas_danos (
  id BIGSERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL
    REFERENCES public.vehiculos (id)
    ON DELETE RESTRICT,
  cliente_id BIGINT
    REFERENCES public.clientes (id)
    ON DELETE SET NULL,
  cliente_nombre_manual VARCHAR(200),
  contrato_id BIGINT
    REFERENCES public.contratos (id)
    ON DELETE SET NULL,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('multa', 'dano')),
  fecha DATE NOT NULL,
  descripcion VARCHAR(1000) NOT NULL,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado')),
  fecha_pago DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (cliente_id IS NULL OR cliente_nombre_manual IS NULL),
  CHECK (
    (estado = 'pendiente' AND fecha_pago IS NULL)
    OR (estado = 'pagado' AND fecha_pago IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS multas_danos_vehiculo_fecha_idx
  ON public.multas_danos (vehiculo_id, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS multas_danos_estado_fecha_idx
  ON public.multas_danos (estado, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS multas_danos_cliente_idx
  ON public.multas_danos (cliente_id, fecha DESC, id DESC);
CREATE INDEX IF NOT EXISTS multas_danos_contrato_idx
  ON public.multas_danos (contrato_id);

CREATE TABLE IF NOT EXISTS public.multas_danos_fotos (
  id BIGSERIAL PRIMARY KEY,
  multa_dano_id BIGINT NOT NULL
    REFERENCES public.multas_danos (id)
    ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  public_id VARCHAR(500) NOT NULL UNIQUE,
  formato VARCHAR(10) NOT NULL
    CHECK (formato IN ('jpg', 'png', 'webp')),
  version BIGINT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS multas_danos_fotos_incidente_idx
  ON public.multas_danos_fotos (multa_dano_id, creado_en, id);
