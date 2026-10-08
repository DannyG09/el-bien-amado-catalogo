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
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => {
    cargarVehiculo();
  }, [id]);

  async function cargarVehiculo() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(`/api/vehiculos/${id}`, {
        cache: "no-store",
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.detalle || data.error || "No se pudo cargar el vehículo"
        );
      }

      const vehiculo: Vehiculo = data;

      setMarca(vehiculo.marca || "");
      setModelo(vehiculo.modelo || "");
      setAnio(String(vehiculo.anio || ""));
      setPlaca(vehiculo.placa || "");
      setColor(vehiculo.color || "");
      setTipoSeguro(vehiculo.tipoSeguro || "Ley");
      setPrecioDia(String(vehiculo.precioDia ?? ""));
      setImagen(vehiculo.imagen || "");
      setDescripcion(vehiculo.descripcion || "");
      setDisponible(vehiculo.disponible);

      setImagenRota(false);
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
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: Number(anio),
          placa: placa.trim(),
          color: color.trim(),
          tipoSeguro,
          precioDia: Number(precioDia),
          imagen: imagen.trim() || null,
          descripcion: descripcion.trim() || null,
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

      alert("Vehículo actualizado correctamente");

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

  const hayImagen =
    imagen.trim() !== "" && !imagenRota;

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
      <header className="border-b-4 border-[#D4202C] bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">

          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-gray-400">
              ADMINISTRACIÓN
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-white">
              Editar vehículo
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Modifica la información del vehículo.
            </p>
          </div>

          <Link
            href="/admin/vehiculos"
            className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
          >
            ← Volver
          </Link>

        </div>
      </header>

      {/* FORMULARIO */}
      <section className="mx-auto max-w-5xl px-6 py-10">

        <form
          onSubmit={actualizarVehiculo}
          className="rounded-2xl bg-white shadow-sm"
        >

          {/* ERROR */}
          {error && (
            <div className="mx-8 mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-[#D4202C]">
              {error}
            </div>
          )}

          <div className="p-8">

            {/* INFORMACIÓN */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 uppercase outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
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
                  Precio por día (USD$)
                </label>

                <div className="relative">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    USD$
                  </span>

                  <input
                    type="number"
                    value={precioDia}
                    onChange={(e) => setPrecioDia(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-14 pr-4 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
                  />

                </div>
              </div>

              {/* IMAGEN */}
              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-semibold">
                  URL de la imagen
                </label>

                <input
                  type="url"
                  value={imagen}
                  onChange={(e) => {
                    setImagen(e.target.value);
                    setImagenRota(false);
                  }}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Puedes mantener la imagen actual o pegar una nueva URL.
                </p>

                {/* VISTA PREVIA */}
                <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">

                  {hayImagen ? (
                    <img
                      src={imagen}
                      alt={`${marca} ${modelo}`}
                      onError={() => setImagenRota(true)}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center text-gray-400">

                      <span className="text-3xl">
                        🚘
                      </span>

                      <span className="mt-1 text-xs">
                        {imagenRota
                          ? "No se pudo cargar la imagen. Revisa la URL."
                          : "La vista previa aparecerá aquí"}
                      </span>

                    </div>
                  )}

                </div>

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
                placeholder="Describe brevemente el vehículo..."
                className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
              />

            </div>

            {/* DISPONIBILIDAD */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">

              <label className="flex cursor-pointer items-center gap-3">

                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  className="h-5 w-5 accent-[#D4202C]"
                />

                <div>

                  <p className="font-semibold text-gray-800">
                    Vehículo disponible
                  </p>

                  <p className="text-sm text-gray-500">
                    Indica si el vehículo puede aparecer disponible
                    para alquiler.
                  </p>

                </div>

              </label>

            </div>

          </div>

          {/* BOTONES */}
          <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 px-8 py-5 sm:flex-row sm:justify-end">

            <Link
              href="/admin/vehiculos"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#D4202C] px-8 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-50"
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