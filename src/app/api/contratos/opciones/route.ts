import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import {
  condicionDisponibilidadFechas,
  validarRangoFechas,
} from "../../../lib/disponibilidad-vehiculos";

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
        `SELECT id, nombre, apellido, cedula, whatsapp,
                vencimiento_licencia::text AS "vencimientoLicencia"
         FROM public.clientes
         ORDER BY apellido, nombre, id DESC`
      ),
      pool.query(
        `SELECT v.id, v.marca, v.modelo, v.anio, v.placa,
                v.preciodia AS "precioDia"
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
      clientes: clientes.rows.map((item: Record<string, unknown>) => ({
        ...item,
        id: Number(item.id),
      })),
      vehiculos: vehiculos.rows.map((item: Record<string, unknown>) => ({
        ...item,
        id: Number(item.id),
        anio: Number(item.anio),
        precioDia: Number(item.precioDia ?? 0),
      })),
    });
  } catch (error) {
    console.error("Error al cargar opciones de contratos:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar clientes y vehículos disponibles." },
      { status: 500 }
    );
  }
}
