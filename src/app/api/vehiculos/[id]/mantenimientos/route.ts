import { NextResponse } from "next/server";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
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
    const resultado = await pool.query(
      `SELECT id, fecha::text AS fecha, categoria, monto, kilometraje, descripcion
       FROM public.mantenimientos
       WHERE vehiculo_id = $1
       ORDER BY fecha DESC, id DESC
       LIMIT 5`,
      [vehiculoId]
    );

    return NextResponse.json(
      resultado.rows.map((fila: Record<string, unknown>) => ({
        id: Number(fila.id),
        fecha: String(fila.fecha),
        categoria: String(fila.categoria),
        monto: Number(fila.monto),
        kilometraje: Number(fila.kilometraje),
        descripcion:
          typeof fila.descripcion === "string" ? fila.descripcion : null,
      })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al consultar los mantenimientos recientes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los mantenimientos recientes." },
      { status: 500 }
    );
  }
}
