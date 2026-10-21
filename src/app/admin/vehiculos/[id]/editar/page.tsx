
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarClock, Trash2 } from "lucide-react";
import { subirFotoCloudinary } from "../../../../lib/uploadCloudinary";
import {
  FRECUENCIAS_GASTO,
  type GastoRecurrente,
} from "../../../../lib/gastos-recurrentes";
import AdminPageHeader from "../../../AdminPageHeader";

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
  key: string;
  url: string;
  publicId: string;
  archivo: File;
};

type MantenimientoReciente = {
  id: number;
  fecha: string;
  categoria: string;
  monto: number;
  kilometraje: number;
  descripcion: string | null;
};

type FotoVisible = {
  key: string;
  nueva: boolean;
  foto: Foto | FotoNueva;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

function formatFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function fechaLocalHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function EditarVehiculoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotosNuevas, setFotosNuevas] = useState<FotoNueva[]>([]);
  const [ordenFotos, setOrdenFotos] = useState<string[]>([]);
  const [idsEliminar, setIdsEliminar] = useState<number[]>([]);
  const [gastosRecurrentes, setGastosRecurrentes] = useState<
    GastoRecurrente[]
  >([]);
  const [mantenimientosRecientes, setMantenimientosRecientes] = useState<
    MantenimientoReciente[]
  >([]);
  const [nombreGasto, setNombreGasto] = useState("");
  const [frecuenciaGasto, setFrecuenciaGasto] =
    useState<(typeof FRECUENCIAS_GASTO)[number]>("anual");
  const [fechaInicioGasto, setFechaInicioGasto] = useState(fechaLocalHoy);
  const [montoGasto, setMontoGasto] = useState("");
  const [gastoEditandoId, setGastoEditandoId] = useState<number | null>(null);
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarDatos() {
      try {
        const [
          respuestaVehiculo,
          respuestaFotos,
          respuestaGastos,
          respuestaMantenimientos,
        ] = await Promise.all([
          fetch(`/api/vehiculos/${id}`),
          fetch(`/api/vehiculo-fotos?vehiculoId=${encodeURIComponent(id)}`),
          fetch(`/api/vehiculos/${id}/gastos-recurrentes`),
          fetch(`/api/vehiculos/${id}/mantenimientos`),
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
            const fotosCargadas: Foto[] = resultadoFotos.map(
              (foto: Record<string, unknown>) => ({
                id: Number(foto.id),
                url: String(foto.url),
                publicId: String(foto.publicId ?? foto.public_id ?? ""),
                orden: Number(foto.orden ?? 0),
              })
            );
            setFotos(fotosCargadas);
            setOrdenFotos(fotosCargadas.map((foto) => String(foto.id)));
          }
        }

        if (!respuestaGastos.ok) {
          const detalle = (await respuestaGastos.json()) as { error?: string };
          throw new Error(
            detalle.error ?? "No se pudieron obtener los gastos recurrentes."
          );
        }
        if (!respuestaMantenimientos.ok) {
          const detalle = (await respuestaMantenimientos.json()) as {
            error?: string;
          };
          throw new Error(
            detalle.error ??
              "No se pudieron obtener los mantenimientos recientes."
          );
        }

        const [gastosCargados, mantenimientosCargados] = await Promise.all([
          respuestaGastos.json() as Promise<GastoRecurrente[]>,
          respuestaMantenimientos.json() as Promise<MantenimientoReciente[]>,
        ]);
        if (!cancelado) {
          setGastosRecurrentes(gastosCargados);
          setMantenimientosRecientes(mantenimientosCargados);
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
        key: `nueva:${crypto.randomUUID()}`,
        archivo,
        url: URL.createObjectURL(archivo),
        publicId: "",
      });
    }

    setFotosNuevas((actuales) => [...actuales, ...validos]);
    setOrdenFotos((actuales) => [
      ...actuales,
      ...validos.map((foto) => foto.key),
    ]);
    e.target.value = "";
  }

  function quitarFotoNueva(indice: number) {
    const foto = fotosNuevas[indice];
    if (!foto) return;
    URL.revokeObjectURL(foto.url);
    setOrdenFotos((ordenActual) =>
      ordenActual.filter((key) => key !== foto.key)
    );
    setFotosNuevas((actuales) => actuales.filter((_, i) => i !== indice));
  }

  const fotosVisibles: FotoVisible[] = [];
  for (const key of ordenFotos) {
    const fotoExistente = fotos.find((foto) => String(foto.id) === key);
    if (fotoExistente) {
      if (!idsEliminar.includes(fotoExistente.id)) {
        fotosVisibles.push({ key, nueva: false, foto: fotoExistente });
      }
      continue;
    }

    const fotoNueva = fotosNuevas.find((foto) => foto.key === key);
    if (fotoNueva) fotosVisibles.push({ key, nueva: true, foto: fotoNueva });
  }

  function moverFoto(key: string, direccion: -1 | 1) {
    const visibles = fotosVisibles.map((item) => item.key);
    const indice = visibles.indexOf(key);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= visibles.length) return;

    [visibles[indice], visibles[destino]] = [
      visibles[destino],
      visibles[indice],
    ];
    const ocultas = ordenFotos.filter((fotoKey) => !visibles.includes(fotoKey));
    setOrdenFotos([...visibles, ...ocultas]);
  }

  function alternarEliminar(idFoto: number) {
    setIdsEliminar((actuales) =>
      actuales.includes(idFoto)
        ? actuales.filter((id) => id !== idFoto)
        : [...actuales, idFoto]
    );
  }

  function limpiarFormularioGasto() {
    setNombreGasto("");
    setFrecuenciaGasto("anual");
    setFechaInicioGasto(fechaLocalHoy());
    setMontoGasto("");
    setGastoEditandoId(null);
  }

  function editarGasto(gasto: GastoRecurrente) {
    setGastoEditandoId(gasto.id);
    setNombreGasto(gasto.nombre);
    setFrecuenciaGasto(gasto.frecuencia);
    setFechaInicioGasto(gasto.fechaInicio);
    setMontoGasto(String(gasto.monto));
  }

  async function guardarGastoRecurrente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardandoGasto) return;

    setGuardandoGasto(true);
    setError("");
    setMensaje("");

    try {
      const editando = gastoEditandoId !== null;
      const respuesta = await fetch(
        editando
          ? `/api/vehiculos/${id}/gastos-recurrentes/${gastoEditandoId}`
          : `/api/vehiculos/${id}/gastos-recurrentes`,
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreGasto,
            frecuencia: frecuenciaGasto,
            fechaInicio: fechaInicioGasto,
            monto: Number(montoGasto),
          }),
        }
      );

      if (!respuesta.ok) {
        const resultado = (await respuesta.json()) as { error?: string };
        throw new Error(
          resultado.error ?? "No se pudo guardar el gasto recurrente."
        );
      }
      const resultado = (await respuesta.json()) as GastoRecurrente;

      setGastosRecurrentes((actuales) =>
        editando
          ? actuales.map((gasto) =>
              gasto.id === resultado.id ? resultado : gasto
            )
          : [resultado, ...actuales]
      );
      limpiarFormularioGasto();
      setMensaje(
        editando
          ? "Gasto recurrente actualizado."
          : "Gasto recurrente agregado."
      );
    } catch (e) {
      console.error("Error al guardar gasto recurrente:", e);
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el gasto."
      );
    } finally {
      setGuardandoGasto(false);
    }
  }

  async function eliminarGastoRecurrente(gasto: GastoRecurrente) {
    if (
      !window.confirm(
        `¿Eliminar el gasto recurrente "${gasto.nombre}" de este vehículo?`
      )
    ) {
      return;
    }

    try {
      const respuesta = await fetch(
        `/api/vehiculos/${id}/gastos-recurrentes/${gasto.id}`,
        { method: "DELETE" }
      );
      if (!respuesta.ok) {
        const resultado = (await respuesta.json()) as { error?: string };
        throw new Error(
          resultado.error ?? "No se pudo eliminar el gasto recurrente."
        );
      }

      setGastosRecurrentes((actuales) =>
        actuales.filter((actual) => actual.id !== gasto.id)
      );
      if (gastoEditandoId === gasto.id) limpiarFormularioGasto();
      setMensaje("Gasto recurrente eliminado.");
    } catch (e) {
      console.error("Error al eliminar gasto recurrente:", e);
      setError(
        e instanceof Error ? e.message : "No se pudo eliminar el gasto."
      );
    }
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

      // Subir las nuevas fotos siguiendo el orden que se muestra en pantalla.
      const subidas: { key: string; url: string; publicId: string }[] = [];
      for (const fotoVisible of fotosVisibles) {
        if (!fotoVisible.nueva) continue;
        const foto = fotoVisible.foto as FotoNueva;
        const resultado = await subirFotoCloudinary(foto.archivo);
        subidas.push({ key: foto.key, ...resultado });
      }

      // Eliminar las fotos marcadas antes de fijar el orden final.
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

      const idsNuevas = new Map<string, number>();
      if (subidas.length > 0) {
        const respuestaFotos = await fetch("/api/vehiculo-fotos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehiculoId: Number(id),
            fotos: subidas.map(({ url, publicId }) => ({ url, publicId })),
          }),
        });

        const datosFotos = (await respuestaFotos.json()) as {
          error?: string;
          fotos?: { id: number; publicId: string }[];
        };

        if (!respuestaFotos.ok) {
          throw new Error(
            datosFotos.error || "Las fotos se subieron, pero no se guardaron en la base de datos."
          );
        }

        const idsPorPublicId = new Map(
          (datosFotos.fotos ?? []).map((foto) => [foto.publicId, foto.id])
        );
        for (const subida of subidas) {
          const fotoId = idsPorPublicId.get(subida.publicId);
          if (fotoId !== undefined) idsNuevas.set(subida.key, fotoId);
        }
      }

      const idsOrdenados = fotosVisibles.map((item) =>
        item.nueva
          ? idsNuevas.get(item.key)
          : (item.foto as Foto).id
      );
      if (idsOrdenados.some((fotoId) => fotoId === undefined)) {
        throw new Error(
          "No se pudo determinar el orden de todas las fotografías guardadas."
        );
      }

      if (idsOrdenados.length > 0) {
        const respuestaOrden = await fetch("/api/vehiculo-fotos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehiculoId: Number(id),
            fotoIds: idsOrdenados,
          }),
        });
        if (!respuestaOrden.ok) {
          const resultadoOrden = (await respuestaOrden.json()) as {
            error?: string;
          };
          throw new Error(
            resultadoOrden.error ??
              "No se pudo guardar el orden de las fotografías."
          );
        }
      }

      setMensaje("Vehículo y fotografías guardados correctamente.");
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

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          title="Editar vehículo"
          description="Actualiza los datos, organiza las fotografías y gestiona los gastos recurrentes."
        >
          <button
            type="button"
            onClick={() => router.push("/admin/vehiculos")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Volver a vehículos
          </button>
        </AdminPageHeader>

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
              {fotosVisibles.map((item, indice) => (
                <div
                  key={item.key}
                  className={`overflow-hidden rounded-xl border ${
                    item.nueva
                      ? "border-green-300"
                      : "border-gray-200"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={item.foto.url}
                      alt={
                        item.nueva
                          ? (item.foto as FotoNueva).archivo.name
                          : `Fotografía ${indice + 1} del vehículo`
                      }
                      loading="lazy"
                      decoding="async"
                      className="h-36 w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
                      {indice === 0 ? "Portada" : `Foto ${indice + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b px-2 py-2">
                    <span className="text-xs font-semibold text-gray-600">
                      Orden: {indice + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Mover foto ${indice + 1} hacia adelante`}
                        title="Mover hacia adelante"
                        disabled={indice === 0}
                        onClick={() => moverFoto(item.key, -1)}
                        className="rounded-md border p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Mover foto ${indice + 1} hacia atrás`}
                        title="Mover hacia atrás"
                        disabled={indice === fotosVisibles.length - 1}
                        onClick={() => moverFoto(item.key, 1)}
                        className="rounded-md border p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                  {item.nueva ? (
                    <>
                      <p className="truncate px-2 py-2 text-xs text-gray-600">
                        {(item.foto as FotoNueva).archivo.name}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          quitarFotoNueva(
                            fotosNuevas.findIndex(
                              (foto) => foto.key === item.key
                            )
                          )
                        }
                        className="w-full bg-gray-100 px-3 py-2 text-sm font-semibold hover:bg-gray-200"
                      >
                        Quitar selección
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        alternarEliminar((item.foto as Foto).id)
                      }
                      className="w-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Marcar para eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {fotosVisibles.length === 0 && (
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

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarClock size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold">Otros gastos recurrentes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Seguro, marbete, GPS y otros pagos en DOP. La próxima fecha se
                calcula según la periodicidad.
              </p>
            </div>
          </div>

          <form
            onSubmit={guardarGastoRecurrente}
            className="grid gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <label className="text-sm font-medium text-gray-700">
              Nombre del gasto
              <input
                required
                maxLength={120}
                list="opciones-gastos-recurrentes"
                value={nombreGasto}
                onChange={(evento) => setNombreGasto(evento.target.value)}
                placeholder="Ej. Seguro anual"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
              />
              <datalist id="opciones-gastos-recurrentes">
                <option value="Seguro anual" />
                <option value="Marbete" />
                <option value="GPS" />
                <option value="Otro" />
              </datalist>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Frecuencia
              <select
                value={frecuenciaGasto}
                onChange={(evento) =>
                  setFrecuenciaGasto(
                    evento.target.value as (typeof FRECUENCIAS_GASTO)[number]
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
              >
                <option value="anual">Cada año</option>
                <option value="mensual">Cada mes</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Fecha de inicio / instalación
              <input
                required
                type="date"
                value={fechaInicioGasto}
                onChange={(evento) =>
                  setFechaInicioGasto(evento.target.value)
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Monto (DOP)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                inputMode="decimal"
                value={montoGasto}
                onChange={(evento) => setMontoGasto(evento.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
              />
            </label>

            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={guardandoGasto}
                className="rounded-lg bg-[#D4202C] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:opacity-50"
              >
                {guardandoGasto
                  ? "Guardando..."
                  : gastoEditandoId
                    ? "Guardar gasto"
                    : "Agregar gasto"}
              </button>
              {gastoEditandoId !== null && (
                <button
                  type="button"
                  disabled={guardandoGasto}
                  onClick={limpiarFormularioGasto}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <div className="mt-5 divide-y divide-gray-100">
            {gastosRecurrentes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                Este vehículo todavía no tiene gastos recurrentes registrados.
              </p>
            ) : (
              gastosRecurrentes.map((gasto) => (
                <article
                  key={gasto.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{gasto.nombre}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Cada {gasto.frecuencia === "anual" ? "año" : "mes"} desde{" "}
                      {formatFecha(gasto.fechaInicio)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#D4202C]">
                      Próximo pago: {formatFecha(gasto.fechaProxima)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {FORMATO_DOP.format(gasto.monto)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editarGasto(gasto)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void eliminarGastoRecurrente(gasto)}
                      aria-label={`Eliminar ${gasto.nombre}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Borrar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CalendarClock size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold">Últimos mantenimientos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Los cinco registros más recientes de este vehículo.
              </p>
            </div>
          </div>

          {mantenimientosRecientes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
              No hay mantenimientos registrados para este vehículo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Kilometraje</th>
                    <th className="px-4 py-3 font-semibold">Gasto</th>
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mantenimientosRecientes.map((mantenimiento) => (
                    <tr key={mantenimiento.id} className="text-gray-700">
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatFecha(mantenimiento.fecha)}
                      </td>
                      <td className="px-4 py-3">{mantenimiento.categoria}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Intl.NumberFormat("es-DO").format(
                          mantenimiento.kilometraje
                        )}{" "}
                        km
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {FORMATO_DOP.format(mantenimiento.monto)}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        {mantenimiento.descripcion || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}