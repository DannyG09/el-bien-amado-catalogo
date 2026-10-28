ALTER TABLE public.vehiculo_gastos_recurrentes
  ADD COLUMN IF NOT EXISTS foto_public_id TEXT,
  ADD COLUMN IF NOT EXISTS foto_version BIGINT,
  ADD COLUMN IF NOT EXISTS foto_nombre VARCHAR(255);
