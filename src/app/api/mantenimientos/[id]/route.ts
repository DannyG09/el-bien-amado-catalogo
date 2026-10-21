import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { validarDatosMantenimiento } from "../../../lib/mantenimientos";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const mantenimientoId = Number(id);
    if (!Number.isSafeInteger(mantenimientoId) || mantenimientoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del mantenimiento no es válido." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no contiene JSON válido." },
        { status: 400 }
      );
    }

    const validacion = validarDatosMantenimiento(body);
    if (!validacion.valido) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const datos = validacion.datos;
    const pool = await getConnection();
    const resultado = await pool.query(
      `UPDATE public.mantenimientos AS m
       SET
         vehiculo_id = v.id,
         fecha = $3,
         categoria = $4,
         monto = $5,
         kilometraje = $6,
         descripcion = $7
       FROM public.vehiculos AS v
       WHERE m.id = $1
         AND v.id = $2
       RETURNING
         m.id,
         m.vehiculo_id AS "vehiculoId",
         CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
         v.placa,
         m.fecha::text AS fecha,
         m.categoria,
         m.monto,
         m.kilometraje,
         m.descripcion`,
      [
        mantenimientoId,
        datos.vehiculoId,
        datos.fecha,
        datos.categoria,
        datos.monto,
        datos.kilometraje,
        datos.descripcion,
      ]
    );

    if (resultado.rows.length === 0) {
      const existente = await pool.query(
        "SELECT id FROM public.mantenimientos WHERE id = $1",
        [mantenimientoId]
      );
      return NextResponse.json(
        {
          error:
            existente.rows.length === 0
              ? "El mantenimiento no existe."
              : "El vehículo seleccionado no existe.",
        },
        { status: 404 }
      );
    }

    const fila = resultado.rows[0];
    return NextResponse.json({
      ...fila,
      id: Number(fila.id),
      vehiculoId: Number(fila.vehiculoId),
      monto: Number(fila.monto),
      kilometraje: Number(fila.kilometraje),
    });
  } catch (error) {
    console.error("Error al actualizar mantenimiento:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el mantenimiento." },
      { status: 500 }
    );
  }
}
