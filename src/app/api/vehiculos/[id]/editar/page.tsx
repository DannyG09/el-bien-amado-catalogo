"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  tipoSeguro: string;
  precioDia: number;
  imagen: string | null;
  descripcion: string | null;
  disponible: boolean;
};

export default function EditarVehiculoPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [placa, setPlaca] = useState("");
  const [color, setColor] = useState("");
  const [tipoSeguro, setTipoSeguro] = useState("Ley");
  const [precioDia, setPrecioDia] = useState("");
  const [imagen, setImagen] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [disponible, setDisponible] = useState(true);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarVehiculo();
  }, []);

  async function cargarVehiculo() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(`/api/vehiculos/${id}`);

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.detalle || data.error || "No se pudo cargar el vehículo"
        );
      }

      const vehiculo: Vehiculo = data;

      setMarca(vehiculo.marca);
      setModelo(vehiculo.modelo);
      setAnio(String(vehiculo.anio));
      setPlaca(vehiculo.placa);
      setColor(vehiculo.color);
      setTipoSeguro(vehiculo.tipoSeguro);
      setPrecioDia(String(vehiculo.precioDia));
      setImagen(vehiculo.imagen || "");
      setDescripcion(vehiculo.descripcion || "");
      setDisponible(vehiculo.disponible);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el vehículo."
      );
    } finally {
      setCargando(false);
    }
  }

  async function actualizarVehiculo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setGuardando(true);
      setError("");

      const respuesta = await fetch(`/api/vehiculos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marca,
          modelo,
          anio: Number(anio),
          placa,
          color,
          tipoSeguro,
          precioDia: Number(precioDia),
          imagen: imagen || null,
          descripcion: descripcion || null,
          disponible,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.detalle ||
            data.error ||
            "No se pudo actualizar el vehículo"
        );
      }

      router.push("/admin/vehiculos");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar el vehículo."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Cargando vehículo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* ENCABEZADO */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">

          <Link
            href="/admin/vehiculos"
            className="text-sm font-medium text-gray-500 hover:text-black"
          >
            ← Volver a vehículos
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Editar vehículo
          </h1>

          <p className="mt-1 text-gray-500">
            Modifica la información del vehículo.
          </p>

        </div>
      </header>

      {/* FORMULARIO */}
      <section className="mx-auto max-w-5xl px-6 py-10">

        <form
          onSubmit={actualizarVehiculo}
          className="rounded-xl bg-white p-8 shadow-sm"
        >

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* INFORMACIÓN */}
          <div>
            <h2 className="text-xl font-bold">
              Información del vehículo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Actualiza los datos principales.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            {/* MARCA */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Marca
              </label>

              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* MODELO */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Modelo
              </label>

              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* AÑO */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Año
              </label>

              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                min="1900"
                max="2100"
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* PLACA */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Placa
              </label>

              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 uppercase outline-none focus:border-black"
              />
            </div>

            {/* COLOR */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Color
              </label>

              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* SEGURO */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Tipo de seguro
              </label>

              <select
                value={tipoSeguro}
                onChange={(e) => setTipoSeguro(e.target.value)}
                className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-black"
              >
                <option value="Ley">
                  Ley
                </option>

                <option value="Full">
                  Full
                </option>
              </select>
            </div>

            {/* PRECIO */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Precio por día
              </label>

              <input
                type="number"
                value={precioDia}
                onChange={(e) => setPrecioDia(e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* IMAGEN */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Imagen
              </label>

              <input
                type="text"
                value={imagen}
                onChange={(e) => setImagen(e.target.value)}
                placeholder="URL de la imagen"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
              />
            </div>

          </div>

          {/* DESCRIPCIÓN */}
          <div className="mt-6">

            <label className="mb-2 block text-sm font-semibold">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
            />

          </div>

          {/* DISPONIBILIDAD */}
          <div className="mt-6 rounded-lg border bg-gray-50 p-4">

            <label className="flex cursor-pointer items-center gap-3">

              <input
                type="checkbox"
                checked={disponible}
                onChange={(e) => setDisponible(e.target.checked)}
                className="h-5 w-5"
              />

              <div>
                <p className="font-semibold">
                  Vehículo disponible
                </p>

                <p className="text-sm text-gray-500">
                  Indica si el vehículo puede aparecer disponible
                  para alquiler.
                </p>
              </div>

            </label>

          </div>

          {/* BOTONES */}
          <div className="mt-8 flex justify-end gap-3 border-t pt-6">

            <Link
              href="/admin/vehiculos"
              className="rounded-lg border px-5 py-3 font-medium hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

          </div>

        </form>

      </section>

    </main>
  );
}