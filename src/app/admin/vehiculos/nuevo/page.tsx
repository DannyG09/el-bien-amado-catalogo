
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  subirFotoCloudinary,
  type FotoCloudinary,
} from "@/app/lib/uploadCloudinary";
import AdminPageHeader from "../../AdminPageHeader";

/*
  PALETA: negro, rojo #D4202C y blanco.
  LOGO: /public/logo.jpeg
*/

const inputClase =
  "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20";

const MAX_FOTOS = 8;
const MAX_TAMANO = 5 * 1024 * 1024;

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Seccion({
  numero,
  titulo,
}: {
  numero: number;
  titulo: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 md:col-span-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4202C] text-sm font-extrabold text-white">
        {numero}
      </span>

      <h2 className="text-lg font-extrabold text-gray-900">
        {titulo}
      </h2>

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
    descripcion: "",
    estado: "disponible",
  });

  const [fotosSeleccionadas, setFotosSeleccionadas] =
    useState<File[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const [marcasRegistradas, setMarcasRegistradas] = useState<string[]>([]);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarMarcas() {
      try {
        const respuesta = await fetch("/api/vehiculos", {
          cache: "no-store",
          signal: controlador.signal,
        });
        if (!respuesta.ok) throw new Error("No se pudieron consultar las marcas.");

        const datos: unknown = await respuesta.json();
        const lista: unknown = Array.isArray(datos)
          ? datos
          : datos && typeof datos === "object" && "vehiculos" in datos
            ? datos.vehiculos
            : [];

        if (!Array.isArray(lista)) return;
        const marcas = lista
          .map((v: unknown) =>
            v && typeof v === "object" && "marca" in v && typeof v.marca === "string"
              ? v.marca.trim().toLocaleUpperCase("es-DO")
              : ""
          )
          .filter(Boolean);
        setMarcasRegistradas([...new Set(marcas)].sort((a, b) => a.localeCompare(b, "es")));
      } catch (err) {
        if (!controlador.signal.aborted) console.error("Error cargando marcas:", err);
      }
    }

    void cargarMarcas();
    return () => controlador.abort();
  }, []);

  const marcaExiste = useMemo(
    () => marcasRegistradas.includes(formulario.marca.trim().toLocaleUpperCase("es-DO")),
    [marcasRegistradas, formulario.marca]
  );


  const CAMPOS_MAYUSCULAS = new Set(["marca", "modelo", "placa", "color", "descripcion"]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : CAMPOS_MAYUSCULAS.has(name)
            ? value.toLocaleUpperCase("es-DO")
            : value,
    }));
  };

  const handleSeleccionFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length) return;
    if (fotosSeleccionadas.length + archivos.length > MAX_FOTOS) {
      setError(`Puedes agregar hasta ${MAX_FOTOS} fotografías en total.`);
      return;
    }
    if (archivos.some((archivo) => archivo.size > MAX_TAMANO)) {
      setError("Cada fotografía debe pesar como máximo 5 MB.");
      return;
    }
    if (archivos.some((archivo) => !FORMATOS_PERMITIDOS.includes(archivo.type))) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    setFotosSeleccionadas((actuales) => [...actuales, ...archivos]);
    setError("");
  };

  function moverFoto(origen: number, destino: number) {
    if (origen === destino || origen < 0 || destino < 0 || destino >= fotosSeleccionadas.length) return;
    setFotosSeleccionadas((actuales) => {
      const ordenadas = [...actuales];
      const [foto] = ordenadas.splice(origen, 1);
      ordenadas.splice(destino, 0, foto);
      return ordenadas;
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fotosSeleccionadas.length > MAX_FOTOS) {
      setError(`Puedes seleccionar un máximo de ${MAX_FOTOS} fotos.`);
      return;
    }

    setGuardando(true);
    setSubiendoFotos(fotosSeleccionadas.length > 0);
    setError("");

    try {
      // 1. Subir las imágenes seleccionadas a Cloudinary.
      const fotosSubidas: FotoCloudinary[] = [];

      for (const archivo of fotosSeleccionadas) {
        const foto = await subirFotoCloudinary(archivo);
        fotosSubidas.push(foto);
      }

      // 2. La primera foto subida será la imagen principal.
      const imagenPrincipal = fotosSubidas[0]?.url || null;

      // 3. Registrar el vehículo en la base de datos.
      const respuesta = await fetch("/api/vehiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marca: formulario.marca.trim().toLocaleUpperCase("es-DO"),
          modelo: formulario.modelo.trim().toLocaleUpperCase("es-DO"),
          anio: Number(formulario.anio),
          placa: formulario.placa.trim().toUpperCase(),
          color: formulario.color.trim().toLocaleUpperCase("es-DO"),
          tipoSeguro: formulario.tipoSeguro,
          precioDia: Number(formulario.precioDia),
          imagen: imagenPrincipal,
          descripcion: formulario.descripcion.trim().toLocaleUpperCase("es-DO") || null,
          estado: formulario.estado,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo registrar el vehículo."
        );
      }

      // 4. Obtener el ID del vehículo recién creado.
      const vehiculoId = datos.id;

      if (fotosSubidas.length > 0) {
        if (
          vehiculoId === undefined ||
          vehiculoId === null ||
          !Number.isInteger(Number(vehiculoId))
        ) {
          throw new Error(
            "El vehículo se creó, pero la API no devolvió su ID. " +
              "Debemos revisar la respuesta de /api/vehiculos."
          );
        }

        // 5. Guardar las fotos relacionadas con ese vehículo.
        const respuestaFotos = await fetch("/api/vehiculo-fotos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehiculoId: Number(vehiculoId),
            fotos: fotosSubidas,
          }),
        });

        const datosFotos = await respuestaFotos.json();

        if (!respuestaFotos.ok) {
          throw new Error(
            "El vehículo se creó, pero no se pudieron guardar " +
              `sus fotografías: ${datosFotos.error || "error desconocido"}.`
          );
        }
      }

      alert("Vehículo registrado correctamente.");
      router.push("/admin/vehiculos");
      router.refresh();
    } catch (error) {
      console.error("Error registrando vehículo:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al registrar el vehículo."
      );
    } finally {
      setGuardando(false);
      setSubiendoFotos(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <AdminPageHeader
          title="Nuevo vehículo"
          description="Registra un vehículo en el catálogo y agrega sus fotografías."
        >
          <Link
            href="/admin/vehiculos"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Volver a vehículos
          </Link>
        </AdminPageHeader>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-[#D4202C]"
          >
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
                list="marcas-registradas"
                autoComplete="off"
                value={formulario.marca}
                onChange={handleChange}
                placeholder="ESCRIBE O SELECCIONA UNA MARCA"
                required
                className={`${inputClase} uppercase`}
              />
              <datalist id="marcas-registradas">
                {marcasRegistradas.map((marca) => (
                  <option key={marca} value={marca} />
                ))}
              </datalist>
              {formulario.marca.trim() && (
                <p className="mt-2 text-xs font-medium text-gray-500">
                  {marcaExiste
                    ? "Marca existente: se utilizará la registrada."
                    : "Marca nueva: se registrará al guardar el vehículo."}
                </p>
              )}
            </Campo>

            <Campo label="Modelo">
              <input
                type="text"
                name="modelo"
                value={formulario.modelo}
                onChange={handleChange}
                placeholder="Ej. Tucson"
                required
                className={`${inputClase} uppercase`}
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
                className={`${inputClase} uppercase`}
              />
            </Campo>

            <Campo label="Placa (opcional)">
              <input
                type="text"
                name="placa"
                value={formulario.placa}
                onChange={handleChange}
                placeholder="Ej. G123456"
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
                className={`${inputClase} uppercase`}
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

            {/* 2. PRECIO Y ESTADO */}
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
                  step="0.01"
                  required
                  className={`${inputClase} pl-14`}
                />
              </div>
            </Campo>

            <Campo label="Estado del vehículo">
              <select
                name="estado"
                value={formulario.estado}
                onChange={handleChange}
                className={inputClase}
              >
                <option value="disponible">Disponible</option>
                <option value="rentado">Rentado</option>
                <option value="mantenimiento">En mantenimiento</option>
                <option value="pintura">Taller de pintura</option>
              </select>
            </Campo>

            {/* 3. IMÁGENES */}
            <div className="mt-2 md:col-span-2">
              <Seccion numero={3} titulo="Fotografías y descripción" />
            </div>

            <Campo label="Fotografías del vehículo" className="md:col-span-2">
              <input
                ref={inputFotosRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleSeleccionFotos}
                className="hidden"
                disabled={guardando || fotosSeleccionadas.length >= MAX_FOTOS}
                aria-label="Agregar fotografías del vehículo"
              />
              <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="font-bold text-gray-900">Sube hasta 8 fotografías</p>
                <p className="mt-1 text-sm text-gray-500">JPG, PNG o WEBP · Máximo 5 MB por foto</p>
                <button
                  type="button"
                  onClick={() => inputFotosRef.current?.click()}
                  disabled={guardando || fotosSeleccionadas.length >= MAX_FOTOS}
                  className="mt-4 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white hover:bg-[#b81b26] disabled:opacity-40"
                >
                  Agregar fotografías ({fotosSeleccionadas.length}/{MAX_FOTOS})
                </button>
              </div>

              {fotosSeleccionadas.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-gray-700">
                    Arrastra las fotos para ordenarlas. La posición 1 será la portada.
                    También puedes usar las flechas para moverlas.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {fotosSeleccionadas.map((foto, indice) => (
                      <div
                        key={foto.name + "-" + foto.size + "-" + foto.lastModified + "-" + indice}
                        draggable={!guardando}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setArrastrando(indice);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (arrastrando !== null) moverFoto(arrastrando, indice);
                          setArrastrando(null);
                        }}
                        onDragEnd={() => setArrastrando(null)}
                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${arrastrando === indice ? "border-[#D4202C] opacity-50" : "border-gray-200"}`}
                      >
                        <div className="relative cursor-grab">
                          <FotoPrevia archivo={foto} />
                          <span className={`absolute left-2 top-2 rounded-lg px-2 py-1 text-xs font-bold text-white ${indice === 0 ? "bg-[#D4202C]" : "bg-black/75"}`}>
                            {indice === 0 ? "PORTADA" : `FOTO ${indice + 1}`}
                          </span>
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-gray-700" title={foto.name}>{foto.name}</p>
                          <p className="text-xs text-gray-400">{(foto.size / 1048576).toFixed(2)} MB</p>
                          <div className="mt-2 flex items-center justify-between gap-1">
                            <button type="button" disabled={guardando || indice === 0} onClick={() => moverFoto(indice, indice - 1)} aria-label="Mover foto a la izquierda" className="rounded-lg border px-2 py-1 text-sm disabled:opacity-30">←</button>
                            <button type="button" disabled={guardando || indice === 0} onClick={() => moverFoto(indice, 0)} className="text-[11px] font-bold text-[#D4202C] disabled:opacity-30">Portada</button>
                            <button type="button" disabled={guardando || indice === fotosSeleccionadas.length - 1} onClick={() => moverFoto(indice, indice + 1)} aria-label="Mover foto a la derecha" className="rounded-lg border px-2 py-1 text-sm disabled:opacity-30">→</button>
                          </div>
                          <button type="button" disabled={guardando} onClick={() => setFotosSeleccionadas((actuales) => actuales.filter((_, i) => i !== indice))} className="mt-2 w-full rounded-lg bg-red-50 py-1.5 text-xs font-semibold text-[#D4202C] hover:bg-red-100 disabled:opacity-40">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" disabled={guardando} onClick={() => setFotosSeleccionadas([])} className="mt-3 text-sm font-semibold text-[#D4202C] hover:underline disabled:opacity-40">Quitar todas las fotos</button>
                </div>
              )}
            </Campo>

            {/* 4. DESCRIPCIÓN */}
            <Campo label="Descripción" className="md:col-span-2">
              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={handleChange}
                placeholder="Describe brevemente el vehículo..."
                rows={4}
                className={`${inputClase} resize-none uppercase`}
              />
            </Campo>
          </div>

          {/* BOTONES */}
          <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 px-6 py-5 sm:flex-row sm:justify-end md:px-8">
            <button
              type="button"
              onClick={() => router.push("/admin/vehiculos")}
              disabled={guardando}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#D4202C] px-8 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? subiendoFotos
                  ? "Subiendo fotos..."
                  : "Guardando..."
                : "Guardar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
// Libera las URLs temporales para evitar fugas de memoria.
function FotoPrevia({ archivo }: { archivo: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const temporal = URL.createObjectURL(archivo);
    setUrl(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [archivo]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Vista previa de ${archivo.name}`} className="h-32 w-full object-cover" />
  ) : <div className="h-32 bg-gray-100" />;
}
