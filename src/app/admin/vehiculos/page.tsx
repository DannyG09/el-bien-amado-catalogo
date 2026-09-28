"use client";

import { useEffect, useState } from "react";
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

export default function VehiculosAdminPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarVehiculos();
  }, []);

  async function cargarVehiculos() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch("/api/vehiculos");

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los vehículos");
      }

      const datos = await respuesta.json();

      setVehiculos(datos);
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al cargar los vehículos.");
    } finally {
      setCargando(false);
    }
  }

  async function eliminarVehiculo(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este vehículo?"
    );

    if (!confirmar) {
      return;
    }

    try {
      const respuesta = await fetch(`/api/vehiculos/${id}`, {
        method: "DELETE",
      });

      if (!respuesta.ok) {
        throw new Error("No se pudo eliminar el vehículo");
      }

      setVehiculos((vehiculosActuales) =>
        vehiculosActuales.filter((vehiculo) => vehiculo.id !== id)
      );
    } catch (error) {
      console.error(error);
      setError("No se pudo eliminar el vehículo.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* ENCABEZADO */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">

          <div>
            <p className="text-sm text-gray-500">
              Administración
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              Vehículos
            </h1>
          </div>

          <Link
            href="/admin/vehiculos/nuevo"
            className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
          >
            + Nuevo vehículo
          </Link>

        </div>
      </header>

      {/* CONTENIDO */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              Cargando vehículos...
            </p>
          </div>
        )}

        {/* SIN VEHÍCULOS */}
        {!cargando && vehiculos.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              🚘
            </div>

            <h2 className="mt-4 text-xl font-bold">
              No hay vehículos registrados
            </h2>

            <p className="mt-2 text-gray-500">
              Agrega tu primer vehículo para comenzar.
            </p>

            <Link
              href="/admin/vehiculos/nuevo"
              className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-semibold text-white"
            >
              Agregar vehículo
            </Link>

          </div>
        )}

        {/* TABLA */}
        {!cargando && vehiculos.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="border-b bg-gray-50">
                  <tr>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Vehículo
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Placa
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Seguro
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Precio
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Estado
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold">
                      Acciones
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y">

                  {vehiculos.map((vehiculo) => (

                    <tr
                      key={vehiculo.id}
                      className="hover:bg-gray-50"
                    >

                      {/* VEHÍCULO */}
                      <td className="px-6 py-5">

                        <div className="flex items-center gap-4">

                          {vehiculo.imagen ? (
                            <img
                              src={vehiculo.imagen}
                              alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                              className="h-14 w-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                              🚘
                            </div>
                          )}

                          <div>

                            <p className="font-semibold text-gray-900">
                              {vehiculo.marca} {vehiculo.modelo}
                            </p>

                            <p className="text-sm text-gray-500">
                              Año {vehiculo.anio}
                            </p>

                            <p className="text-sm text-gray-500">
                              {vehiculo.color}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* PLACA */}
                      <td className="px-6 py-5">

                        <span className="rounded-md bg-gray-100 px-3 py-1 font-mono text-sm">
                          {vehiculo.placa}
                        </span>

                      </td>

                      {/* SEGURO */}
                      <td className="px-6 py-5 text-sm">
                        {vehiculo.tipoSeguro}
                      </td>

                      {/* PRECIO */}
                      <td className="px-6 py-5">

                        <p className="font-semibold">
                          RD$ {vehiculo.precioDia}
                        </p>

                        <p className="text-xs text-gray-500">
                          por día
                        </p>

                      </td>

                      {/* ESTADO */}
                      <td className="px-6 py-5">

                        {vehiculo.disponible ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Disponible
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            No disponible
                          </span>
                        )}

                      </td>

                      {/* ACCIONES */}
                      <td className="px-6 py-5">

                        <div className="flex justify-end gap-2">

                          <Link
                            href={`/admin/vehiculos/${vehiculo.id}/editar`}
                            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-100"
                          >
                            Editar
                          </Link>

                          <button
                            onClick={() =>
                              eliminarVehiculo(vehiculo.id)
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>
        )}

      </section>

    </main>
  );
}