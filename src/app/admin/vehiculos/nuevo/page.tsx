
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  subirFotoCloudinary,
  type FotoCloudinary,
} from "@/app/lib/uploadCloudinary";

/*
  PALETA: negro, rojo #D4202C y blanco.
  LOGO: /public/logo.jpeg
*/

const inputClase =
  "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20";

const MAX_FOTOS = 8;
const MAX_TAMANO = 5 * 1024 * 1024;

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function Campo({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Seccion({
  numero,
  titulo,
}: {
  numero: number;
  titulo: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 md:col-span-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4202C] text-sm font-extrabold text-white">
        {numero}
      </span>

      <h2 className="text-lg font-extrabold text-gray-900">
        {titulo}
      </h2>

      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export default function NuevoVehiculoPage() {
  const router = useRouter();

  const [formulario, setFormulario] = useState({
    marca: "",
    modelo: "",
    anio: "",
    placa: "",
    color: "",
    tipoSeguro: "Full",
    precioDia: "",
    imagen: "",
    descripcion: "",
    disponible: true,
  });

  const [fotosSeleccionadas, setFotosSeleccionadas] =
    useState<File[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [error, setError] = useState("");
  const [imagenRota, setImagenRota] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (name === "imagen") {
      setImagenRota(false);
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSeleccionFotos = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const archivos = Array.from(e.target.files ?? []);

    if (archivos.length > MAX_FOTOS) {
      setError(`Puedes seleccionar un máximo de ${MAX_FOTOS} fotos.`);
      setFotosSeleccionadas([]);
      e.target.value = "";
      return;
    }

    const archivoGrande = archivos.find(
      (archivo) => archivo.size > MAX_TAMANO
    );

    if (archivoGrande) {
      setError(
        `La imagen "${archivoGrande.name}" supera el límite de 5 MB.`
      );
      setFotosSeleccionadas([]);
      e.target.value = "";
      return;
    }

    const formatoInvalido = archivos.find(
      (archivo) => !FORMATOS_PERMITIDOS.includes(archivo.type)
    );

    if (formatoInvalido) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      setFotosSeleccionadas([]);
      e.target.value = "";
      return;
    }

    setError("");
    setFotosSeleccionadas(archivos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fotosSeleccionadas.length > MAX_FOTOS) {
      setError(`Puedes seleccionar un máximo de ${MAX_FOTOS} fotos.`);
      return;
    }

    setGuardando(true);
    setSubiendoFotos(fotosSeleccionadas.length > 0);
    setError("");

    try {
      // 1. Subir las imágenes seleccionadas a Cloudinary.
      const fotosSubidas: FotoCloudinary[] = [];

      for (const archivo of fotosSeleccionadas) {
        const foto = await subirFotoCloudinary(archivo);
        fotosSubidas.push(foto);
      }

      // 2. La primera foto subida será la imagen principal.
      const imagenPrincipal =
        fotosSubidas[0]?.url ||
        formulario.imagen.trim() ||
        null;

      // 3. Registrar el vehículo en la base de datos.
      const respuesta = await fetch("/api/vehiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marca: formulario.marca.trim(),
          modelo: formulario.modelo.trim(),
          anio: Number(formulario.anio),
          placa: formulario.placa.trim().toUpperCase(),
          color: formulario.color.trim(),
          tipoSeguro: formulario.tipoSeguro,
          precioDia: Number(formulario.precioDia),
          imagen: imagenPrincipal,
          descripcion: formulario.descripcion.trim() || null,
          disponible: formulario.disponible,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo registrar el vehículo."
        );
      }

      // 4. Obtener el ID del vehículo recién creado.
      const vehiculoId = datos.id;

      if (fotosSubidas.length > 0) {
        if (
          vehiculoId === undefined ||
          vehiculoId === null ||
          !Number.isInteger(Number(vehiculoId))
        ) {
          throw new Error(
            "El vehículo se creó, pero la API no devolvió su ID. " +
              "Debemos revisar la respuesta de /api/vehiculos."
          );
        }

        // 5. Guardar las fotos relacionadas con ese vehículo.
        const respuestaFotos = await fetch("/api/vehiculo-fotos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehiculoId: Number(vehiculoId),
            fotos: fotosSubidas,
          }),
        });

        const datosFotos = await respuestaFotos.json();

        if (!respuestaFotos.ok) {
          throw new Error(
            "El vehículo se creó, pero no se pudieron guardar " +
              `sus fotografías: ${datosFotos.error || "error desconocido"}.`
          );
        }
      }

      alert("Vehículo registrado correctamente.");
      router.push("/admin/vehiculos");
      router.refresh();
    } catch (error) {
      console.error("Error registrando vehículo:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al registrar el vehículo."
      );
    } finally {
      setGuardando(false);
      setSubiendoFotos(false);
    }
  };

  const hayImagen =
    formulario.imagen.trim() !== "" && !imagenRota;

  return (
    <main className="min-h-screen bg-gray-100">
      {/* ENCABEZADO */}
      <header className="border-b-4 border-[#D4202C] bg-black">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-4">
            <img
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
              className="h-14 w-14 rounded-full ring-2 ring-[#D4202C]"
            />

            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-gray-400">
                ADMINISTRACIÓN
              </p>

              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                Nuevo vehículo
              </h1>
            </div>
          </div>

          <Link
            href="/admin/vehiculos"
            className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="mb-6 text-gray-600">
          Registra un nuevo vehículo en el catálogo y agrega sus fotografías.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-[#D4202C]"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white shadow-sm"
        >
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:p-8">
            {/* 1. DATOS */}
            <Seccion numero={1} titulo="Datos del vehículo" />

            <Campo label="Marca">
              <input
                type="text"
                name="marca"
                value={formulario.marca}
                onChange={handleChange}
                placeholder="Ej. Hyundai"
                required
                className={inputClase}
              />
            </Campo>

            <Campo label="Modelo">
              <input
                type="text"
                name="modelo"
                value={formulario.modelo}
                onChange={handleChange}
                placeholder="Ej. Tucson"
                required
                className={inputClase}
              />
            </Campo>

            <Campo label="Año">
              <input
                type="number"
                name="anio"
                value={formulario.anio}
                onChange={handleChange}
                placeholder="Ej. 2025"
                min="1900"
                max="2100"
                required
                className={inputClase}
              />
            </Campo>

            <Campo label="Placa">
              <input
                type="text"
                name="placa"
                value={formulario.placa}
                onChange={handleChange}
                placeholder="Ej. G123456"
                required
                className={`${inputClase} uppercase`}
              />
            </Campo>

            <Campo label="Color">
              <input
                type="text"
                name="color"
                value={formulario.color}
                onChange={handleChange}
                placeholder="Ej. Blanco"
                required
                className={inputClase}
              />
            </Campo>

            <Campo label="Tipo de seguro">
              <select
                name="tipoSeguro"
                value={formulario.tipoSeguro}
                onChange={handleChange}
                className={inputClase}
              >
                <option value="Full">Full</option>
                <option value="Ley">Ley</option>
              </select>
            </Campo>

            {/* 2. PRECIO Y ESTADO */}
            <div className="mt-2 md:col-span-2">
              <Seccion numero={2} titulo="Precio y estado" />
            </div>

            <Campo label="Precio por día (USD$)">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  USD$
                </span>

                <input
                  type="number"
                  name="precioDia"
                  value={formulario.precioDia}
                  onChange={handleChange}
                  placeholder="Ej. 80"
                  min="0"
                  step="0.01"
                  required
                  className={`${inputClase} pl-14`}
                />
              </div>
            </Campo>

            <Campo label="Disponibilidad">
              <label
                className={
                  formulario.disponible
                    ? "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 px-4 py-3"
                    : "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3"
                }
              >
                <input
                  type="checkbox"
                  name="disponible"
                  checked={formulario.disponible}
                  onChange={handleChange}
                  className="h-5 w-5 accent-[#D4202C]"
                />

                <span className="text-sm font-bold text-gray-700">
                  {formulario.disponible
                    ? "Disponible para renta"
                    : "No disponible por ahora"}
                </span>
              </label>
            </Campo>

            {/* 3. IMÁGENES */}
            <div className="mt-2 md:col-span-2">
              <Seccion numero={3} titulo="Fotografías y descripción" />
            </div>

            <Campo
              label="URL de imagen (opcional)"
              className="md:col-span-2"
            >
              <input
                type="url"
                name="imagen"
                value={formulario.imagen}
                onChange={handleChange}
                placeholder="https://..."
                className={inputClase}
              />

              <p className="mt-2 text-xs text-gray-500">
                Puedes usar una URL si no vas a subir fotografías desde tu computadora.
                Si seleccionas fotos, la primera reemplazará esta imagen principal.
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {hayImagen ? (
                  <img
                    src={formulario.imagen}
                    alt="Vista previa de la URL"
                    onError={() => setImagenRota(true)}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center text-gray-400">
                    <span className="text-3xl">🚘</span>
                    <span className="mt-1 text-xs">
                      {imagenRota
                        ? "No se pudo cargar la imagen, revisa la URL"
                        : "La vista previa de la URL aparecerá aquí"}
                    </span>
                  </div>
                )}
              </div>
            </Campo>

            <Campo
              label="Seleccionar fotos desde la computadora"
              className="md:col-span-2"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleSeleccionFotos}
                className={inputClase}
              />

              <p className="mt-2 text-xs text-gray-500">
                Máximo 8 imágenes, de hasta 5 MB cada una.
                Formatos permitidos: JPG, PNG y WEBP.
              </p>

              {fotosSeleccionadas.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-sm font-bold text-gray-700">
                    {fotosSeleccionadas.length} foto(s) seleccionada(s)
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {fotosSeleccionadas.map((foto, indice) => (
                      <div
                        key={`${foto.name}-${indice}`}
                        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                      >
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(foto)}
                            alt={`Vista previa ${indice + 1}`}
                            className="h-28 w-full object-cover"
                          />

                          {indice === 0 && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1 text-center text-xs font-bold text-white">
                              Principal
                            </span>
                          )}
                        </div>

                        <div className="p-2">
                          <p className="truncate text-xs font-semibold text-gray-700">
                            {foto.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {(foto.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFotosSeleccionadas([])}
                    className="mt-3 text-sm font-semibold text-[#D4202C] hover:underline"
                  >
                    Quitar todas las fotos
                  </button>
                </div>
              )}
            </Campo>

            {/* 4. DESCRIPCIÓN */}
            <Campo label="Descripción" className="md:col-span-2">
              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={handleChange}
                placeholder="Describe brevemente el vehículo..."
                rows={4}
                className={`${inputClase} resize-none`}
              />
            </Campo>
          </div>

          {/* BOTONES */}
          <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 px-6 py-5 sm:flex-row sm:justify-end md:px-8">
            <button
              type="button"
              onClick={() => router.push("/admin/vehiculos")}
              disabled={guardando}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#D4202C] px-8 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? subiendoFotos
                  ? "Subiendo fotos..."
                  : "Guardando..."
                : "Guardar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}