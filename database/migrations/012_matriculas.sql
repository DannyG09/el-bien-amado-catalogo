CREATE TABLE IF NOT EXISTS matriculas (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    vehiculo_id INTEGER NOT NULL UNIQUE,

    imagen_url TEXT NOT NULL,

    imagen_public_id TEXT NOT NULL,

    fecha_registro TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_matricula_vehiculo
        FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos(id)
        ON DELETE CASCADE
);