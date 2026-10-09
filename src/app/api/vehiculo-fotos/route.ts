
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FotoRecibida {
  url: string;
  publicId: string;
}

interface FotoGuardada {
  id: number;
  url: string;
  publicId: string;
}

// GET /api/vehiculo-fotos?vehiculoId=1
// Devuelve las fotografías de un vehículo.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehiculoId = Number(searchParams.get("vehiculoId"));

    if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El ID del vehículo no es válido." },
        { status: 400 }
      );
    }

    const db = await getConnection();

    const resultado = await db.query(
      `SELECT
         id,
         vehiculo_id AS "vehiculoId",
         url,
         public_id AS "publicId",
         orden
       FROM public.vehiculo_fotos
       WHERE vehiculo_id = $1
       ORDER BY orden ASC, id ASC`,
      [vehiculoId]
    );

    return NextResponse.json(resultado.rows);
  } catch (error) {
    console.error("Error consultando fotografías:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las fotografías." },
      { status: 500 }
    );
  }
}

// POST /api/vehiculo-fotos
// Guarda las fotografías de un vehículo.
export async function POST(request: Request) {
  try {
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const vehiculoId = Number(body?.vehiculoId);
    const fotos = body?.fotos;

    if (
      !Number.isSafeInteger(vehiculoId) ||
      vehiculoId <= 0 ||
      !Array.isArray(fotos) ||
      fotos.length < 1 ||
      fotos.length > 8
    ) {
      return NextResponse.json(
        { error: "Los datos de las fotografías no son válidos." },
        { status: 400 }
      );
    }

    const fotosValidas: FotoRecibida[] = [];

    for (const foto of fotos) {
      if (
        !foto ||
        typeof foto.url !== "string" ||
        !foto.url.startsWith("https://") ||
        typeof foto.publicId !== "string" ||
        !foto.publicId.startsWith("rent-a-car/vehiculos/") ||
        foto.publicId.length > 500
      ) {
        return NextResponse.json(
          { error: "Una de las fotografías no es válida." },
          { status: 400 }
        );
      }

      fotosValidas.push({
        url: foto.url,
        publicId: foto.publicId,
      });
    }

    const publicIds = fotosValidas.map((foto) => foto.publicId);

    if (new Set(publicIds).size !== publicIds.length) {
      return NextResponse.json(
        { error: "Hay fotografías duplicadas en la solicitud." },
        { status: 400 }
      );
    }

    const db = await getConnection();

    const vehiculo = await db.query(
      "SELECT id FROM public.vehiculos WHERE id = $1",
      [vehiculoId]
    );

    if (vehiculo.rows.length === 0) {
      return NextResponse.json(
        { error: "El vehículo no existe." },
        { status: 404 }
      );
    }

    // Contar las fotos existentes para evitar superar el límite de 8.
    const conteo = await db.query(
      `SELECT COUNT(*)::int AS cantidad
       FROM public.vehiculo_fotos
       WHERE vehiculo_id = $1`,
      [vehiculoId]
    );

    const existentes = Number(conteo.rows[0]?.cantidad ?? 0);

    if (existentes + fotosValidas.length > 8) {
      return NextResponse.json(
        {
          error:
            "Este vehículo no puede tener más de 8 fotografías. Elimina alguna antes de agregar otras.",
        },
        { status: 400 }
      );
    }

    // Obtener el siguiente número de orden.
    const resultadoOrden = await db.query(
      `SELECT COALESCE(MAX(orden), -1)::int + 1 AS siguiente
       FROM public.vehiculo_fotos
       WHERE vehiculo_id = $1`,
      [vehiculoId]
    );

    let orden = Number(resultadoOrden.rows[0]?.siguiente ?? 0);
    let guardadas = 0;

    for (const foto of fotosValidas) {
      const insertada = await db.query(
        `INSERT INTO public.vehiculo_fotos
          (vehiculo_id, url, public_id, orden)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (public_id) DO NOTHING
         RETURNING id`,
        [vehiculoId, foto.url, foto.publicId, orden]
      );

      if (insertada.rows.length > 0) {
        guardadas++;
        orden++;
      }
    }

    return NextResponse.json(
      {
        mensaje: "Fotografías procesadas correctamente.",
        cantidad: guardadas,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error guardando fotografías:", error);

    return NextResponse.json(
      { error: "No se pudieron guardar las fotografías." },
      { status: 500 }
    );
  }
}

// DELETE /api/vehiculo-fotos
// Elimina fotografías de Cloudinary y de PostgreSQL.
export async function DELETE(request: Request) {
  try {
    // 1. Verificar la sesión administrativa.
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    // 2. Validar los datos recibidos.
    const body = await request.json();
    const vehiculoId = Number(body?.vehiculoId);
    const fotoIds: unknown = body?.fotoIds;

    if (
      !Number.isSafeInteger(vehiculoId) ||
      vehiculoId <= 0 ||
      !Array.isArray(fotoIds) ||
      fotoIds.length === 0 ||
      fotoIds.length > 8 ||
      !fotoIds.every(
        (id: unknown) =>
          typeof id === "number" &&
          Number.isSafeInteger(id) &&
          id > 0
      )
    ) {
      return NextResponse.json(
        { error: "Los datos de las fotografías no son válidos." },
        { status: 400 }
      );
    }

    const idsUnicos = [...new Set(fotoIds as number[])];

    if (idsUnicos.length !== fotoIds.length) {
      return NextResponse.json(
        { error: "Hay fotografías repetidas en la solicitud." },
        { status: 400 }
      );
    }

    // 3. Configurar Cloudinary usando credenciales del servidor.
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Falta configurar Cloudinary en el servidor.");

      return NextResponse.json(
        { error: "El servicio de imágenes no está configurado." },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // 4. Consultar fotos que pertenezcan al vehículo indicado.
    const db = await getConnection();

    const consulta = await db.query(
      `SELECT
         id,
         url,
         public_id AS "publicId"
       FROM public.vehiculo_fotos
       WHERE vehiculo_id = $1
         AND id = ANY($2::int[])
       ORDER BY orden ASC, id ASC`,
      [vehiculoId, idsUnicos]
    );

    const fotos = consulta.rows as FotoGuardada[];

    if (fotos.length !== idsUnicos.length) {
      return NextResponse.json(
        {
          error:
            "Una o más fotografías no existen o no pertenecen a este vehículo.",
        },
        { status: 400 }
      );
    }

    // 5. Validar los identificadores antes de eliminarlos.
    if (
      fotos.some(
        (foto) =>
          typeof foto.publicId !== "string" ||
          !foto.publicId.startsWith("rent-a-car/vehiculos/") ||
          foto.publicId.length > 500
      )
    ) {
      return NextResponse.json(
        { error: "Se encontró una fotografía con un identificador no válido." },
        { status: 400 }
      );
    }

    // 6. Eliminar las imágenes de Cloudinary.
    // "not found" también se acepta si la imagen ya no existe allí.
    for (const foto of fotos) {
      const resultado = await cloudinary.uploader.destroy(foto.publicId, {
        resource_type: "image",
        invalidate: true,
      });

      if (
        resultado.result !== "ok" &&
        resultado.result !== "not found"
      ) {
        throw new Error(
          `Cloudinary no pudo eliminar la fotografía con ID ${foto.id}.`
        );
      }
    }

    // 7. Eliminar los registros de PostgreSQL.
    await db.query(
      `DELETE FROM public.vehiculo_fotos
       WHERE vehiculo_id = $1
         AND id = ANY($2::int[])`,
      [vehiculoId, idsUnicos]
    );

    // 8. Si la imagen principal fue eliminada, sustituirla
    // por una foto restante. Si no quedan fotos, usar cadena vacía.
    const urlsEliminadas = fotos.map((foto) => foto.url);

    await db.query(
      `UPDATE public.vehiculos
       SET imagen = COALESCE(
         (
           SELECT url
           FROM public.vehiculo_fotos
           WHERE vehiculo_id = $1
           ORDER BY orden ASC, id ASC
           LIMIT 1
         ),
         ''
       )
       WHERE id = $1
         AND imagen = ANY($2::text[])`,
      [vehiculoId, urlsEliminadas]
    );

    return NextResponse.json({
      mensaje: "Fotografías eliminadas correctamente.",
      cantidad: fotos.length,
    });
  } catch (error) {
    console.error("Error eliminando fotografías:", error);

    return NextResponse.json(
      { error: "No se pudieron eliminar las fotografías." },
      { status: 500 }
    );
  }
}