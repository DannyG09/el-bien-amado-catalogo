import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";

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

// DELETE /api/vehiculos/:id
export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const pool = await getConnection();

    const result = await pool.query(
      `
      DELETE FROM vehiculos
      WHERE id = $1
      RETURNING id
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