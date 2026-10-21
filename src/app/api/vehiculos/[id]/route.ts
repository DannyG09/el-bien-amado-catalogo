import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";

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
        disponible
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
    } = body;

    const pool = await getConnection();

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
        disponible = $10
      WHERE id = $11
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
        disponible
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
        disponible ?? true,
        Number(id),
      ]
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

    const disponible =
      typeof body === "object" && body !== null && "disponible" in body
        ? body.disponible
        : undefined;
    if (typeof disponible !== "boolean") {
      return NextResponse.json(
        { error: "El estado de disponibilidad no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const result = await pool.query(
      `UPDATE vehiculos
       SET disponible = $1
       WHERE id = $2
       RETURNING disponible`,
      [disponible, vehiculoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Disponibilidad actualizada correctamente.",
      disponible: result.rows[0].disponible === true,
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