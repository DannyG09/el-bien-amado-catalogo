import { NextResponse } from "next/server";
import { getConnection } from "../../../../../lib/db";
import { isAdminAuthenticated } from "../../../../../lib/auth";
import { crearUrlPrivadaDocumento } from "../../../../../lib/documentos-clientes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; documentoId: string }>;
};

const TIPOS_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const { id, documentoId } = await params;
    const clienteId = Number(id);
    const idDocumento = Number(documentoId);
    if (
      !Number.isSafeInteger(clienteId) ||
      clienteId <= 0 ||
      !Number.isSafeInteger(idDocumento) ||
      idDocumento <= 0
    ) {
      return NextResponse.json(
        { error: "El identificador del cliente o documento no es válido." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         nombre_archivo AS "nombreArchivo",
         public_id AS "publicId",
         formato,
         resource_type AS "resourceType",
         version
       FROM public.cliente_documentos
       WHERE id = $1 AND cliente_id = $2`,
      [idDocumento, clienteId]
    );
    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El documento no existe." },
        { status: 404 }
      );
    }
    const archivo = resultado.rows[0] as {
      nombreArchivo: string;
      publicId: string;
      formato: string;
      resourceType: "image" | "raw";
      version: number | string;
    };
    const mimeType = TIPOS_MIME[archivo.formato];
    if (
      !mimeType ||
      !["image", "raw"].includes(archivo.resourceType)
    ) {
      return NextResponse.json(
        { error: "El formato del documento almacenado no es válido." },
        { status: 500 }
      );
    }
    const respuesta = await fetch(
      crearUrlPrivadaDocumento(
        archivo.publicId,
        archivo.formato,
        Number(archivo.version),
        archivo.resourceType
      ),
      { cache: "no-store" }
    );
    if (!respuesta.ok) {
      console.error(
        "Cloudinary no pudo entregar documento de cliente:",
        respuesta.status
      );
      return NextResponse.json(
        { error: "No se pudo abrir el documento almacenado." },
        { status: 502 }
      );
    }
    const nombreSeguro = archivo.nombreArchivo.replace(/["\r\n]/g, "_");
    return new NextResponse(await respuesta.arrayBuffer(), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${nombreSeguro}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al abrir documento de cliente:", error);
    return NextResponse.json(
      { error: "No se pudo abrir el documento del cliente." },
      { status: 500 }
    );
  }
}
