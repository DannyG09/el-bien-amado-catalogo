import { v2 as cloudinary } from "cloudinary";

const FORMATOS_POR_TIPO = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const MAX_TAMANO_FOTO_MULTA_DANO = 5 * 1024 * 1024;
export const MAX_FOTOS_MULTA_DANO = 6;

export type TipoFotoMultaDano = keyof typeof FORMATOS_POR_TIPO;
export type FormatoFotoMultaDano =
  (typeof FORMATOS_POR_TIPO)[TipoFotoMultaDano];

export type FotoMultaDanoSubida = {
  publicId: string;
  formato: FormatoFotoMultaDano;
  version: number;
};

export function validarFotoMultaDano(
  tipo: string,
  bytes: Buffer
): tipo is TipoFotoMultaDano {
  if (bytes.length === 0 || bytes.length > MAX_TAMANO_FOTO_MULTA_DANO) {
    return false;
  }
  if (tipo === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (tipo === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (tipo === "image/webp") {
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
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

export async function subirFotoMultaDano(
  bytes: Buffer
): Promise<FotoMultaDanoSubida> {
  configurarCloudinary();

  const resultado = await new Promise<{
    public_id: string;
    format: string;
    version: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "rent-a-car/multas-danos",
        resource_type: "image",
        type: "authenticated",
        access_mode: "authenticated",
        allowed_formats: Object.values(FORMATOS_POR_TIPO),
        unique_filename: true,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
        } else if (!uploadResult) {
          reject(new Error("Cloudinary no devolvió la foto subida."));
        } else {
          resolve(uploadResult);
        }
      }
    );
    stream.end(bytes);
  });

  if (
    !Object.values(FORMATOS_POR_TIPO).includes(
      resultado.format as FormatoFotoMultaDano
    )
  ) {
    await eliminarFotoMultaDano(resultado.public_id);
    throw new Error("Cloudinary devolvió un formato de imagen no permitido.");
  }

  return {
    publicId: resultado.public_id,
    formato: resultado.format as FormatoFotoMultaDano,
    version: resultado.version,
  };
}

export function crearUrlPrivadaFotoMultaDano(
  publicId: string,
  version: number
): string {
  configurarCloudinary();
  return cloudinary.url(publicId, {
    secure: true,
    type: "authenticated",
    sign_url: true,
    resource_type: "image",
    version,
  });
}

export async function eliminarFotoMultaDano(
  publicId: string
): Promise<void> {
  configurarCloudinary();
  const resultado = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });

  if (resultado.result !== "ok" && resultado.result !== "not found") {
    throw new Error("No se pudo limpiar la foto subida a Cloudinary.");
  }
}
