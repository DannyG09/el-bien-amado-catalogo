"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  ImagePlus,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
};

type Cliente = {
  id: number;
  nombre: string;
  apellido: string;
};

type Contrato = {
  id: number;
  clienteId: number;
  vehiculoId: number;
  nombreCliente: string;
  apellidoCliente: string;
  fechaInicio: string;
  estado: string;
};

type Foto = {
  id: number;
  nombre: string;
  url: string;
};

type MultaDano = {
  id: number;
  vehiculoId: number;
  vehiculo: string;
  anio: number;
  placa: string | null;
  clienteId: number | null;
  cliente: string | null;
  contratoId: number | null;
  tipo: "multa" | "dano";
  fecha: string;
  descripcion: string;
  monto: number;
  estado: "pendiente" | "pagado";
  fechaPago: string | null;
  fotos: Foto[];
};

type RespuestaMultasDanos = {
  registros: MultaDano[];
  total: number;
  paginas: number;
  resumen: {
    montoTotal: number;
    pendiente: number;
    pagado: number;
  };
};

type DatosEdicion = {
  vehiculoId: string;
  clienteId: string;
  nombreClienteManual: string;
  contratoId: string;
  tipo: "multa" | "dano";
  fecha: string;
  descripcion: string;
  monto: string;
  estado: "pendiente" | "pagado";
  fechaPago: string;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});
const LIMITE_FOTOS = 6;
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;
const FORMATOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

function fechaLocalHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

async function leerError(respuesta: Response, mensaje: string) {
  if (respuesta.ok) return;
  const detalle = (await respuesta.json()) as { error?: string };
  throw new Error(detalle.error ?? mensaje);
}

export default function MultasDanosAdminPage() {
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [registros, setRegistros] = useState<MultaDano[]>([]);
  const [resumen, setResumen] = useState<RespuestaMultasDanos["resumen"]>({
    montoTotal: 0,
    pendiente: 0,
    pagado: 0,
  });
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtroVehiculo, setFiltroVehiculo] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [vehiculoId, setVehiculoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [nombreClienteManual, setNombreClienteManual] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [tipo, setTipo] = useState<"multa" | "dano">("multa");
  const [fecha, setFecha] = useState(fechaLocalHoy);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "pagado">("pendiente");
  const [fechaPago, setFechaPago] = useState(fechaLocalHoy);
  const [fotos, setFotos] = useState<File[]>([]);
  const [registroEditando, setRegistroEditando] = useState<MultaDano | null>(
    null
  );
  const [datosEdicion, setDatosEdicion] = useState<DatosEdicion | null>(null);
  const [fotosEdicion, setFotosEdicion] = useState<File[]>([]);
  const [fotosEliminarIds, setFotosEliminarIds] = useState<number[]>([]);
  const [registroVisualizado, setRegistroVisualizado] =
    useState<MultaDano | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [recargar, setRecargar] = useState(0);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarOpciones() {
      try {
        const [respuestaVehiculos, respuestaClientes, respuestaContratos] =
          await Promise.all([
            fetch("/api/vehiculos?administracion=true", {
              cache: "no-store",
            }),
            fetch("/api/clientes", { cache: "no-store" }),
            fetch("/api/contratos", { cache: "no-store" }),
          ]);
        await Promise.all([
          leerError(respuestaVehiculos, "No se pudieron cargar los vehículos."),
          leerError(respuestaClientes, "No se pudieron cargar los clientes."),
          leerError(respuestaContratos, "No se pudieron cargar los contratos."),
        ]);
        const [datosVehiculos, datosClientes, datosContratos] =
          (await Promise.all([
            respuestaVehiculos.json(),
            respuestaClientes.json(),
            respuestaContratos.json(),
          ])) as [Vehiculo[], Cliente[], Contrato[]];
        if (cancelado) return;
        setVehiculos(datosVehiculos);
        setClientes(datosClientes);
        setContratos(datosContratos);
      } catch (errorCarga) {
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar las opciones."
          );
        }
      } finally {
        if (!cancelado) setCargandoOpciones(false);
      }
    }

    void cargarOpciones();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargarRegistros() {
      setCargando(true);
      try {
        const parametros = new URLSearchParams({
          pagina: String(pagina),
          limite: "20",
          vehiculoId: filtroVehiculo,
          tipo: filtroTipo,
          estado: filtroEstado,
        });
        const respuesta = await fetch(
          `/api/multas-danos?${parametros.toString()}`,
          { cache: "no-store" }
        );
        await leerError(respuesta, "No se pudieron cargar los registros.");
        const datos = (await respuesta.json()) as RespuestaMultasDanos;
        if (cancelado) return;
        setRegistros(datos.registros);
        setResumen(datos.resumen);
        setTotal(datos.total);
        setPaginas(datos.paginas);
      } catch (errorCarga) {
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "Ocurrió un error al cargar los registros."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarRegistros();
    return () => {
      cancelado = true;
    };
  }, [pagina, filtroVehiculo, filtroTipo, filtroEstado, recargar]);

  function cambiarFiltro(
    establecer: (valor: string) => void,
    valor: string
  ) {
    establecer(valor);
    setPagina(1);
    setError("");
  }

  function seleccionarContrato(valor: string) {
    setContratoId(valor);
    if (!valor) return;
    const contrato = contratos.find((opcion) => String(opcion.id) === valor);
    if (!contrato) return;
    setVehiculoId(String(contrato.vehiculoId));
    setClienteId(String(contrato.clienteId));
    setNombreClienteManual("");
  }

  function seleccionarFotos(archivos: FileList | null) {
    const seleccionadas = Array.from(archivos ?? []);
    if (seleccionadas.length > LIMITE_FOTOS) {
      setError(`Puedes adjuntar hasta ${LIMITE_FOTOS} fotos.`);
      setFotos([]);
      if (inputFotosRef.current) inputFotosRef.current.value = "";
      return;
    }
    const invalida = seleccionadas.find(
      (archivo) =>
        !FORMATOS_FOTO.includes(archivo.type) ||
        archivo.size > TAMANO_MAXIMO_FOTO
    );
    if (invalida) {
      setError(
        "Cada foto debe ser JPG, PNG o WEBP y no superar los 5 MB."
      );
      setFotos([]);
      if (inputFotosRef.current) inputFotosRef.current.value = "";
      return;
    }
    setError("");
    setFotos(seleccionadas);
  }

  async function guardarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    try {
      const formulario = new FormData();
      formulario.append(
        "datos",
        JSON.stringify({
          vehiculoId: Number(vehiculoId),
          clienteId: clienteId ? Number(clienteId) : null,
          nombreClienteManual,
          contratoId: contratoId ? Number(contratoId) : null,
          tipo,
          fecha,
          descripcion,
          monto: Number(monto),
          estado,
          fechaPago: estado === "pagado" ? fechaPago : null,
        })
      );
      for (const foto of fotos) formulario.append("fotos", foto);

      const respuesta = await fetch("/api/multas-danos", {
        method: "POST",
        body: formulario,
      });
      await leerError(respuesta, "No se pudo guardar el registro.");

      setDescripcion("");
      setMonto("");
      setClienteId("");
      setNombreClienteManual("");
      setContratoId("");
      setTipo("multa");
      setFecha(fechaLocalHoy());
      setFechaPago(fechaLocalHoy());
      setEstado("pendiente");
      setFotos([]);
      if (inputFotosRef.current) inputFotosRef.current.value = "";
      setMensaje("El registro se guardó correctamente.");
      setPagina(1);
      setRecargar((valor) => valor + 1);
    } catch (errorGuardado) {
      console.error("Error al registrar multa o daño:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "Ocurrió un error al guardar el registro."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(registro: MultaDano) {
    const nuevoEstado =
      registro.estado === "pagado" ? "pendiente" : "pagado";
    setError("");
    setMensaje("");
    setActualizandoId(registro.id);

    try {
      const respuesta = await fetch(`/api/multas-danos/${registro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      await leerError(respuesta, "No se pudo actualizar el estado.");
      setMensaje(
        nuevoEstado === "pagado"
          ? "El registro quedó marcado como pagado."
          : "El registro volvió a estar pendiente."
      );
      setRecargar((valor) => valor + 1);
    } catch (errorEstado) {
      console.error("Error al actualizar el estado del registro:", errorEstado);
      setError(
        errorEstado instanceof Error
          ? errorEstado.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setActualizandoId(null);
    }
  }

  function abrirEdicion(registro: MultaDano) {
    setError("");
    setMensaje("");
    setRegistroEditando(registro);
    setDatosEdicion({
      vehiculoId: String(registro.vehiculoId),
      clienteId: registro.clienteId ? String(registro.clienteId) : "",
      nombreClienteManual:
        registro.clienteId || registro.contratoId ? "" : registro.cliente ?? "",
      contratoId: registro.contratoId ? String(registro.contratoId) : "",
      tipo: registro.tipo,
      fecha: registro.fecha,
      descripcion: registro.descripcion,
      monto: String(registro.monto),
      estado: registro.estado,
      fechaPago: registro.fechaPago ?? fechaLocalHoy(),
    });
    setFotosEdicion([]);
    setFotosEliminarIds([]);
  }

  function cambiarDatoEdicion<K extends keyof DatosEdicion>(
    campo: K,
    valor: DatosEdicion[K]
  ) {
    setDatosEdicion((actual) =>
      actual ? { ...actual, [campo]: valor } : actual
    );
  }

  function seleccionarFotosEdicion(archivos: FileList | null) {
    const seleccionadas = Array.from(archivos ?? []);
    const cantidadExistente =
      (registroEditando?.fotos.length ?? 0) - fotosEliminarIds.length;
    if (cantidadExistente + seleccionadas.length > LIMITE_FOTOS) {
      setError(
        `El registro admite hasta ${LIMITE_FOTOS} fotos en total; ya tiene ${cantidadExistente}.`
      );
      setFotosEdicion([]);
      return;
    }
    if (
      seleccionadas.some(
        (archivo) =>
          !FORMATOS_FOTO.includes(archivo.type) ||
          archivo.size > TAMANO_MAXIMO_FOTO
      )
    ) {
      setError(
        "Cada foto debe ser JPG, PNG o WEBP y no superar los 5 MB."
      );
      setFotosEdicion([]);
      return;
    }
    setError("");
    setFotosEdicion(seleccionadas);
  }

  async function guardarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!registroEditando || !datosEdicion) return;

    setError("");
    setMensaje("");
    setGuardandoEdicion(true);
    try {
      const formulario = new FormData();
      formulario.append(
        "fotosEliminarIds",
        JSON.stringify(fotosEliminarIds)
      );
      formulario.append(
        "datos",
        JSON.stringify({
          vehiculoId: Number(datosEdicion.vehiculoId),
          clienteId: datosEdicion.clienteId
            ? Number(datosEdicion.clienteId)
            : null,
          nombreClienteManual: datosEdicion.nombreClienteManual,
          contratoId: datosEdicion.contratoId
            ? Number(datosEdicion.contratoId)
            : null,
          tipo: datosEdicion.tipo,
          fecha: datosEdicion.fecha,
          descripcion: datosEdicion.descripcion,
          monto: Number(datosEdicion.monto),
          estado: datosEdicion.estado,
          fechaPago:
            datosEdicion.estado === "pagado" ? datosEdicion.fechaPago : null,
        })
      );
      for (const foto of fotosEdicion) formulario.append("fotos", foto);

      const respuesta = await fetch(
        `/api/multas-danos/${registroEditando.id}`,
        { method: "PUT", body: formulario }
      );
      await leerError(respuesta, "No se pudo actualizar el registro.");
      const resultado = (await respuesta.json()) as {
        mensaje: string;
        advertencia: string | null;
      };

      setRegistroEditando(null);
      setDatosEdicion(null);
      setFotosEdicion([]);
      setFotosEliminarIds([]);
      setMensaje(resultado.advertencia ?? resultado.mensaje);
      setRecargar((valor) => valor + 1);
    } catch (errorEdicion) {
      console.error("Error al editar multa o daño:", errorEdicion);
      setError(
        errorEdicion instanceof Error
          ? errorEdicion.message
          : "No se pudo actualizar el registro."
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function eliminarRegistro(registro: MultaDano) {
    if (eliminandoId !== null) return;
    if (
      !window.confirm(
        `¿Eliminar el registro de ${registro.tipo === "multa" ? "multa" : "daño"} del vehículo ${registro.vehiculo}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");
    setEliminandoId(registro.id);
    try {
      const respuesta = await fetch(`/api/multas-danos/${registro.id}`, {
        method: "DELETE",
      });
      await leerError(respuesta, "No se pudo eliminar el registro.");
      const resultado = (await respuesta.json()) as {
        mensaje: string;
        advertencia: string | null;
      };
      setMensaje(resultado.advertencia ?? resultado.mensaje);
      if (registroVisualizado?.id === registro.id) {
        setRegistroVisualizado(null);
      }
      setRecargar((valor) => valor + 1);
    } catch (errorEliminacion) {
      console.error("Error al eliminar multa o daño:", errorEliminacion);
      setError(
        errorEliminacion instanceof Error
          ? errorEliminacion.message
          : "No se pudo eliminar el registro."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  const contratosDelVehiculo = contratos.filter(
    (contrato) => String(contrato.vehiculoId) === vehiculoId
  );
  const contratosEdicion = contratos.filter(
    (contrato) => String(contrato.vehiculoId) === datosEdicion?.vehiculoId
  );
  const maximoPaginas = Math.max(1, paginas);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      <AdminPageHeader
        title="Multas y daños"
        description="Registra incidentes de la flota, adjunta evidencia y controla los montos pendientes o pagados por el cliente."
      />

      {(error || mensaje) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-xl border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {error || mensaje}
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total registrado",
            monto: resumen.montoTotal,
            icono: AlertTriangle,
            color: "text-gray-700",
          },
          {
            label: "Pendiente de pago",
            monto: resumen.pendiente,
            icono: Clock3,
            color: "text-amber-700",
          },
          {
            label: "Pagado",
            monto: resumen.pagado,
            icono: CheckCircle2,
            color: "text-green-700",
          },
        ].map(({ label, monto: montoResumen, icono: Icono, color }) => (
          <article
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <Icono size={19} className={color} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-gray-950 dark:text-white">
              {FORMATO_DOP.format(montoResumen)}
            </p>
          </article>
        ))}
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629] sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#D4202C]">
            <AlertTriangle size={21} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">
              Registrar multa o daño
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              El monto es lo que se cobrará al cliente; los valores se guardan
              en pesos dominicanos (DOP).
            </p>
          </div>
        </div>

        {vehiculos.length === 0 && !cargandoOpciones ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            No hay vehículos para seleccionar.
          </p>
        ) : (
          <form
            onSubmit={guardarRegistro}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Vehículo
              <select
                required
                value={vehiculoId}
                onChange={(evento) => {
                  setVehiculoId(evento.target.value);
                  setContratoId("");
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="">Selecciona un vehículo</option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) ·{" "}
                    {vehiculo.placa || "Sin placa"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tipo
              <select
                value={tipo}
                onChange={(evento) =>
                  setTipo(evento.target.value as "multa" | "dano")
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="multa">Multa</option>
                <option value="dano">Daño</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Fecha del incidente
              <input
                required
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Monto a cobrar (DOP)
              <input
                required
                min="0.01"
                max="9999999999.99"
                step="0.01"
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Estado del pago
              <select
                value={estado}
                onChange={(evento) => {
                  const nuevoEstado = evento.target.value as
                    | "pendiente"
                    | "pagado";
                  setEstado(nuevoEstado);
                  if (nuevoEstado === "pagado" && !fechaPago) {
                    setFechaPago(fechaLocalHoy());
                  }
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </label>

            {estado === "pagado" && (
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fecha de pago
                <input
                  required
                  type="date"
                  value={fechaPago}
                  onChange={(evento) => setFechaPago(evento.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
                />
              </label>
            )}

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cliente registrado (opcional)
              <select
                value={clienteId}
                onChange={(evento) => {
                  setClienteId(evento.target.value);
                  setNombreClienteManual("");
                  setContratoId("");
                }}
                disabled={Boolean(nombreClienteManual)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 disabled:bg-gray-100 dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="">Sin cliente registrado</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} {cliente.apellido}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nombre manual (si no está registrado)
              <input
                maxLength={200}
                value={nombreClienteManual}
                onChange={(evento) => {
                  setNombreClienteManual(evento.target.value);
                  if (evento.target.value) {
                    setClienteId("");
                    setContratoId("");
                  }
                }}
                placeholder="Nombre y apellido"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Contrato relacionado (opcional)
              <select
                value={contratoId}
                onChange={(evento) => seleccionarContrato(evento.target.value)}
                disabled={
                  !vehiculoId ||
                  contratosDelVehiculo.length === 0 ||
                  Boolean(nombreClienteManual)
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 disabled:bg-gray-100 dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="">Sin contrato relacionado</option>
                {contratosDelVehiculo.map((contrato) => (
                  <option key={contrato.id} value={contrato.id}>
                    #{contrato.id} · {contrato.nombreCliente}{" "}
                    {contrato.apellidoCliente} · {contrato.fechaInicio}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2 xl:col-span-3">
              Descripción
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                placeholder="Describe la multa o los daños observados"
                className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20 dark:border-gray-600 dark:bg-[#171c1f]"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2 xl:col-span-3">
              Fotos de evidencia (opcional)
              <span className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-[#171c1f]">
                <ImagePlus size={18} className="text-gray-500" />
                <input
                  ref={inputFotosRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(evento) => seleccionarFotos(evento.target.files)}
                  className="min-w-0 flex-1 text-xs font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#D4202C]"
                />
                <span className="w-full text-xs font-normal text-gray-500">
                  Hasta {LIMITE_FOTOS} imágenes JPG, PNG o WEBP, máximo 5 MB
                  cada una.
                  {fotos.length > 0
                    ? ` Seleccionadas: ${fotos.map((foto) => foto.name).join(", ")}`
                    : ""}
                </span>
              </span>
            </label>

            <div className="flex items-end sm:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={guardando || cargandoOpciones || vehiculos.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
                {guardando ? "Guardando registro y fotos..." : "Guardar registro"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#202629]">
        <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                Historial de multas y daños
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {total} {total === 1 ? "registro" : "registros"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
              Vehículo
              <select
                value={filtroVehiculo}
                onChange={(evento) =>
                  cambiarFiltro(setFiltroVehiculo, evento.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="todos">Todos los vehículos</option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.marca} {vehiculo.modelo} ·{" "}
                    {vehiculo.placa || "Sin placa"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
              Tipo
              <select
                value={filtroTipo}
                onChange={(evento) =>
                  cambiarFiltro(setFiltroTipo, evento.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="todos">Multas y daños</option>
                <option value="multa">Multas</option>
                <option value="dano">Daños</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
              Estado
              <select
                value={filtroEstado}
                onChange={(evento) =>
                  cambiarFiltro(setFiltroEstado, evento.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-gray-600 dark:bg-[#171c1f]"
              >
                <option value="todos">Pendientes y pagados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </label>
          </div>
        </div>

        {cargando ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Cargando registros...
          </p>
        ) : registros.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No hay registros con esos filtros.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {registros.map((registro) => (
              <article
                key={registro.id}
                className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        registro.tipo === "multa"
                          ? "bg-orange-50 text-orange-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {registro.tipo === "multa" ? "Multa" : "Daño"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        registro.estado === "pagado"
                          ? "bg-green-50 text-green-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {registro.estado === "pagado" ? "Pagado" : "Pendiente"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFecha(registro.fecha)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold text-gray-950 dark:text-white">
                    {registro.vehiculo} ({registro.anio}) ·{" "}
                    {registro.placa || "Sin placa"}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                    {registro.descripcion}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {registro.cliente && (
                      <span>Cliente: {registro.cliente}</span>
                    )}
                    {registro.contratoId && (
                      <span>Contrato #{registro.contratoId}</span>
                    )}
                    {registro.fechaPago && (
                      <span>Pagado el {formatFecha(registro.fechaPago)}</span>
                    )}
                  </div>
                  {registro.fotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {registro.fotos.map((foto, indice) => (
                        <a
                          key={foto.id}
                          href={foto.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#D4202C] hover:bg-red-50 dark:border-gray-600"
                        >
                          Ver evidencia {indice + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                  <p className="text-lg font-extrabold text-gray-950 dark:text-white">
                    {FORMATO_DOP.format(registro.monto)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRegistroVisualizado(registro)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      <Eye size={15} />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirEdicion(registro)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      <Pencil size={15} />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={eliminandoId === registro.id}
                      onClick={() => void eliminarRegistro(registro)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300"
                    >
                      {eliminandoId === registro.id ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Eliminar
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={actualizandoId === registro.id}
                    onClick={() => void cambiarEstado(registro)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    {actualizandoId === registro.id ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : registro.estado === "pagado" ? (
                      <RotateCcw size={15} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    {registro.estado === "pagado"
                      ? "Volver a pendiente"
                      : "Marcar pagado"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <p className="text-xs text-gray-500">
            Página {Math.min(pagina, maximoPaginas)} de {maximoPaginas}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina <= 1 || cargando}
              onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
              aria-label="Página anterior"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              disabled={pagina >= maximoPaginas || cargando}
              onClick={() => setPagina((valor) => valor + 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
              aria-label="Página siguiente"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {registroVisualizado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setRegistroVisualizado(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reporte-multa-dano-titulo"
            className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-[#202629] sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#D4202C]">
                  Reporte · Registro #{registroVisualizado.id}
                </p>
                <h2
                  id="reporte-multa-dano-titulo"
                  className="mt-1 text-2xl font-extrabold text-gray-950 dark:text-white"
                >
                  {registroVisualizado.tipo === "multa" ? "Multa" : "Daño"} del
                  vehículo
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar reporte"
                onClick={() => setRegistroVisualizado(null)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-[#171c1f] sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Vehículo
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {registroVisualizado.vehiculo} ({registroVisualizado.anio}) ·{" "}
                  {registroVisualizado.placa || "Sin placa"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Cliente
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {registroVisualizado.cliente || "No indicado"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Fecha del incidente
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {formatFecha(registroVisualizado.fecha)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Estado de pago
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {registroVisualizado.estado === "pagado"
                    ? `Pagado${registroVisualizado.fechaPago ? ` el ${formatFecha(registroVisualizado.fechaPago)}` : ""}`
                    : "Pendiente"}
                </p>
              </div>
              {registroVisualizado.contratoId && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Contrato relacionado
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    #{registroVisualizado.contratoId}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Monto a cobrar
                </p>
                <p className="mt-1 text-lg font-extrabold text-gray-950 dark:text-white">
                  {FORMATO_DOP.format(registroVisualizado.monto)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase text-gray-500">
                  Descripción
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                  {registroVisualizado.descripcion}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-gray-950 dark:text-white">
                Fotos de evidencia ({registroVisualizado.fotos.length})
              </h3>
              {registroVisualizado.fotos.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-600">
                  Este registro no tiene fotos.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {registroVisualizado.fotos.map((foto) => (
                    <a
                      key={foto.id}
                      href={foto.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto.url}
                        alt={foto.nombre || "Foto de evidencia"}
                        className="h-56 w-full object-cover transition group-hover:scale-[1.02]"
                      />
                      <span className="block truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {foto.nombre}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setRegistroVisualizado(null)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
              >
                Cerrar reporte
              </button>
            </div>
          </section>
        </div>
      )}

      {registroEditando && datosEdicion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !guardandoEdicion) {
              setRegistroEditando(null);
              setDatosEdicion(null);
              setFotosEdicion([]);
              setFotosEliminarIds([]);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-multa-dano-titulo"
            className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-[#202629] sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#D4202C]">
                  Historial de multas y daños
                </p>
                <h2
                  id="editar-multa-dano-titulo"
                  className="mt-1 text-2xl font-extrabold text-gray-950 dark:text-white"
                >
                  Editar registro #{registroEditando.id}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar edición"
                disabled={guardandoEdicion}
                onClick={() => {
                  setRegistroEditando(null);
                  setDatosEdicion(null);
                  setFotosEdicion([]);
                  setFotosEliminarIds([]);
                }}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={guardarEdicion}
              className="grid gap-4 sm:grid-cols-2"
            >
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
                >
                  {error}
                </p>
              )}
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Vehículo
                <select
                  required
                  value={datosEdicion.vehiculoId}
                  onChange={(evento) => {
                    cambiarDatoEdicion("vehiculoId", evento.target.value);
                    cambiarDatoEdicion("contratoId", "");
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                >
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) ·{" "}
                      {vehiculo.placa || "Sin placa"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tipo
                <select
                  value={datosEdicion.tipo}
                  onChange={(evento) =>
                    cambiarDatoEdicion(
                      "tipo",
                      evento.target.value as "multa" | "dano"
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                >
                  <option value="multa">Multa</option>
                  <option value="dano">Daño</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fecha del incidente
                <input
                  required
                  type="date"
                  value={datosEdicion.fecha}
                  onChange={(evento) =>
                    cambiarDatoEdicion("fecha", evento.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Monto a cobrar (DOP)
                <input
                  required
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  type="number"
                  value={datosEdicion.monto}
                  onChange={(evento) =>
                    cambiarDatoEdicion("monto", evento.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cliente registrado (opcional)
                <select
                  value={datosEdicion.clienteId}
                  disabled={Boolean(datosEdicion.nombreClienteManual)}
                  onChange={(evento) => {
                    cambiarDatoEdicion("clienteId", evento.target.value);
                    cambiarDatoEdicion("nombreClienteManual", "");
                    cambiarDatoEdicion("contratoId", "");
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal disabled:bg-gray-100 dark:border-gray-600 dark:bg-[#171c1f]"
                >
                  <option value="">Sin cliente registrado</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellido}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nombre manual
                <input
                  maxLength={200}
                  value={datosEdicion.nombreClienteManual}
                  onChange={(evento) => {
                    cambiarDatoEdicion(
                      "nombreClienteManual",
                      evento.target.value
                    );
                    if (evento.target.value) {
                      cambiarDatoEdicion("clienteId", "");
                      cambiarDatoEdicion("contratoId", "");
                    }
                  }}
                  placeholder="Nombre del cliente no registrado"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Contrato relacionado (opcional)
                <select
                  value={datosEdicion.contratoId}
                  disabled={
                    contratosEdicion.length === 0 ||
                    Boolean(datosEdicion.nombreClienteManual)
                  }
                  onChange={(evento) => {
                    const contratoIdNuevo = evento.target.value;
                    cambiarDatoEdicion("contratoId", contratoIdNuevo);
                    const contrato = contratosEdicion.find(
                      (opcion) => String(opcion.id) === contratoIdNuevo
                    );
                    if (contrato) {
                      cambiarDatoEdicion(
                        "clienteId",
                        String(contrato.clienteId)
                      );
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal disabled:bg-gray-100 dark:border-gray-600 dark:bg-[#171c1f]"
                >
                  <option value="">Sin contrato relacionado</option>
                  {contratosEdicion.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      #{contrato.id} · {contrato.nombreCliente}{" "}
                      {contrato.apellidoCliente} · {contrato.fechaInicio}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Estado del pago
                <select
                  value={datosEdicion.estado}
                  onChange={(evento) => {
                    const nuevoEstado = evento.target.value as
                      | "pendiente"
                      | "pagado";
                    cambiarDatoEdicion("estado", nuevoEstado);
                    if (nuevoEstado === "pagado" && !datosEdicion.fechaPago) {
                      cambiarDatoEdicion("fechaPago", fechaLocalHoy());
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
              </label>
              {datosEdicion.estado === "pagado" && (
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Fecha de pago
                  <input
                    required
                    type="date"
                    value={datosEdicion.fechaPago}
                    onChange={(evento) =>
                      cambiarDatoEdicion("fechaPago", evento.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                  />
                </label>
              )}
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2">
                Descripción
                <textarea
                  required
                  maxLength={1000}
                  rows={3}
                  value={datosEdicion.descripcion}
                  onChange={(evento) =>
                    cambiarDatoEdicion("descripcion", evento.target.value)
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Fotos actuales ({registroEditando.fotos.length})
                </p>
                {registroEditando.fotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {registroEditando.fotos.map((foto, indice) => {
                      const seleccionada = fotosEliminarIds.includes(foto.id);
                      return (
                        <div
                          key={foto.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                            seleccionada
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <a
                            href={foto.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#D4202C]"
                          >
                            Ver foto {indice + 1}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setFotosEliminarIds((actual) =>
                                seleccionada
                                  ? actual.filter((id) => id !== foto.id)
                                  : [...actual, foto.id]
                              )
                            }
                            className="text-xs font-bold text-red-700"
                          >
                            {seleccionada ? "Conservar" : "Quitar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <label className="mt-4 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Añadir fotos
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={
                      LIMITE_FOTOS -
                        registroEditando.fotos.length +
                        fotosEliminarIds.length ===
                      0
                    }
                    onChange={(evento) =>
                      seleccionarFotosEdicion(evento.target.files)
                    }
                    className="mt-2 block w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-xs font-normal dark:border-gray-600 dark:bg-[#171c1f]"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    Hasta{" "}
                    {LIMITE_FOTOS -
                      registroEditando.fotos.length +
                      fotosEliminarIds.length}{" "}
                    foto(s) adicionales, máximo 5 MB cada una.
                    {fotosEdicion.length > 0 &&
                      ` Seleccionadas: ${fotosEdicion.map((foto) => foto.name).join(", ")}`}
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  disabled={guardandoEdicion}
                  onClick={() => {
                    setRegistroEditando(null);
                    setDatosEdicion(null);
                    setFotosEdicion([]);
                    setFotosEliminarIds([]);
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {guardandoEdicion ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
