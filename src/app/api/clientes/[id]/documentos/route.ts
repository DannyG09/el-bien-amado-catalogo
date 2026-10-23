import { NextResponse } from "next/server";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import {
  eliminarDocumentoCliente,
  formatoArchivoCliente,
  TIPOS_DOCUMENTO_CLIENTE,
  subirDocumentoCliente,
  validarArchivoCliente,
} from "../../../../lib/documentos-clientes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: Params) {
  let archivoSubido: Awaited<
    ReturnType<typeof subirDocumentoCliente>
  > | null = null;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const clienteId = leerId((await params).id);
    if (clienteId === null) {
      return NextResponse.json(
        { error: "El identificador del cliente no es válido." },
        { status: 400 }
      );
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "El formulario de archivo no es válido." },
        { status: 400 }
      );
    }
    const archivo = formData.get("archivo");
    const tipo = formData.get("tipo");
    if (
      !(archivo instanceof File) ||
      typeof tipo !== "string" ||
      !TIPOS_DOCUMENTO_CLIENTE.includes(
        tipo as (typeof TIPOS_DOCUMENTO_CLIENTE)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Selecciona un tipo de documento y un archivo válido." },
        { status: 400 }
      );
    }
    const formato = formatoArchivoCliente(archivo.type);
    if (
      !formato ||
      (tipo === "foto_perfil" && archivo.type === "application/pdf") ||
      archivo.size > 8 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "Usa JPG, PNG, WEBP o PDF (la foto de perfil debe ser una imagen) y un máximo de 8 MB.",
        },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (!validarArchivoCliente(archivo.type, bytes)) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con un formato permitido." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    const cliente = await pool.query(
      "SELECT id FROM public.clientes WHERE id = $1",
      [clienteId]
    );
    if (cliente.rows.length === 0) {
      return NextResponse.json(
        { error: "El cliente no existe." },
        { status: 404 }
      );
    }
    archivoSubido = await subirDocumentoCliente(
      bytes,
      archivo.type
    );
    const nombreArchivo = archivo.name
      .replace(/[\\/\r\n\0]/g, "_")
      .slice(0, 255);
    const resultado = await pool.query(
      `INSERT INTO public.cliente_documentos (
         cliente_id, tipo, nombre_archivo, public_id, formato,
         resource_type, version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id, tipo, nombre_archivo AS "nombreArchivo", formato,
         creado_en AS "creadoEn"`,
      [
        clienteId,
        tipo,
        nombreArchivo || `documento.${formato}`,
        archivoSubido.publicId,
        archivoSubido.formato,
        archivoSubido.resourceType,
        archivoSubido.version,
      ]
    );
    return NextResponse.json(resultado.rows[0], { status: 201 });
  } catch (error) {
    if (archivoSubido) {
      try {
        await eliminarDocumentoCliente(
          archivoSubido.publicId,
          archivoSubido.resourceType
        );
      } catch (errorLimpieza) {
        console.error(
          "No se pudo eliminar el documento privado sin guardar:",
          errorLimpieza
        );
      }
    }
    console.error("Error al guardar documento de cliente:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el documento del cliente." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const clienteId = leerId((await params).id);
    const documentoId = leerId(
      new URL(request.url).searchParams.get("documentoId") ?? ""
    );
    if (clienteId === null || documentoId === null) {
      return NextResponse.json(
        { error: "El identificador del cliente o documento no es válido." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT public_id AS "publicId", resource_type AS "resourceType"
       FROM public.cliente_documentos
       WHERE id = $1 AND cliente_id = $2`,
      [documentoId, clienteId]
    );
    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El documento no existe." },
        { status: 404 }
      );
    }
    const documento = resultado.rows[0] as {
      publicId: string;
      resourceType: "image" | "raw";
    };
    if (!["image", "raw"].includes(documento.resourceType)) {
      return NextResponse.json(
        { error: "El tipo del documento almacenado no es válido." },
        { status: 500 }
      );
    }
    await eliminarDocumentoCliente(
      documento.publicId,
      documento.resourceType
    );
    await pool.query(
      "DELETE FROM public.cliente_documentos WHERE id = $1 AND cliente_id = $2",
      [documentoId, clienteId]
    );
    return NextResponse.json({ mensaje: "Documento eliminado." });
  } catch (error) {
    console.error("Error al eliminar documento de cliente:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el documento." },
      { status: 500 }
    );
  }
}
