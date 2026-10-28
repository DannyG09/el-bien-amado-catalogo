import { v2 as cloudinary } from "cloudinary";

const FORMATOS_POR_TIPO = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const MAX_TAMANO_FOTO_GASTO = 5 * 1024 * 1024;
export type TipoFotoGasto = keyof typeof FORMATOS_POR_TIPO;

export type FotoGastoSubida = {
  publicId: string;
  version: number;
};

export function validarFotoGasto(tipo: string, bytes: Buffer): tipo is TipoFotoGasto {
  if (bytes.length === 0 || bytes.length > MAX_TAMANO_FOTO_GASTO) return false;
  if (tipo === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (tipo === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  return (
    tipo === "image/webp" &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

function configurarCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("El servicio de imágenes no está configurado.");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function subirFotoGasto(bytes: Buffer): Promise<FotoGastoSubida> {
  configurarCloudinary();
  const resultado = await new Promise<{
    public_id: string;
    version: number;
    format: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "rent-a-car/gastos-recurrentes",
        resource_type: "image",
        type: "authenticated",
        access_mode: "authenticated",
        allowed_formats: Object.values(FORMATOS_POR_TIPO),
        unique_filename: true,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else if (!uploadResult) reject(new Error("Cloudinary no devolvió la foto subida."));
        else resolve(uploadResult);
      }
    );
    stream.end(bytes);
  });

  if (!Object.values(FORMATOS_POR_TIPO).includes(
    resultado.format as (typeof FORMATOS_POR_TIPO)[TipoFotoGasto]
  )) {
    await eliminarFotoGasto(resultado.public_id);
    throw new Error("Cloudinary devolvió un formato de imagen no permitido.");
  }
  return { publicId: resultado.public_id, version: resultado.version };
}

export function crearUrlPrivadaFotoGasto(publicId: string, version: number) {
  configurarCloudinary();
  return cloudinary.url(publicId, {
    secure: true,
    type: "authenticated",
    sign_url: true,
    resource_type: "image",
    version,
  });
}

export async function eliminarFotoGasto(publicId: string) {
  configurarCloudinary();
  const resultado = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
  if (resultado.result !== "ok" && resultado.result !== "not found") {
    throw new Error("No se pudo eliminar la foto del gasto en Cloudinary.");
  }
}
