ALTER TABLE public.vehiculos
  DROP CONSTRAINT IF EXISTS vehiculos_estado_check;

ALTER TABLE public.vehiculos
  ADD CONSTRAINT vehiculos_estado_check
  CHECK (
    estado IN ('disponible', 'rentado', 'mantenimiento', 'pintura')
  );
