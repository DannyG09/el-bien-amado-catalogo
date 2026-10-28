
export interface FotoCloudinary {
  url: string;
  publicId: string;
}

interface FirmaCloudinary {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export async function subirFotoCloudinary(
  archivo: File
): Promise<FotoCloudinary> {
  // Validar el formato de la imagen
  const formatosPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!formatosPermitidos.includes(archivo.type)) {
    throw new Error(
      "Solo se permiten imágenes JPG, PNG o WEBP."
    );
  }

  // Limitar el tamaño a 5 MB
  if (archivo.size > 5 * 1024 * 1024) {
    throw new Error(
      `La imagen "${archivo.name}" supera el límite de 5 MB.`
    );
  }

  // Solicitar una firma al servidor
  const respuestaFirma = await fetch(
    "/api/cloudinary-signature",
    {
      method: "POST",
    }
  );

  const firma = (await respuestaFirma.json()) as
    | FirmaCloudinary
    | { error: string };

  if (!respuestaFirma.ok || !("signature" in firma)) {
    throw new Error(
      "error" in firma
        ? firma.error
        : "No se pudo autorizar la subida."
    );
  }

  // Preparar la imagen para enviarla a Cloudinary
  const datos = new FormData();

  datos.append("file", archivo);
  datos.append("api_key", firma.apiKey);
  datos.append("timestamp", String(firma.timestamp));
  datos.append("folder", firma.folder);
  datos.append("signature", firma.signature);

  // Subir la imagen
  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`,
    {
      method: "POST",
      body: datos,
    }
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      resultado.error?.message ||
        "No se pudo subir la imagen a Cloudinary."
    );
  }

  return {
    url: resultado.secure_url,
    publicId: resultado.public_id,
  };
}


export async function subirMatriculaCloudinary(
  archivo: File,
  vehiculoId: number
): Promise<void> {
  const formatosPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!formatosPermitidos.includes(archivo.type)) {
    throw new Error(
      "Solo se permiten archivos JPG, PNG, WEBP o PDF."
    );
  }

  const MAX_SIZE = 5 * 1024 * 1024;

  if (archivo.size === 0 || archivo.size > MAX_SIZE) {
    throw new Error(
      "El archivo debe tener un tamaño máximo de 5 MB."
    );
  }

  if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
    throw new Error("El vehículo seleccionado no es válido.");
  }

  const formData = new FormData();

  formData.append("archivo", archivo);
  formData.append("vehiculoId", String(vehiculoId));

  const respuesta = await fetch("/api/matriculas/subir", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      resultado.error ?? "No se pudo guardar la matrícula."
    );
  }
}
