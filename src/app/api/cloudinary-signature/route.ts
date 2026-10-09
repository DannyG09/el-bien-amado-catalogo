
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { isAdminAuthenticated } from "../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Verificar la sesión administrativa
    const authenticated = await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    // 2. Obtener las credenciales exclusivamente del servidor
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

    // 3. Definir los parámetros permitidos para la subida
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "rent-a-car/vehiculos";

    // 4. Firmar los parámetros en el servidor
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret
    );

    // 5. Entregar únicamente los datos necesarios para subir
    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    console.error("Error generando firma de Cloudinary:", error);

    return NextResponse.json(
      { error: "No se pudo autorizar la subida de imágenes." },
      { status: 500 }
    );
  }
}