import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";

export const runtime = "nodejs";

// GET /api/vehiculos
export async function GET() {
  try {
    const pool = await getConnection();

    const result = await pool.query(`
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
      ORDER BY id DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al consultar vehículos:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener los vehículos",
      },
      {
        status: 500,
      }
    );
  }
}

// POST /api/vehiculos
export async function POST(request: Request) {
  try {
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
      INSERT INTO vehiculos (
        marca,
        modelo,
        anio,
        placa,
        color,
        tiposeguro,
        preciodia,
        imagen,
        descripcion,
        disponible
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      ]
    );

    return NextResponse.json(result.rows[0], {
      status: 201,
    });
  } catch (error) {
    console.error("Error al registrar vehículo:", error);

    return NextResponse.json(
      {
        error: "No se pudo registrar el vehículo",
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