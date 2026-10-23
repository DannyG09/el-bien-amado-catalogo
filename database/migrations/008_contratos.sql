ALTER TABLE public.vehiculos
  DROP CONSTRAINT IF EXISTS vehiculos_estado_check;

ALTER TABLE public.vehiculos
  ADD CONSTRAINT vehiculos_estado_check
  CHECK (
    estado IN (
      'disponible',
      'reservado',
      'rentado',
      'mantenimiento',
      'pintura'
    )
  );

CREATE TABLE IF NOT EXISTS public.contratos (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL
    REFERENCES public.clientes (id)
    ON DELETE RESTRICT,
  vehiculo_id BIGINT NOT NULL
    REFERENCES public.vehiculos (id)
    ON DELETE RESTRICT,
  cliente_nombre VARCHAR(100) NOT NULL,
  cliente_apellido VARCHAR(100) NOT NULL,
  cliente_cedula VARCHAR(50) NOT NULL,
  cliente_nacionalidad CHAR(2) NOT NULL,
  cliente_telefono VARCHAR(40),
  cliente_whatsapp VARCHAR(40),
  cliente_email VARCHAR(254),
  cliente_direccion TEXT NOT NULL,
  vehiculo_marca VARCHAR(150) NOT NULL,
  vehiculo_modelo VARCHAR(150) NOT NULL,
  vehiculo_anio INTEGER NOT NULL,
  vehiculo_placa VARCHAR(80),
  empresa_nombre VARCHAR(200) NOT NULL,
  empresa_telefono VARCHAR(40),
  empresa_email VARCHAR(254),
  terminos_snapshot TEXT NOT NULL,
  empresa_firma BYTEA,
  empresa_firma_mime VARCHAR(30),
  moneda CHAR(3) NOT NULL CHECK (moneda IN ('DOP', 'USD')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_entrega TIME NOT NULL,
  hora_devolucion TIME NOT NULL,
  precio_dia NUMERIC(12, 2) NOT NULL CHECK (precio_dia > 0),
  deposito NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposito >= 0),
  tipo_descuento TEXT NOT NULL DEFAULT 'fijo'
    CHECK (tipo_descuento IN ('fijo', 'porcentaje')),
  valor_descuento NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (valor_descuento >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  lugar_entrega VARCHAR(500),
  lugar_devolucion VARCHAR(500),
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente_firma'
    CHECK (
      estado IN ('pendiente_firma', 'activo', 'completado', 'cancelado')
    ),
  firma_cliente BYTEA,
  firma_mime VARCHAR(30),
  firma_nombre VARCHAR(255),
  firmado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin >= fecha_inicio),
  CHECK (tipo_descuento != 'porcentaje' OR valor_descuento <= 100),
  CHECK (
    (firma_cliente IS NULL AND firma_mime IS NULL AND firma_nombre IS NULL AND firmado_en IS NULL)
    OR
    (firma_cliente IS NOT NULL AND firma_mime IS NOT NULL AND firma_mime IN ('image/png', 'image/jpeg') AND firma_nombre IS NOT NULL AND firmado_en IS NOT NULL)
  ),
  CHECK (
    (empresa_firma IS NULL AND empresa_firma_mime IS NULL)
    OR
    (empresa_firma IS NOT NULL AND empresa_firma_mime IS NOT NULL AND empresa_firma_mime IN ('image/png', 'image/jpeg'))
  )
);

CREATE INDEX IF NOT EXISTS contratos_cliente_idx
  ON public.contratos (cliente_id, creado_en DESC, id DESC);
CREATE INDEX IF NOT EXISTS contratos_vehiculo_estado_idx
  ON public.contratos (vehiculo_id, estado);

CREATE TABLE IF NOT EXISTS public.contrato_pagos (
  id BIGSERIAL PRIMARY KEY,
  contrato_id BIGINT NOT NULL
    REFERENCES public.contratos (id)
    ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('renta', 'deposito')),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  metodo VARCHAR(80) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia VARCHAR(255),
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contrato_pagos_contrato_idx
  ON public.contrato_pagos (contrato_id, fecha DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.contrato_configuracion (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_empresa VARCHAR(200) NOT NULL DEFAULT 'El Bien Amado Rent A Car',
  telefono VARCHAR(40),
  email VARCHAR(254),
  terminos TEXT NOT NULL DEFAULT
    E'TÉRMINOS Y CONDICIONES DE RENTA DE VEHÍCULOS\n\n1. El arrendatario se compromete a devolver el vehículo en las mismas condiciones en que fue recibido.\n2. El arrendatario es responsable de cualquier daño causado al vehículo durante el período de renta.\n3. Está prohibido el uso del vehículo fuera del territorio acordado.\n4. El arrendatario deberá poseer licencia de conducir vigente durante todo el período de renta.\n5. En caso de accidente, el arrendatario deberá notificar inmediatamente a la empresa.\n6. El depósito será retenido en caso de daños, multas o incumplimiento de las condiciones.',
  firma_empresa BYTEA,
  firma_mime VARCHAR(30),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (firma_empresa IS NULL AND firma_mime IS NULL)
    OR
    (firma_empresa IS NOT NULL AND firma_mime IS NOT NULL AND firma_mime IN ('image/png', 'image/jpeg'))
  )
);

INSERT INTO public.contrato_configuracion (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
