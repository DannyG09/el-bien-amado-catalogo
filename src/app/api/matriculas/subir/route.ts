
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;

const FORMATOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function formatoImagenValido(
  buffer: Buffer,
  mime: string
): boolean {
  if (mime === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([
          137, 80, 78, 71, 13, 10, 26, 10,
        ])
      )
    );
  }

  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  if (mime === "application/pdf") {
  return (
    buffer.length >= 5 &&
    buffer.toString("ascii", 0, 5) === "%PDF-"
  );
}

  return false;
}

function configurarCloudinary() {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const apiKey =
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Las credenciales de Cloudinary no están configuradas."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

// POST /api/matriculas/subir
export async function POST(request: Request) {
  try {
    // 1. Comprobar sesión administrativa.
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    // 2. Leer formulario.
    const formData = await request.formData();

    const archivo = formData.get("archivo");
    const idTexto = formData.get("vehiculoId");

    const vehiculoId =
      typeof idTexto === "string" && idTexto.trim()
        ? Number(idTexto)
        : NaN;

    if (
      !Number.isSafeInteger(vehiculoId) ||
      vehiculoId <= 0
    ) {
      return NextResponse.json(
        { error: "Vehículo no válido." },
        { status: 400 }
      );
    }

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona una imagen." },
        { status: 400 }
      );
    }

    if (
      !FORMATOS.includes(archivo.type) ||
      archivo.size === 0 ||
      archivo.size > MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Solo JPG, PNG o WEBP de hasta 5 MB.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(
      await archivo.arrayBuffer()
    );

    if (!formatoImagenValido(buffer, archivo.type)) {
      return NextResponse.json(
        { error: "El archivo no es una imagen válida." },
        { status: 400 }
      );
    }

    // Identificar si la matrícula es imagen o PDF.
    const tipoArchivo =
    archivo.type === "application/pdf"
    ? "pdf"
    : "imagen";

    

    // 3. Configurar servicios.
    const cloud = configurarCloudinary();
    const pool = await getConnection();

    // 4. Comprobar existencia del vehículo.
    const vehiculo = await pool.query(
      `
      SELECT id
      FROM public.vehiculos
      WHERE id = $1
      `,
      [vehiculoId]
    );

    if (vehiculo.rowCount === 0) {
      return NextResponse.json(
        { error: "El vehículo no existe." },
        { status: 404 }
      );
    }

    // 5. Subir nueva imagen autenticada.
    const nuevoPublicId =
      `matricula_${vehiculoId}_${randomUUID()}`;

    const subida = await new Promise<{
      public_id: string;
      secure_url: string;
    }>((resolve, reject) => {
      const stream = cloud.uploader.upload_stream(
        {
          folder: "rent-a-car/matriculas",
          public_id: nuevoPublicId,
          type: "authenticated",
          resource_type: "image",
           format: tipoArchivo === "pdf" ? "pdf" : undefined,
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error ??
                new Error(
                  "No se pudo subir la imagen."
                )
            );
            return;
          }

          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        }
      );

      stream.end(buffer);
    });

    // 6. Iniciar transacción para reemplazo seguro.
    const cliente = await pool.connect();

    let imagenAnterior: string | null = null;
    let guardado = false;
    let transaccionIniciada = false;

    try {
      await cliente.query("BEGIN");
      transaccionIniciada = true;

      // Bloquear el vehículo para serializar
      // modificaciones de su matrícula.
      const bloqueo = await cliente.query(
        `
        SELECT id
        FROM public.vehiculos
        WHERE id = $1
        FOR UPDATE
        `,
        [vehiculoId]
      );

      if (bloqueo.rowCount === 0) {
        throw new Error(
          "El vehículo ya no existe."
        );
      }

      // Leer la imagen anterior bajo el bloqueo.
      const existente = await cliente.query(
        `
        SELECT imagen_public_id
        FROM public.matriculas
        WHERE vehiculo_id = $1
        `,
        [vehiculoId]
      );

      imagenAnterior =
        existente.rows[0]?.imagen_public_id ?? null;

      // Insertar o actualizar el documento.
      await cliente.query(
        `
        INSERT INTO public.matriculas (
          vehiculo_id,
          imagen_url,
          imagen_public_id,
          tipo_archivo
        )
        VALUES ($1, $2, $3)

        ON CONFLICT (vehiculo_id)
        DO UPDATE SET
          imagen_url = EXCLUDED.imagen_url,
          imagen_public_id = EXCLUDED.imagen_public_id,
          fecha_actualizacion = CURRENT_TIMESTAMP
        `,
        [
          vehiculoId,
          subida.secure_url,
          subida.public_id,
        ]
      );

      await cliente.query("COMMIT");
      transaccionIniciada = false;
      guardado = true;
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await cliente.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al revertir la transacción:",
            rollbackError
          );
        }
      }

      throw error;
    } finally {
      cliente.release();

      // Si la transacción no se confirmó,
      // intentar eliminar la imagen nueva.
      if (!guardado) {
        try {
          await cloud.uploader.destroy(
            subida.public_id,
            {
              type: "authenticated",
              resource_type: "image",
            }
          );
        } catch (limpiezaError) {
          console.error(
            "No se pudo limpiar la nueva imagen:",
            limpiezaError
          );
        }
      }
    }

    // 7. Eliminar la imagen anterior solamente
    // después de confirmar el cambio en Neon.
    if (
      imagenAnterior &&
      imagenAnterior !== subida.public_id
    ) {
      try {
        const eliminacion =
          await cloud.uploader.destroy(
            imagenAnterior,
            {
              type: "authenticated",
              resource_type: "image",
              invalidate: true,
            }
          );

        if (
          eliminacion.result !== "ok" &&
          eliminacion.result !== "not found"
        ) {
          console.error(
            "Cloudinary no confirmó la eliminación:",
            eliminacion.result
          );
        }
      } catch (error) {
        // El documento nuevo ya está guardado.
        // No fallar la operación por una limpieza.
        console.error(
          "No se pudo eliminar la matrícula anterior:",
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Matrícula guardada correctamente.",
      vehiculoId,
    });
  } catch (error) {
    console.error(
      "Error al guardar matrícula:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo guardar la matrícula. Inténtalo nuevamente.",
      },
      { status: 500 }
    );
  }
}
