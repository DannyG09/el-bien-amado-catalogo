CREATE TABLE IF NOT EXISTS public.mantenimientos (
  id SERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL
    REFERENCES public.vehiculos (id)
    ON DELETE CASCADE,
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL
    CHECK (
      categoria IN (
        'Aceite',
        'Mantenimiento general',
        'Bandas de freno',
        'Combustible',
        'Otro'
      )
    ),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  kilometraje INTEGER NOT NULL CHECK (kilometraje >= 0),
  descripcion VARCHAR(500),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mantenimientos_vehiculo_fecha_idx
  ON public.mantenimientos (vehiculo_id, fecha DESC, id DESC);
