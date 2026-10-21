import { v2 as cloudinary } from "cloudinary";

const MAX_TAMANO_FACTURA = 5 * 1024 * 1024;

const FORMATOS_FACTURA = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type TipoFactura = keyof typeof FORMATOS_FACTURA;
export type FormatoFactura = (typeof FORMATOS_FACTURA)[TipoFactura];

export function validarFactura(
  tipo: string,
  bytes: Buffer
): tipo is TipoFactura {
  if (bytes.length === 0 || bytes.length > MAX_TAMANO_FACTURA) return false;

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
    throw new Error("El servicio de archivos no está configurado.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function subirFacturaMantenimiento(
  bytes: Buffer
): Promise<{ publicId: string; formato: FormatoFactura; version: number }> {
  configurarCloudinary();

  const resultado = await new Promise<{
    public_id: string;
    format: string;
    version: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "rent-a-car/facturas-mantenimiento",
        resource_type: "image",
        type: "authenticated",
        access_mode: "authenticated",
        allowed_formats: ["jpg", "png", "webp"],
        unique_filename: true,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
        } else if (!uploadResult) {
          reject(new Error("Cloudinary no devolvió el archivo subido."));
        } else {
          resolve(uploadResult);
        }
      }
    );
    stream.end(bytes);
  });

  if (
    !Object.values(FORMATOS_FACTURA).includes(
      resultado.format as FormatoFactura
    )
  ) {
    await eliminarFacturaMantenimiento(resultado.public_id);
    throw new Error("Cloudinary devolvió un formato de factura no permitido.");
  }

  return {
    publicId: resultado.public_id,
    formato: resultado.format as FormatoFactura,
    version: resultado.version,
  };
}

export function crearUrlPrivadaFactura(
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

export async function eliminarFacturaMantenimiento(
  publicId: string
): Promise<void> {
  configurarCloudinary();
  const resultado = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });

  if (resultado.result !== "ok" && resultado.result !== "not found") {
    throw new Error("No se pudo limpiar la factura subida a Cloudinary.");
  }
}
