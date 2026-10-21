CREATE TABLE IF NOT EXISTS public.vehiculo_gastos_recurrentes (
  id SERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL
    REFERENCES public.vehiculos (id)
    ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  frecuencia TEXT NOT NULL
    CHECK (frecuencia IN ('mensual', 'anual')),
  fecha_inicio DATE NOT NULL,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehiculo_gastos_recurrentes_vehiculo_idx
  ON public.vehiculo_gastos_recurrentes (vehiculo_id, fecha_inicio DESC);
