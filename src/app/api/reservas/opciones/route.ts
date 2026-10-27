import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../lib/auth";
import { condicionDisponibilidadFechas, validarRangoFechas } from "../../../lib/disponibilidad-vehiculos";
import { getConnection } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const parametros = new URL(request.url).searchParams;
    const fechaInicio = parametros.get("fechaInicio");
    const fechaFin = parametros.get("fechaFin");
    if (
      (fechaInicio !== null || fechaFin !== null) &&
      !validarRangoFechas(fechaInicio, fechaFin)
    ) {
      return NextResponse.json(
        { error: "Indica un rango de fechas válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const [clientes, vehiculos] = await Promise.all([
      pool.query(
        `SELECT id, nombre, apellido, cedula
         FROM public.clientes
         ORDER BY apellido, nombre, id DESC`
      ),
      pool.query(
        `SELECT v.id, v.marca, v.modelo, v.anio, v.placa
         FROM public.vehiculos AS v
         WHERE ${
           fechaInicio && fechaFin
             ? condicionDisponibilidadFechas("v", "$1", "$2")
             : `v.estado = 'disponible'
                AND NOT EXISTS (
                  SELECT 1 FROM public.contratos AS c
                  WHERE c.vehiculo_id = v.id
                    AND c.estado IN ('pendiente_firma', 'activo')
                )`
         }
         ORDER BY v.marca, v.modelo, v.anio DESC, v.id DESC`,
        fechaInicio && fechaFin ? [fechaInicio, fechaFin] : []
      ),
    ]);

    return NextResponse.json({
      clientes: clientes.rows.map((cliente: Record<string, unknown>) => ({
        ...cliente,
        id: Number(cliente.id),
      })),
      vehiculos: vehiculos.rows.map((vehiculo: Record<string, unknown>) => ({
        ...vehiculo,
        id: Number(vehiculo.id),
        anio: Number(vehiculo.anio),
      })),
    });
  } catch (error) {
    console.error("Error al cargar opciones de reservas:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar clientes y vehículos disponibles." },
      { status: 500 }
    );
  }
}
