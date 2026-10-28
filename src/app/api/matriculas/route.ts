
import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";

export const runtime = "nodejs";

// GET /api/matriculas
export async function GET() {
  try {
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const pool = await getConnection();

    const resultado = await pool.query(`
      SELECT
        v.id AS "vehiculoId",
        v.marca,
        v.modelo,
        v.anio,
        v.color,
        v.placa,
        v.imagen AS "imagen",
        m.id AS "matriculaId",
        m.fecha_registro AS "fechaRegistro",
        m.fecha_actualizacion AS "fechaActualizacion",
        CASE
          WHEN m.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS "tieneMatricula"
      FROM public.vehiculos AS v
      LEFT JOIN public.matriculas AS m
        ON m.vehiculo_id = v.id
      ORDER BY v.marca, v.modelo, v.anio DESC
    `);

    return NextResponse.json(resultado.rows, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error al consultar matrículas:", error);

    return NextResponse.json(
      { error: "No se pudieron consultar las matrículas." },
      { status: 500 }
    );
  }
}
