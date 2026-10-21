import { NextResponse } from "next/server";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { crearUrlPrivadaFactura } from "../../../../lib/facturas-mantenimiento";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const TIPOS_FACTURA: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
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
    const mantenimientoId = Number(id);
    if (!Number.isSafeInteger(mantenimientoId) || mantenimientoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del mantenimiento no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         factura_public_id AS "publicId",
         factura_formato AS formato,
         factura_version AS version
       FROM public.mantenimientos
       WHERE id = $1`,
      [mantenimientoId]
    );

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El mantenimiento no existe." },
        { status: 404 }
      );
    }

    const factura = resultado.rows[0] as {
      publicId: string | null;
      formato: string | null;
      version: string | number | null;
    };
    if (
      !factura.publicId ||
      !factura.formato ||
      !TIPOS_FACTURA[factura.formato] ||
      factura.version == null
    ) {
      return NextResponse.json(
        { error: "Este mantenimiento no tiene una factura disponible." },
        { status: 404 }
      );
    }

    const respuestaCloudinary = await fetch(
      crearUrlPrivadaFactura(factura.publicId, Number(factura.version)),
      { cache: "no-store" }
    );
    if (!respuestaCloudinary.ok) {
      console.error(
        "Cloudinary no pudo entregar la factura:",
        respuestaCloudinary.status
      );
      return NextResponse.json(
        { error: "No se pudo abrir la factura almacenada." },
        { status: 502 }
      );
    }

    const bytes = await respuestaCloudinary.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": TIPOS_FACTURA[factura.formato],
        "Content-Disposition": `inline; filename="factura-mantenimiento-${mantenimientoId}.${factura.formato}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al servir factura de mantenimiento:", error);
    return NextResponse.json(
      { error: "No se pudo abrir la factura." },
      { status: 500 }
    );
  }
}
