import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { validarImagenFirma } from "../../../../lib/contratos";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: Params) {
  let client: PoolClient | null = null;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json({ error: "El contrato indicado no es válido." }, { status: 400 });
    }
    const formulario = await request.formData();
    const archivo = formulario.get("firma");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json({ error: "Selecciona la imagen de la firma del cliente." }, { status: 400 });
    }
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (!validarImagenFirma(archivo.type, bytes)) {
      return NextResponse.json(
        { error: "La firma debe ser una imagen PNG o JPG de hasta 8 MB." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const contrato = await client.query(
      `SELECT estado, vehiculo_id AS "vehiculoId", firmado_en AS "firmadoEn"
       FROM public.contratos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (contrato.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    if (contrato.rows[0].estado !== "pendiente_firma" || contrato.rows[0].firmadoEn) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Este contrato ya fue firmado o no está pendiente de firma." },
        { status: 409 }
      );
    }
    const vehiculoId = Number(contrato.rows[0].vehiculoId);
    const vehiculo = await client.query(
      "SELECT estado FROM public.vehiculos WHERE id = $1 FOR UPDATE",
      [vehiculoId]
    );
    if (vehiculo.rows[0]?.estado !== "reservado") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El vehículo ya no está reservado para este contrato." },
        { status: 409 }
      );
    }
    await client.query(
      `UPDATE public.contratos SET
         firma_cliente = $2, firma_mime = $3,
         firma_nombre = $4, firmado_en = NOW(), estado = 'activo',
         actualizado_en = NOW()
       WHERE id = $1`,
      [
        id,
        bytes,
        archivo.type,
        archivo.name.replace(/[\\/\r\n\0]/g, "_").slice(0, 255),
      ]
    );
    await client.query(
      `UPDATE public.vehiculos
       SET estado = 'rentado', disponible = FALSE
       WHERE id = $1 AND estado = 'reservado'`,
      [vehiculoId]
    );
    await client.query("COMMIT");
    return NextResponse.json({ mensaje: "Firma registrada y contrato activado." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al registrar firma del contrato:", error);
    return NextResponse.json({ error: "No se pudo registrar la firma." }, { status: 500 });
  } finally {
    client?.release();
  }
}
