import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";

const ESTADOS_VEHICULO = [
  "disponible",
  "reservado",
  "rentado",
  "mantenimiento",
  "pintura",
] as const;

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/vehiculos/:id
export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const pool = await getConnection();
    const result = await pool.query(
      `
      SELECT
        id,
        marca,
        modelo,
        anio,
        placa,
        color,
        tiposeguro AS "tipoSeguro",
        preciodia AS "precioDia",
        imagen,
        descripcion,
        disponible,
        estado,
        kilometraje AS "ultimoKilometraje"
      FROM vehiculos
      WHERE id = $1
      `,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Vehículo no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener vehículo:", error);

    return NextResponse.json(
      {
        error: "Error al obtener el vehículo",
        detalle:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      {
        status: 500,
      }
    );
  }
}

// PUT /api/vehiculos/:id
export async function PUT(
  request: Request,
  { params }: Params
) {
    try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    const {
      marca,
      modelo,
      anio,
      placa,
      color,
      tipoSeguro,
      precioDia,
      imagen,
      descripcion,
      disponible,
      estado,
      kilometraje,
    } = body;

    if (
      (estado != null &&
        (typeof estado !== "string" ||
          !ESTADOS_VEHICULO.includes(
            estado as (typeof ESTADOS_VEHICULO)[number]
          ))) ||
      (kilometraje != null &&
        ((typeof kilometraje !== "number" &&
          typeof kilometraje !== "string") ||
          (typeof kilometraje === "string" && !kilometraje.trim()) ||
          !Number.isSafeInteger(Number(kilometraje)) ||
          Number(kilometraje) < 0 ||
          Number(kilometraje) > 2147483647))
    ) {
      return NextResponse.json(
        { error: "El estado o kilometraje del vehículo no es válido." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    const estadoExistente = await pool.query(
      `SELECT estado,
              EXISTS (
                SELECT 1 FROM public.contratos AS c
                WHERE c.vehiculo_id = vehiculos.id
                  AND c.estado IN ('pendiente_firma', 'activo')
              ) AS "tieneContratoActivo"
       FROM vehiculos WHERE id = $1`,
      [Number(id)]
    );
    if (estadoExistente.rows.length === 0) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }
    if (
      (estadoExistente.rows[0].estado === "reservado" &&
        estado != null &&
        estado !== "reservado") ||
      (estadoExistente.rows[0].estado !== "reservado" &&
        estado === "reservado") ||
      (estadoExistente.rows[0].tieneContratoActivo &&
        estado != null &&
        estado !== estadoExistente.rows[0].estado)
    ) {
      return NextResponse.json(
        { error: "El estado reservado solo puede cambiarse desde el contrato." },
        { status: 409 }
      );
    }
    const estadoActualizado =
      estadoExistente.rows[0].estado === "reservado" ||
      estadoExistente.rows[0].tieneContratoActivo
        ? estadoExistente.rows[0].estado
        : estado ?? (disponible === false ? "rentado" : "disponible");

    const result = await pool.query(
      `
      UPDATE vehiculos
      SET
        marca = $1,
        modelo = $2,
        anio = $3,
        placa = $4,
        color = $5,
        tiposeguro = $6,
        preciodia = $7,
        imagen = $8,
        descripcion = $9,
        disponible = $10,
        estado = $11,
        kilometraje = COALESCE($12, kilometraje)
      WHERE id = $13
        AND (estado <> 'reservado' OR $11 = 'reservado')
        AND (
          $11 = estado
          OR NOT EXISTS (
            SELECT 1 FROM public.contratos AS c
            WHERE c.vehiculo_id = vehiculos.id
              AND c.estado IN ('pendiente_firma', 'activo')
          )
        )
      RETURNING
        id,
        marca,
        modelo,
        anio,
        placa,
        color,
        tiposeguro AS "tipoSeguro",
        preciodia AS "precioDia",
        imagen,
        descripcion,
        disponible,
        estado,
        kilometraje AS "ultimoKilometraje"
      `,
      [
        marca,
        modelo,
        Number(anio),
        placa,
        color,
        tipoSeguro,
        Number(precioDia),
        imagen || null,
        descripcion || null,
        estadoActualizado === "disponible",
        estadoActualizado,
        kilometraje == null ? null : Number(kilometraje),
        Number(id),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: "El vehículo no existe o fue reservado por un contrato.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      mensaje: "Vehículo actualizado correctamente",
      vehiculo: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar vehículo:", error);

    return NextResponse.json(
      {
        error: "Error al actualizar el vehículo",
        detalle:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      {
        status: 500,
      }
    );
  }
}

// PATCH /api/vehiculos/:id
export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehiculoId = Number(id);
    if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del vehículo no es válido." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 }
      );
    }
    const datos = body as Record<string, unknown>;
    let estado: (typeof ESTADOS_VEHICULO)[number] | undefined;
    if ("estado" in datos) {
      if (
        typeof datos.estado !== "string" ||
        !ESTADOS_VEHICULO.includes(
          datos.estado as (typeof ESTADOS_VEHICULO)[number]
        )
      ) {
        return NextResponse.json(
          { error: "El estado del vehículo no es válido." },
          { status: 400 }
        );
      }
      estado = datos.estado as (typeof ESTADOS_VEHICULO)[number];
      if (estado === "reservado") {
        return NextResponse.json(
          { error: "El estado reservado solo se puede asignar desde un contrato." },
          { status: 400 }
        );
      }
    } else if ("disponible" in datos) {
      if (typeof datos.disponible !== "boolean") {
        return NextResponse.json(
          { error: "El estado de disponibilidad no es válido." },
          { status: 400 }
        );
      }
      estado = datos.disponible ? "disponible" : "rentado";
    }

    let kilometraje: number | undefined;
    if ("kilometraje" in datos) {
      kilometraje = Number(datos.kilometraje);
      if (
        (typeof datos.kilometraje !== "number" &&
          typeof datos.kilometraje !== "string") ||
        (typeof datos.kilometraje === "string" &&
          !datos.kilometraje.trim()) ||
        !Number.isSafeInteger(kilometraje) ||
        kilometraje < 0 ||
        kilometraje > 2147483647
      ) {
        return NextResponse.json(
          { error: "El kilometraje debe ser un entero igual o mayor que cero." },
          { status: 400 }
        );
      }
    }
    if (estado === undefined && kilometraje === undefined) {
      return NextResponse.json(
        { error: "Indica un estado o kilometraje para actualizar." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const estadoActual = await pool.query(
      `SELECT estado,
              EXISTS (
                SELECT 1 FROM public.contratos AS c
                WHERE c.vehiculo_id = vehiculos.id
                  AND c.estado IN ('pendiente_firma', 'activo')
              ) AS "tieneContratoActivo"
       FROM vehiculos WHERE id = $1`,
      [vehiculoId]
    );
    if (estadoActual.rows.length === 0) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }
    if (
      (estadoActual.rows[0].estado === "reservado" && estado != null) ||
      (estadoActual.rows[0].tieneContratoActivo &&
        estado != null &&
        estado !== estadoActual.rows[0].estado)
    ) {
      return NextResponse.json(
        { error: "El estado reservado solo puede cambiarse desde el contrato." },
        { status: 409 }
      );
    }
    const result = await pool.query(
      `UPDATE vehiculos
       SET
         estado = COALESCE($1::text, estado),
         disponible = COALESCE($1::text = 'disponible', disponible),
         kilometraje = COALESCE($2::integer, kilometraje)
       WHERE id = $3
         AND (estado <> 'reservado' OR $1::text IS NULL)
         AND (
           $1::text IS NULL
           OR $1::text = estado
           OR NOT EXISTS (
             SELECT 1 FROM public.contratos AS c
             WHERE c.vehiculo_id = vehiculos.id
               AND c.estado IN ('pendiente_firma', 'activo')
           )
         )
       RETURNING disponible, estado, kilometraje AS "ultimoKilometraje"`,
      [estado ?? null, kilometraje ?? null, vehiculoId]
    );

    if (result.rows.length === 0) {
      const existe = await pool.query(
        "SELECT 1 FROM vehiculos WHERE id = $1",
        [vehiculoId]
      );
      return NextResponse.json(
        {
          error:
            existe.rows.length > 0
              ? "El vehículo quedó reservado por un contrato y no se puede cambiar su estado manualmente."
              : "Vehículo no encontrado.",
        },
        { status: existe.rows.length > 0 ? 409 : 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Disponibilidad actualizada correctamente.",
      disponible: result.rows[0].disponible === true,
      estado: result.rows[0].estado,
      ultimoKilometraje:
        result.rows[0].ultimoKilometraje == null
          ? null
          : Number(result.rows[0].ultimoKilometraje),
    });
  } catch (error) {
    console.error("Error al actualizar la disponibilidad del vehículo:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la disponibilidad del vehículo." },
      { status: 500 }
    );
  }
}

// DELETE /api/vehiculos/:id
export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión como administrador." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Debes confirmar tu contraseña de administrador." },
        { status: 400 }
      );
    }

    const password =
      typeof body === "object" && body !== null && "password" in body
        ? body.password
        : undefined;
    if (typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "Debes introducir tu contraseña de administrador." },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("Falta configurar la contraseña del administrador.");
      return NextResponse.json(
        { error: "La verificación de administrador no está disponible." },
        { status: 500 }
      );
    }

    const passwordBuffer = Buffer.from(password, "utf8");
    const adminPasswordBuffer = Buffer.from(adminPassword, "utf8");
    const passwordValida =
      passwordBuffer.length === adminPasswordBuffer.length &&
      timingSafeEqual(passwordBuffer, adminPasswordBuffer);

    if (!passwordValida) {
      return NextResponse.json(
        { error: "La contraseña de administrador es incorrecta." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehiculoId = Number(id);
    if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del vehículo no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const contratos = await pool.query(
      "SELECT 1 FROM public.contratos WHERE vehiculo_id = $1 LIMIT 1",
      [vehiculoId]
    );
    if (contratos.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar este vehículo porque tiene contratos asociados. Conserva el historial del vehículo.",
        },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM vehiculos
      WHERE id = $1
      RETURNING id
      `,
      [vehiculoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Vehículo no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      mensaje: "Vehículo eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar vehículo:", error);

    return NextResponse.json(
      {
        error: "Error al eliminar el vehículo",
        detalle:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      {
        status: 500,
      }
    );
  }
}