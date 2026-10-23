import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
        `SELECT id, marca, modelo, anio, placa, preciodia AS "precioDia"
         FROM public.vehiculos
         WHERE estado = 'disponible'
           AND NOT EXISTS (
             SELECT 1 FROM public.contratos AS c
             WHERE c.vehiculo_id = public.vehiculos.id
               AND c.estado IN ('pendiente_firma', 'activo')
           )
         ORDER BY marca, modelo, anio DESC, id DESC`
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
