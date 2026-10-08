"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/*
  PALETA: negro, rojo #D4202C y blanco.
  LOGO: /public/logo.jpeg
*/

const inputClase =
  "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20";

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
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Seccion({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 md:col-span-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4202C] text-sm font-extrabold text-white">
        {numero}
      </span>
      <h2 className="text-lg font-extrabold text-gray-900">{titulo}</h2>
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

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [imagenRota, setImagenRota] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name === "imagen") setImagenRota(false);

    setFormulario({
      ...formulario,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca: formulario.marca,
          modelo: formulario.modelo,
          anio: Number(formulario.anio),
          placa: formulario.placa,
          color: formulario.color,
          tipoSeguro: formulario.tipoSeguro,
          precioDia: Number(formulario.precioDia),
          imagen: formulario.imagen.trim() || null,
          descripcion: formulario.descripcion.trim() || null,
          disponible: formulario.disponible,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo registrar el vehículo");
      }

      alert("Vehículo registrado correctamente");
      router.push("/admin/vehiculos");
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al registrar el vehículo"
      );
    } finally {
      setGuardando(false);
    }
  };

  const hayImagen = formulario.imagen.trim() !== "" && !imagenRota;

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
          Registra un nuevo vehículo en el catálogo.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-[#D4202C]">
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

            {/* 2. PRECIO */}
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
                  step="1.00"
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

            {/* 3. IMAGEN Y DESCRIPCIÓN */}
            <div className="mt-2 md:col-span-2">
              <Seccion numero={3} titulo="Imagen y descripción" />
            </div>

            <Campo label="URL de la imagen" className="md:col-span-2">
              <input
                type="url"
                name="imagen"
                value={formulario.imagen}
                onChange={handleChange}
                placeholder="https://..."
                className={inputClase}
              />

              <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {hayImagen ? (
                  <img
                    src={formulario.imagen}
                    alt="Vista previa"
                    onError={() => setImagenRota(true)}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center text-gray-400">
                    <span className="text-3xl">🚘</span>
                    <span className="mt-1 text-xs">
                      {imagenRota
                        ? "No se pudo cargar la imagen, revisa la URL"
                        : "La vista previa aparecerá aquí"}
                    </span>
                  </div>
                )}
              </div>
            </Campo>

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
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#D4202C] px-8 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}