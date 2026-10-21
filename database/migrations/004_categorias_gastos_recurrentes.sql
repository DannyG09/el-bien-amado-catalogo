ALTER TABLE public.vehiculo_gastos_recurrentes
  ADD COLUMN IF NOT EXISTS categoria TEXT;

UPDATE public.vehiculo_gastos_recurrentes
SET categoria = CASE
  WHEN LOWER(nombre) LIKE '%seguro%' THEN 'seguro'
  WHEN LOWER(nombre) LIKE '%marbete%' THEN 'marbete'
  WHEN LOWER(nombre) LIKE '%gps%' THEN 'gps'
  WHEN LOWER(nombre) LIKE '%mantenimiento%'
    OR LOWER(nombre) LIKE '%aceite%'
    OR LOWER(nombre) LIKE '%goma%'
    OR LOWER(nombre) LIKE '%filtro%' THEN 'mantenimiento'
  ELSE 'otro'
END
WHERE categoria IS NULL;

ALTER TABLE public.vehiculo_gastos_recurrentes
  ALTER COLUMN categoria SET DEFAULT 'otro',
  ALTER COLUMN categoria SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculo_gastos_recurrentes_categoria_check'
      AND conrelid = 'public.vehiculo_gastos_recurrentes'::regclass
  ) THEN
    ALTER TABLE public.vehiculo_gastos_recurrentes
      ADD CONSTRAINT vehiculo_gastos_recurrentes_categoria_check
      CHECK (categoria IN ('seguro', 'marbete', 'gps', 'mantenimiento', 'otro'));
  END IF;
END
$$;
