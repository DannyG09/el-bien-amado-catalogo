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

    const connection = await getConnection();

    const result = await connection
      .request()
      .input("id", Number(id))
      .query(`
        SELECT
          id,
          marca,
          modelo,
          anio,
          placa,
          color,
          tipoSeguro,
          precioDia,
          imagen,
          descripcion,
          disponible
        FROM Vehiculos
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        {
          error: "Vehículo no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error(error);

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

    const connection = await getConnection();

    await connection
      .request()
      .input("id", Number(id))
      .input("marca", marca)
      .input("modelo", modelo)
      .input("anio", Number(anio))
      .input("placa", placa)
      .input("color", color)
      .input("tipoSeguro", tipoSeguro)
      .input("precioDia", Number(precioDia))
      .input("imagen", imagen)
      .input("descripcion", descripcion)
      .input("disponible", disponible)
      .query(`
        UPDATE Vehiculos
        SET
          marca = @marca,
          modelo = @modelo,
          anio = @anio,
          placa = @placa,
          color = @color,
          tipoSeguro = @tipoSeguro,
          precioDia = @precioDia,
          imagen = @imagen,
          descripcion = @descripcion,
          disponible = @disponible
        WHERE id = @id
      `);

    return NextResponse.json({
      mensaje: "Vehículo actualizado correctamente",
    });
  } catch (error) {
    console.error(error);

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

    const connection = await getConnection();

    await connection
      .request()
      .input("id", Number(id))
      .query(`
        DELETE FROM Vehiculos
        WHERE id = @id
      `);

    return NextResponse.json({
      mensaje: "Vehículo eliminado correctamente",
    });
  } catch (error) {
    console.error(error);

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