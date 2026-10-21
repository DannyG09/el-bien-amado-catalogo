
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CarFront,
  Check,
  CircleDollarSign,
  Gauge,
  Images,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { subirFotoCloudinary } from "../../../../lib/uploadCloudinary";
import {
  CATEGORIAS_GASTO,
  ETIQUETAS_CATEGORIA_GASTO,
  FRECUENCIAS_GASTO,
  type GastoRecurrente,
} from "../../../../lib/gastos-recurrentes";

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
const FORMATO_NUMERO = new Intl.NumberFormat("es-DO");

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
  const [categoriaGasto, setCategoriaGasto] =
    useState<(typeof CATEGORIAS_GASTO)[number]>("otro");
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
    setCategoriaGasto("otro");
    setFrecuenciaGasto("anual");
    setFechaInicioGasto(fechaLocalHoy());
    setMontoGasto("");
    setGastoEditandoId(null);
  }

  function editarGasto(gasto: GastoRecurrente) {
    setGastoEditandoId(gasto.id);
    setNombreGasto(gasto.nombre);
    setCategoriaGasto(gasto.categoria);
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
            categoria: categoriaGasto,
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm font-semibold text-[#D4202C] shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-red-100 border-t-[#D4202C]" />
          Cargando información del vehículo...
        </div>
      </main>
    );
  }

  if (!vehiculo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-lg rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">Vehículo no encontrado</h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/admin/vehiculos")}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111214] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#D4202C]"
        >
          <ArrowLeft size={16} />
          Volver a vehículos
        </button>
        </div>
      </main>
    );
  }

  const ultimoMantenimiento = mantenimientosRecientes[0] ?? null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="relative isolate mb-8 overflow-hidden rounded-[2rem] bg-[#111214] px-6 py-7 text-white shadow-[0_24px_60px_-35px_rgba(17,18,20,0.7)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-16 -z-10 h-56 w-56 rounded-full border border-red-400/20" />
          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-red-300">
                  <CarFront size={25} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300">
                    El Bien Amado · Flota
                  </p>
                  <p className="mt-1 text-sm text-white/65">Gestión del vehículo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/admin/vehiculos")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <ArrowLeft size={16} />
                Volver a vehículos
              </button>
            </div>

            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-medium text-white/60">Editar vehículo</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  {vehiculo.marca} <span className="text-red-300">{vehiculo.modelo}</span>
                </h1>
                <p className="mt-2 text-sm text-white/65">
                  Organiza los detalles, las fotos y el historial de tu unidad.
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${
                  vehiculo.disponible
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                    : "border-amber-200/25 bg-amber-200/10 text-amber-100"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${vehiculo.disponible ? "bg-emerald-300" : "bg-amber-300"}`} />
                {vehiculo.disponible ? "Disponible para renta" : "No disponible"}
              </span>
            </div>

            <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
                <Gauge className="shrink-0 text-red-300" size={20} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                    Último kilometraje
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {ultimoMantenimiento
                      ? `${FORMATO_NUMERO.format(ultimoMantenimiento.kilometraje)} km`
                      : "Sin registro"}
                  </p>
                  {ultimoMantenimiento && (
                    <p className="mt-0.5 text-xs text-white/50">
                      Mantenimiento del {formatFecha(ultimoMantenimiento.fecha)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
                <Images className="shrink-0 text-red-300" size={20} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                    Galería
                  </p>
                  <p className="mt-1 text-lg font-bold">{fotosVisibles.length} / 8 fotos</p>
                  <p className="mt-0.5 text-xs text-white/50">Portada y orden de exhibición</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
                <CircleDollarSign className="shrink-0 text-red-300" size={20} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                    Precio por día
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    US$ {FORMATO_NUMERO.format(Number(vehiculo.precioDia))}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">
                    Placa {vehiculo.placa || "pendiente"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {mensaje && (
          <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {mensaje}
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0">
        <form onSubmit={guardar} className="space-y-6">
          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#D4202C]">
                <CarFront size={21} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4202C]">01 · Datos principales</p>
                <h2 className="mt-0.5 text-xl font-bold text-gray-950">Información del vehículo</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { label: "Marca", name: "marca", type: "text" },
                { label: "Modelo", name: "modelo", type: "text" },
                { label: "Año", name: "anio", type: "number" },
                { label: "Placa (opcional)", name: "placa", type: "text" },
                { label: "Color", name: "color", type: "text" },
                { label: "Precio por día (USD)", name: "precioDia", type: "number" },
              ].map((campo) => (
                <div key={campo.name}>
                  <label htmlFor={`vehiculo-${campo.name}`} className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    {campo.label}
                  </label>
                  <input
                    id={`vehiculo-${campo.name}`}
                    type={campo.type}
                    name={campo.name}
                    value={vehiculo[campo.name as keyof Vehiculo] as string | number}
                    onChange={cambiarCampo}
                    required={campo.name !== "placa"}
                    min={campo.type === "number" ? 0 : undefined}
                    step={campo.name === "precioDia" ? "0.01" : undefined}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
                  />
                </div>
              ))}

              <div>
                <label htmlFor="vehiculo-tipoSeguro" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                  Tipo de seguro
                </label>
                <select
                  id="vehiculo-tipoSeguro"
                  name="tipoSeguro"
                  value={vehiculo.tipoSeguro}
                  onChange={cambiarCampo}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
                >
                  <option value="Full">Full</option>
                  <option value="Ley">Ley</option>
                </select>
              </div>

              <div>
                <label htmlFor="vehiculo-imagen" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                  URL de la imagen principal
                </label>
                <input
                  id="vehiculo-imagen"
                  type="url"
                  name="imagen"
                  value={vehiculo.imagen || ""}
                  onChange={cambiarCampo}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="vehiculo-descripcion" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                  Descripción
                </label>
                <textarea
                  id="vehiculo-descripcion"
                  name="descripcion"
                  value={vehiculo.descripcion || ""}
                  onChange={cambiarCampo}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
                <input
                  type="checkbox"
                  name="disponible"
                  checked={vehiculo.disponible}
                  onChange={cambiarCampo}
                  className="h-5 w-5 accent-[#D4202C]"
                />
                <span>
                  <span className="block text-sm font-bold text-gray-900">Disponible para renta</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Activa o pausa la publicación de este vehículo.</span>
                </span>
                {vehiculo.disponible && <Check size={18} className="ml-auto text-[#D4202C]" />}
              </label>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#D4202C]">
                <Images size={21} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4202C]">02 · Presentación</p>
                <h2 className="mt-0.5 text-xl font-bold text-gray-950">Fotografías del vehículo</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Puedes mantener hasta 8 fotos. Formatos JPG, PNG o WEBP; máximo 5 MB por imagen.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {fotosVisibles.map((item, indice) => (
                <div
                  key={item.key}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    item.nueva
                      ? "border-emerald-300"
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
                    <span className="absolute left-2 top-2 rounded-full bg-[#111214]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {indice === 0 ? "Portada" : `Foto ${indice + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
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
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Mover foto ${indice + 1} hacia atrás`}
                        title="Mover hacia atrás"
                        disabled={indice === fotosVisibles.length - 1}
                        onClick={() => moverFoto(item.key, 1)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                  {item.nueva ? (
                    <>
                      <p className="truncate px-3 py-2 text-xs text-gray-600">
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
                        className="w-full bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
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
                      className="w-full bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Marcar para eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {fotosVisibles.length === 0 && (
              <p className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No hay fotografías seleccionadas para este vehículo.
              </p>
            )}

            <label className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-7 text-center transition hover:border-[#D4202C] hover:bg-red-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#D4202C] shadow-sm"><Images size={20} /></span>
              <span className="mt-3 text-base font-bold text-gray-900">Agregar fotografías</span>
              <span className="mt-1 text-sm text-gray-500">
                Selecciona una o varias imágenes de tu computadora
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={seleccionarFotos}
                className="mt-4 block w-full max-w-xs text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#111214] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#D4202C]"
              />
            </label>

            {idsEliminar.length > 0 && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                {idsEliminar.length} fotografía(s) marcada(s) para eliminar al guardar.
              </p>
            )}
          </section>

          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/vehiculos")}
              disabled={guardando}
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:opacity-50"
            >
              <Save size={17} />
              {guardando ? "Guardando cambios..." : "Guardar cambios"}
            </button>
          </div>
        </form>
        </div>

        <aside className="min-w-0 space-y-6">
        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarClock size={22} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4202C]">03 · Costos programados</p>
              <h2 className="mt-0.5 text-xl font-bold text-gray-950">Otros gastos recurrentes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Seguro, marbete, GPS y otros pagos en DOP. La próxima fecha se
                calcula según la periodicidad.
              </p>
            </div>
          </div>

          <form
            onSubmit={guardarGastoRecurrente}
            className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
          >
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
              Nombre del gasto
              <input
                required
                maxLength={120}
                list="opciones-gastos-recurrentes"
                value={nombreGasto}
                onChange={(evento) => setNombreGasto(evento.target.value)}
                placeholder="Ej. Seguro anual"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
              />
              <datalist id="opciones-gastos-recurrentes">
                <option value="Seguro anual" />
                <option value="Marbete" />
                <option value="GPS" />
                <option value="Otro" />
              </datalist>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
              Tipo de gasto
              <select
                value={categoriaGasto}
                onChange={(evento) =>
                  setCategoriaGasto(
                    evento.target.value as (typeof CATEGORIAS_GASTO)[number]
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
              >
                <option value="seguro">Seguro</option>
                <option value="marbete">Marbete</option>
                <option value="gps">GPS</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="otro">Otro</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
              Frecuencia
              <select
                value={frecuenciaGasto}
                onChange={(evento) =>
                  setFrecuenciaGasto(
                    evento.target.value as (typeof FRECUENCIAS_GASTO)[number]
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
              >
                <option value="anual">Cada año</option>
                <option value="mensual">Cada mes</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
              Fecha de inicio / instalación
              <input
                required
                type="date"
                value={fechaInicioGasto}
                onChange={(evento) =>
                  setFechaInicioGasto(evento.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
              />
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
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
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={guardandoGasto}
                className="rounded-xl bg-[#D4202C] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:opacity-50"
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
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <div className="mt-5 divide-y divide-gray-100">
            {gastosRecurrentes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                Este vehículo todavía no tiene gastos recurrentes registrados.
              </p>
            ) : (
              gastosRecurrentes.map((gasto) => (
                <article
                  key={gasto.id}
                  className="flex flex-col gap-3 py-5"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">{gasto.nombre}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {ETIQUETAS_CATEGORIA_GASTO[gasto.categoria]} · Cada{" "}
                      {gasto.frecuencia === "anual" ? "año" : "mes"} desde{" "}
                      {formatFecha(gasto.fechaInicio)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#D4202C]">
                      Próximo pago: {formatFecha(gasto.fechaProxima)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {FORMATO_DOP.format(gasto.monto)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editarGasto(gasto)}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void eliminarGastoRecurrente(gasto)}
                      aria-label={`Eliminar ${gasto.nombre}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
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

        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#D4202C]">
              <Wrench size={21} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4202C]">04 · Historial del vehículo</p>
              <h2 className="mt-0.5 text-xl font-bold text-gray-950">Últimos mantenimientos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Los cinco registros más recientes de este vehículo.
              </p>
            </div>
          </div>

          {ultimoMantenimiento && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#D4202C] shadow-sm">
                  <Gauge size={20} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Kilometraje más reciente</p>
                  <p className="mt-0.5 text-lg font-extrabold text-[#111214]">
                    {FORMATO_NUMERO.format(ultimoMantenimiento.kilometraje)} km
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {ultimoMantenimiento.categoria} · {formatFecha(ultimoMantenimiento.fecha)}
              </p>
            </div>
          )}

          {mantenimientosRecientes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
              No hay mantenimientos registrados para este vehículo.
            </p>
          ) : (
            <div className="space-y-3">
              {mantenimientosRecientes.map((mantenimiento) => (
                <article
                  key={mantenimiento.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-gray-900">
                        {mantenimiento.categoria}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatFecha(mantenimiento.fecha)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900">
                      {FORMATO_DOP.format(mantenimiento.monto)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 pt-3 text-xs text-gray-600">
                    <span>
                      {FORMATO_NUMERO.format(mantenimiento.kilometraje)} km
                    </span>
                    {mantenimiento.descripcion && (
                      <span className="min-w-0 break-words">
                        {mantenimiento.descripcion}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        </aside>
        </div>
      </div>
    </main>
  );
}