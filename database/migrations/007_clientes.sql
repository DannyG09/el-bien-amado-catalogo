CREATE TABLE IF NOT EXISTS public.clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  cedula VARCHAR(50) NOT NULL UNIQUE,
  nacionalidad CHAR(2) NOT NULL,
  telefono VARCHAR(40),
  whatsapp VARCHAR(40),
  email VARCHAR(254),
  vencimiento_licencia DATE NOT NULL,
  direccion TEXT NOT NULL,
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cliente_documentos (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL
    REFERENCES public.clientes (id)
    ON DELETE CASCADE,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('foto_perfil', 'cedula', 'licencia', 'otro')),
  nombre_archivo VARCHAR(255) NOT NULL,
  public_id VARCHAR(500) NOT NULL UNIQUE,
  formato VARCHAR(10) NOT NULL,
  resource_type TEXT NOT NULL
    CHECK (resource_type IN ('image', 'raw')),
  version BIGINT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cliente_documentos_cliente_idx
  ON public.cliente_documentos (cliente_id, creado_en DESC, id DESC);
