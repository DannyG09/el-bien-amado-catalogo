ALTER TABLE public.mantenimientos
  ADD COLUMN IF NOT EXISTS factura_public_id TEXT,
  ADD COLUMN IF NOT EXISTS factura_formato TEXT,
  ADD COLUMN IF NOT EXISTS factura_version BIGINT;
