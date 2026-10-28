import { NextResponse } from "next/server";
import { getConnection } from "../../../../../../lib/db";
import { isAdminAuthenticated } from "../../../../../../lib/auth";
import {
  crearUrlPrivadaFotoGasto,
  eliminarFotoGasto,
  MAX_TAMANO_FOTO_GASTO,
  subirFotoGasto,
  validarFotoGasto,
  type FotoGastoSubida,
} from "../../../../../../lib/fotos-gastos-recurrentes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; gastoId: string }>;
};

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: Params) {
  let fotoSubida: FotoGastoSubida | null = null;
  let fotoGuardada = false;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id, gastoId } = await params;
    const vehiculoId = leerId(id);
    const gastoRecurrenteId = leerId(gastoId);
    if (vehiculoId === null || gastoRecurrenteId === null) {
      return NextResponse.json({ error: "El identificador no es válido." }, { status: 400 });
    }

    let archivo: File;
    try {
      const entrada = (await request.formData()).get("foto");
      if (!entrada || typeof entrada === "string") {
        return NextResponse.json({ error: "Selecciona una foto del gasto." }, { status: 400 });
      }
      archivo = entrada;
    } catch {
      return NextResponse.json({ error: "El formulario no contiene una foto válida." }, { status: 400 });
    }
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (archivo.size > MAX_TAMANO_FOTO_GASTO || !validarFotoGasto(archivo.type, bytes)) {
      return NextResponse.json(
        { error: "La foto debe ser JPG, PNG o WEBP y no superar 5 MB." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const existente = await pool.query(
      `SELECT foto_public_id AS "fotoPublicId"
       FROM public.vehiculo_gastos_recurrentes
       WHERE id = $1 AND vehiculo_id = $2`,
      [gastoRecurrenteId, vehiculoId]
    );
    if (existente.rows.length === 0) {
      return NextResponse.json({ error: "No se encontró el gasto de este vehículo." }, { status: 404 });
    }

    fotoSubida = await subirFotoGasto(bytes);
    const nombre = archivo.name.replace(/[\\/\0-\x1f]/g, "_").trim().slice(0, 255) || "foto";
    const actualizado = await pool.query(
      `UPDATE public.vehiculo_gastos_recurrentes
       SET foto_public_id = $3, foto_version = $4, foto_nombre = $5
       WHERE id = $1 AND vehiculo_id = $2
       RETURNING id`,
      [gastoRecurrenteId, vehiculoId, fotoSubida.publicId, fotoSubida.version, nombre]
    );
    if (actualizado.rows.length === 0) {
      await eliminarFotoGasto(fotoSubida.publicId);
      fotoSubida = null;
      return NextResponse.json({ error: "El gasto ya no existe." }, { status: 404 });
    }
    fotoGuardada = true;

    const fotoAnterior = existente.rows[0].fotoPublicId;
    if (typeof fotoAnterior === "string" && fotoAnterior) {
      try {
        await eliminarFotoGasto(fotoAnterior);
      } catch (error) {
        console.error("No se pudo eliminar la foto reemplazada del gasto:", error);
      }
    }

    return NextResponse.json({
      fotoUrl: crearUrlPrivadaFotoGasto(fotoSubida.publicId, fotoSubida.version),
      fotoNombre: nombre,
    });
  } catch (error) {
    if (fotoSubida && !fotoGuardada) {
      try {
        await eliminarFotoGasto(fotoSubida.publicId);
      } catch (errorLimpieza) {
        console.error("No se pudo limpiar una foto huérfana de un gasto:", errorLimpieza);
      }
    }
    console.error("Error al guardar la foto del gasto recurrente:", error);
    return NextResponse.json({ error: "No se pudo guardar la foto del gasto." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const { id, gastoId } = await params;
    const vehiculoId = leerId(id);
    const gastoRecurrenteId = leerId(gastoId);
    if (vehiculoId === null || gastoRecurrenteId === null) {
      return NextResponse.json({ error: "El identificador no es válido." }, { status: 400 });
    }

    const pool = await getConnection();
    const existente = await pool.query(
      `SELECT foto_public_id AS "fotoPublicId"
       FROM public.vehiculo_gastos_recurrentes
       WHERE id = $1 AND vehiculo_id = $2`,
      [gastoRecurrenteId, vehiculoId]
    );
    if (existente.rows.length === 0) {
      return NextResponse.json({ error: "No se encontró el gasto de este vehículo." }, { status: 404 });
    }

    const fotoPublicId = existente.rows[0].fotoPublicId;
    if (typeof fotoPublicId === "string" && fotoPublicId) {
      await eliminarFotoGasto(fotoPublicId);
    }
    await pool.query(
      `UPDATE public.vehiculo_gastos_recurrentes
       SET foto_public_id = NULL, foto_version = NULL, foto_nombre = NULL
       WHERE id = $1 AND vehiculo_id = $2`,
      [gastoRecurrenteId, vehiculoId]
    );
    return NextResponse.json({ mensaje: "Foto del gasto eliminada." });
  } catch (error) {
    console.error("Error al eliminar la foto del gasto recurrente:", error);
    return NextResponse.json({ error: "No se pudo eliminar la foto del gasto." }, { status: 500 });
  }
}
