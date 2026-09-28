"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setFormulario({
      ...formulario,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/vehiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marca: formulario.marca,
          modelo: formulario.modelo,
          anio: Number(formulario.anio),
          placa: formulario.placa,
          color: formulario.color,
          tipoSeguro: formulario.tipoSeguro,
          precioDia: Number(formulario.precioDia),
          imagen: formulario.imagen,
          descripcion: formulario.descripcion,
          disponible: formulario.disponible,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo registrar el vehículo"
        );
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

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        {/* ENCABEZADO */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Nuevo vehículo
          </h1>

          <p className="mt-2 text-gray-600">
            Registra un nuevo vehículo en el catálogo.
          </p>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* MARCA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Marca
              </label>

              <input
                type="text"
                name="marca"
                value={formulario.marca}
                onChange={handleChange}
                placeholder="Ej. Hyundai"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* MODELO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Modelo
              </label>

              <input
                type="text"
                name="modelo"
                value={formulario.modelo}
                onChange={handleChange}
                placeholder="Ej. Tucson"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* AÑO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Año
              </label>

              <input
                type="number"
                name="anio"
                value={formulario.anio}
                onChange={handleChange}
                placeholder="Ej. 2025"
                min="1900"
                max="2100"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* PLACA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Placa
              </label>

              <input
                type="text"
                name="placa"
                value={formulario.placa}
                onChange={handleChange}
                placeholder="Ej. G123456"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-gray-900"
              />
            </div>

            {/* COLOR */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Color
              </label>

              <input
                type="text"
                name="color"
                value={formulario.color}
                onChange={handleChange}
                placeholder="Ej. Blanco"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* SEGURO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tipo de seguro
              </label>

              <select
                name="tipoSeguro"
                value={formulario.tipoSeguro}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-900"
              >
                <option value="Full">Full</option>
                <option value="Ley">Ley</option>
              </select>
            </div>

            {/* PRECIO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Precio por día
              </label>

              <input
                type="number"
                name="precioDia"
                value={formulario.precioDia}
                onChange={handleChange}
                placeholder="Ej. 60"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* IMAGEN */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                URL de la imagen
              </label>

              <input
                type="url"
                name="imagen"
                value={formulario.imagen}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Descripción
              </label>

              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={handleChange}
                placeholder="Describe brevemente el vehículo..."
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </div>

            {/* DISPONIBILIDAD */}
            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="disponible"
                  checked={formulario.disponible}
                  onChange={handleChange}
                  className="h-5 w-5"
                />

                <span className="text-sm font-medium text-gray-700">
                  Vehículo disponible para renta
                </span>
              </label>
            </div>
          </div>

          {/* BOTONES */}
          <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/vehiculos")}
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-gray-900 px-6 py-3 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}