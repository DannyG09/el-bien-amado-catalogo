ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS kilometraje INTEGER;

UPDATE public.vehiculos
SET estado = CASE WHEN disponible THEN 'disponible' ELSE 'rentado' END
WHERE estado IS NULL;

UPDATE public.vehiculos AS v
SET kilometraje = (
  SELECT m.kilometraje
  FROM public.mantenimientos AS m
  WHERE m.vehiculo_id = v.id
  ORDER BY m.fecha DESC, m.id DESC
  LIMIT 1
)
WHERE v.kilometraje IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.mantenimientos AS m
    WHERE m.vehiculo_id = v.id
  );

UPDATE public.vehiculos
SET disponible = (estado = 'disponible');

ALTER TABLE public.vehiculos
  ALTER COLUMN estado SET DEFAULT 'disponible',
  ALTER COLUMN estado SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculos_estado_check'
      AND conrelid = 'public.vehiculos'::regclass
  ) THEN
    ALTER TABLE public.vehiculos
      ADD CONSTRAINT vehiculos_estado_check
    CHECK (estado IN ('disponible', 'rentado', 'mantenimiento', 'pintura'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehiculos_kilometraje_check'
      AND conrelid = 'public.vehiculos'::regclass
  ) THEN
    ALTER TABLE public.vehiculos
      ADD CONSTRAINT vehiculos_kilometraje_check
      CHECK (kilometraje IS NULL OR kilometraje >= 0);
  END IF;
END $$;
