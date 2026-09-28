"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  tipoSeguro: string;
  precioDia: number;
  imagen: string;
  descripcion: string;
  disponible: boolean;
};

export default function EditarVehiculoPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const obtenerVehiculo = async () => {
      try {
        const respuesta = await fetch(`/api/vehiculos/${id}`);

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo obtener el vehículo"
          );
        }

        setVehiculo(datos);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error"
        );
      } finally {
        setCargando(false);
      }
    };

    if (id) {
      obtenerVehiculo();
    }
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setVehiculo((actual) => {
      if (!actual) return actual;

      return {
        ...actual,
        [name]:
          type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehiculo) return;

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch(`/api/vehiculos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          anio: Number(vehiculo.anio),
          placa: vehiculo.placa,
          color: vehiculo.color,
          tipoSeguro: vehiculo.tipoSeguro,
          precioDia: Number(vehiculo.precioDia),
          imagen: vehiculo.imagen,
          descripcion: vehiculo.descripcion,
          disponible: vehiculo.disponible,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo actualizar el vehículo"
        );
      }

      alert("Vehículo actualizado correctamente");

      router.push("/admin/vehiculos");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar el vehículo"
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <p className="text-gray-600">
          Cargando vehículo...
        </p>
      </main>
    );
  }

  if (!vehiculo) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <h1 className="text-2xl font-bold text-gray-900">
          Vehículo no encontrado
        </h1>

        <p className="mt-2 text-gray-600">
          {error || "No se pudo encontrar el vehículo solicitado."}
        </p>

        <button
          onClick={() => router.push("/admin/vehiculos")}
          className="mt-6 rounded-lg bg-gray-900 px-5 py-3 text-white"
        >
          Volver a vehículos
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        {/* ENCABEZADO */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Editar vehículo
          </h1>

          <p className="mt-2 text-gray-600">
            Modifica la información del vehículo.
          </p>
        </div>

        {/* ERROR */}

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
                value={vehiculo.marca}
                onChange={handleChange}
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
                value={vehiculo.modelo}
                onChange={handleChange}
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
                value={vehiculo.anio}
                onChange={handleChange}
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
                value={vehiculo.placa}
                onChange={handleChange}
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
                value={vehiculo.color}
                onChange={handleChange}
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
                value={vehiculo.tipoSeguro}
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
                value={vehiculo.precioDia}
                onChange={handleChange}
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
                value={vehiculo.imagen || ""}
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
                value={vehiculo.descripcion || ""}
                onChange={handleChange}
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
                  checked={vehiculo.disponible}
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
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}