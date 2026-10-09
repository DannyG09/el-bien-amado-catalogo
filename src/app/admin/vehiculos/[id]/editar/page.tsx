
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { subirFotoCloudinary } from "../../../../lib/uploadCloudinary";

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

type Foto = {
  id: number;
  url: string;
  publicId: string;
  orden: number;
};

type FotoNueva = {
  url: string;
  publicId: string;
  archivo: File;
};

export default function EditarVehiculoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotosNuevas, setFotosNuevas] = useState<FotoNueva[]>([]);
  const [idsEliminar, setIdsEliminar] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarDatos() {
      try {
        const [respuestaVehiculo, respuestaFotos] = await Promise.all([
          fetch(`/api/vehiculos/${id}`),
          fetch(`/api/vehiculo-fotos?vehiculoId=${encodeURIComponent(id)}`),
        ]);

        const datos = await respuestaVehiculo.json();

        if (!respuestaVehiculo.ok) {
          throw new Error(datos.error || "No se pudo obtener el vehículo.");
        }

        if (cancelado) return;

        setVehiculo({
          ...datos,
          anio: Number(datos.anio),
          precioDia: Number(datos.precioDia ?? datos.preciodia ?? 0),
          tipoSeguro: datos.tipoSeguro ?? datos.tiposeguro ?? "Ley",
          imagen: datos.imagen ?? "",
          descripcion: datos.descripcion ?? "",
          disponible:
            datos.disponible === true ||
            datos.disponible === 1 ||
            datos.disponible === "true",
        });

        if (respuestaFotos.ok) {
          const resultadoFotos = await respuestaFotos.json();

          if (Array.isArray(resultadoFotos) && !cancelado) {
            setFotos(
              resultadoFotos.map((foto: any) => ({
                id: Number(foto.id),
                url: foto.url,
                publicId: foto.publicId ?? foto.public_id ?? "",
                orden: Number(foto.orden ?? 0),
              }))
            );
          }
        }
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof Error ? e.message : "Error al cargar los datos."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    if (id) cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [id]);

  function cambiarCampo(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
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
  }

  function seleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);

    if (!archivos.length) return;

    setError("");
    setMensaje("");

    const actuales = fotos.length - idsEliminar.length + fotosNuevas.length;

    if (actuales + archivos.length > 8) {
      setError("Puedes mantener un máximo de 8 fotografías por vehículo.");
      e.target.value = "";
      return;
    }

    const validos: FotoNueva[] = [];

    for (const archivo of archivos) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
        setError(`"${archivo.name}" no es JPG, PNG o WEBP.`);
        continue;
      }

      if (archivo.size > 5 * 1024 * 1024) {
        setError(`"${archivo.name}" supera el límite de 5 MB.`);
        continue;
      }

      validos.push({
        archivo,
        url: URL.createObjectURL(archivo),
        publicId: "",
      });
    }

    setFotosNuevas((actuales) => [...actuales, ...validos]);
    e.target.value = "";
  }

  function quitarFotoNueva(indice: number) {
    setFotosNuevas((actuales) => {
      const foto = actuales[indice];
      if (foto) URL.revokeObjectURL(foto.url);
      return actuales.filter((_, i) => i !== indice);
    });
  }

  function alternarEliminar(idFoto: number) {
    setIdsEliminar((actuales) =>
      actuales.includes(idFoto)
        ? actuales.filter((id) => id !== idFoto)
        : [...actuales, idFoto]
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    if (!vehiculo || guardando) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      // 1. Actualizar los datos generales.
      const respuesta = await fetch(`/api/vehiculos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(datos.error || "No se pudo actualizar el vehículo.");
      }

      // 2. Subir las nuevas fotografías a Cloudinary.
      const subidas: { url: string; publicId: string }[] = [];

      for (const foto of fotosNuevas) {
        const resultado = await subirFotoCloudinary(foto.archivo);
        subidas.push(resultado);
      }

      // 3. Eliminar de la base de datos las fotos marcadas.
      // La API DELETE debe implementarse en /api/vehiculo-fotos.
      if (idsEliminar.length > 0) {
        const respuestaEliminar = await fetch("/api/vehiculo-fotos", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehiculoId: Number(id),
            fotoIds: idsEliminar,
          }),
        });

        const resultadoEliminar = await respuestaEliminar.json();

        if (!respuestaEliminar.ok) {
          throw new Error(
            resultadoEliminar.error || "No se pudieron eliminar las fotos."
          );
        }
      }

      // 4. Registrar en la base de datos las nuevas fotografías.
      if (subidas.length > 0) {
        const respuestaFotos = await fetch("/api/vehiculo-fotos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehiculoId: Number(id),
            fotos: subidas,
          }),
        });

        const datosFotos = await respuestaFotos.json();

        if (!respuestaFotos.ok) {
          throw new Error(
            datosFotos.error || "Las fotos se subieron, pero no se guardaron en la base de datos."
          );
        }

        // Si el vehículo todavía no tenía imagen principal,
        // usar la primera foto subida.
        if (!vehiculo.imagen && subidas[0]) {
          await fetch(`/api/vehiculos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...vehiculo, imagen: subidas[0].url }),
          });
        }
      }

      setMensaje("Vehículo y fotografías guardados correctamente.");
      alert("Vehículo y fotografías guardados correctamente.");
      router.push("/admin/vehiculos");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Error al guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <main className="min-h-screen bg-gray-100 p-10">Cargando vehículo...</main>;
  }

  if (!vehiculo) {
    return (
      <main className="min-h-screen bg-gray-100 p-10">
        <h1 className="text-2xl font-bold">Vehículo no encontrado</h1>
        <p className="mt-2 text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/admin/vehiculos")}
          className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
        >
          Volver a vehículos
        </button>
      </main>
    );
  }

  const fotosVisibles = fotos.filter((foto) => !idsEliminar.includes(foto.id));

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar vehículo</h1>
          <p className="mt-2 text-gray-600">
            Modifica los datos y administra las fotografías del vehículo.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {mensaje}
          </div>
        )}

        <form onSubmit={guardar} className="space-y-8">
          <section className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 text-xl font-bold">Información del vehículo</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { label: "Marca", name: "marca", type: "text" },
                { label: "Modelo", name: "modelo", type: "text" },
                { label: "Año", name: "anio", type: "number" },
                { label: "Placa", name: "placa", type: "text" },
                { label: "Color", name: "color", type: "text" },
                { label: "Precio por día (USD)", name: "precioDia", type: "number" },
              ].map((campo) => (
                <div key={campo.name}>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {campo.label}
                  </label>
                  <input
                    type={campo.type}
                    name={campo.name}
                    value={vehiculo[campo.name as keyof Vehiculo] as string | number}
                    onChange={cambiarCampo}
                    required
                    min={campo.type === "number" ? 0 : undefined}
                    step={campo.name === "precioDia" ? "0.01" : undefined}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#D4202C]"
                  />
                </div>
              ))}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de seguro
                </label>
                <select
                  name="tipoSeguro"
                  value={vehiculo.tipoSeguro}
                  onChange={cambiarCampo}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                >
                  <option value="Full">Full</option>
                  <option value="Ley">Ley</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  URL de la imagen principal
                </label>
                <input
                  type="url"
                  name="imagen"
                  value={vehiculo.imagen || ""}
                  onChange={cambiarCampo}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={vehiculo.descripcion || ""}
                  onChange={cambiarCampo}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  name="disponible"
                  checked={vehiculo.disponible}
                  onChange={cambiarCampo}
                  className="h-5 w-5"
                />
                <span className="text-sm font-medium text-gray-700">
                  Vehículo disponible para renta
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold">Fotografías del vehículo</h2>
            <p className="mt-2 text-sm text-gray-500">
              Puedes mantener hasta 8 fotos. Formatos JPG, PNG o WEBP; máximo 5 MB por imagen.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {fotosVisibles.map((foto) => (
                <div key={foto.id} className="overflow-hidden rounded-xl border">
                  <img
                    src={foto.url}
                    alt="Fotografía del vehículo"
                    className="h-36 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => alternarEliminar(foto.id)}
                    className="w-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Marcar para eliminar
                  </button>
                </div>
              ))}

              {fotosNuevas.map((foto, indice) => (
                <div key={`${foto.archivo.name}-${indice}`} className="overflow-hidden rounded-xl border-2 border-green-300">
                  <img
                    src={foto.url}
                    alt={foto.archivo.name}
                    className="h-36 w-full object-cover"
                  />
                  <p className="truncate px-2 py-2 text-xs text-gray-600">
                    {foto.archivo.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => quitarFotoNueva(indice)}
                    className="w-full bg-gray-100 px-3 py-2 text-sm font-semibold hover:bg-gray-200"
                  >
                    Quitar selección
                  </button>
                </div>
              ))}
            </div>

            {fotosVisibles.length + fotosNuevas.length === 0 && (
              <p className="mt-5 rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
                No hay fotografías seleccionadas para este vehículo.
              </p>
            )}

            <label className="mt-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-[#D4202C]">
              <span className="text-lg font-bold">+ Agregar fotografías</span>
              <span className="mt-1 text-sm text-gray-500">
                Selecciona una o varias imágenes de tu computadora
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={seleccionarFotos}
                className="mt-4 block w-full max-w-xs text-sm"
              />
            </label>

            {idsEliminar.length > 0 && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {idsEliminar.length} fotografía(s) marcada(s) para eliminar al guardar.
              </p>
            )}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/vehiculos")}
              disabled={guardando}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#D4202C] px-6 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-50"
            >
              {guardando ? "Guardando cambios..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}