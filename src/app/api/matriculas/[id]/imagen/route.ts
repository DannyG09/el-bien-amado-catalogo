
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = {
  params: Promise<{ id: string }>;
};

const MAX_DOCUMENTO = 10 * 1024 * 1024;

function detectarTipo(buffer: Buffer): string | null {
  // PDF
  if (
    buffer.length >= 5 &&
    buffer.toString("ascii", 0, 5) === "%PDF-"
  ) {
    return "application/pdf";
  }

  // JPG / JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10,
      ])
    )
  ) {
    return "image/png";
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: Contexto
) {
  try {
    // 1. Comprobar sesión administrativa.
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    // 2. Validar el vehículo.
    const { id } = await params;
    const vehiculoId = Number(id);

    if (
      !Number.isSafeInteger(vehiculoId) ||
      vehiculoId <= 0
    ) {
      return NextResponse.json(
        { error: "Vehículo no válido." },
        { status: 400 }
      );
    }

    // 3. Consultar PostgreSQL.
    const pool = await getConnection();

    const resultado = await pool.query(
      `
      SELECT
        imagen_public_id,
        tipo_archivo
      FROM public.matriculas
      WHERE vehiculo_id = $1
      `,
      [vehiculoId]
    );

    if (resultado.rowCount === 0) {
      return NextResponse.json(
        { error: "Este vehículo no tiene matrícula." },
        { status: 404 }
      );
    }

    const publicId = String(
      resultado.rows[0].imagen_public_id
    );

    const tipoArchivo =
      resultado.rows[0].tipo_archivo === "pdf"
        ? "pdf"
        : "imagen";

    // 4. Configurar Cloudinary.
    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    const apiKey =
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

    const apiSecret =
      process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary no está configurado."
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // 5. Generar URL firmada.
    const urlFirmada = cloudinary.url(publicId, {
      resource_type: "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      ...(tipoArchivo === "pdf"
        ? { format: "pdf" }
        : {}),
    });

    // 6. Descargar desde Cloudinary.
    const respuesta = await fetch(urlFirmada, {
      cache: "no-store",
    });

    if (!respuesta.ok) {
      const detalle = respuesta.headers.get(
        "x-cld-error"
      );

      console.error("Error Cloudinary:", {
        status: respuesta.status,
        detalle,
      });

      throw new Error(
        `Cloudinary respondió ${respuesta.status}`
      );
    }

    const longitud = Number(
      respuesta.headers.get("content-length")
    );

    if (
      Number.isFinite(longitud) &&
      longitud > MAX_DOCUMENTO
    ) {
      return NextResponse.json(
        { error: "El documento supera el límite permitido." },
        { status: 413 }
      );
    }

    // 7. Detectar el formato real.
    const contenido = Buffer.from(
      await respuesta.arrayBuffer()
    );

    if (contenido.length > MAX_DOCUMENTO) {
      return NextResponse.json(
        { error: "El documento supera el límite permitido." },
        { status: 413 }
      );
    }

    const tipoDetectado = detectarTipo(contenido);

    console.log("Diagnóstico de matrícula:", {
      vehiculoId,
      tipoArchivo,
      tipoRespuesta:
        respuesta.headers.get("content-type"),
      tipoDetectado,
    });

    const tipoEsperado =
      tipoArchivo === "pdf"
        ? "application/pdf"
        : null;

    const imagenValida = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(tipoDetectado ?? "");

    const documentoValido =
      tipoArchivo === "pdf"
        ? tipoDetectado === tipoEsperado
        : imagenValida;

    if (!documentoValido || !tipoDetectado) {
      throw new Error(
        "El contenido recibido no corresponde al documento."
      );
    }

    // 8. Devolver documento al administrador.
    const extension =
      tipoDetectado === "application/pdf"
        ? "pdf"
        : tipoDetectado === "image/jpeg"
          ? "jpg"
          : tipoDetectado === "image/png"
            ? "png"
            : "webp";

    return new NextResponse(contenido, {
      status: 200,
      headers: {
        "Content-Type": tipoDetectado,
        "Content-Disposition":
          `inline; filename="matricula-${vehiculoId}.${extension}"`,
        "Cache-Control":
          "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (error) {
    console.error(
      "Error al visualizar matrícula:",
      error
    );

    return NextResponse.json(
      {
        error: "No se pudo visualizar la matrícula.",
      },
      { status: 500 }
    );
  }
}
