
import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";

export const runtime = "nodejs";

const ESTADOS_VEHICULO = [
  "disponible",
  "reservado",
  "rentado",
  "mantenimiento",
  "pintura",
] as const;

// GET /api/vehiculos
export async function GET(request: Request) {
  try {
    const autorizado = await isAdminAuthenticated();
    const mostrarTodos =
      autorizado &&
      new URL(request.url).searchParams.get("administracion") === "true";
    const pool = await getConnection();

    const result = await pool.query(`
      SELECT
        id,
        marca,
        modelo,
        anio,
        ${mostrarTodos ? "placa," : ""}
        color,
        tiposeguro AS "tipoSeguro",
        preciodia AS "precioDia",
        imagen,
        descripcion,
        disponible,
        estado${
          mostrarTodos
            ? `,
        kilometraje AS "ultimoKilometraje"`
            : ""
        }
      FROM vehiculos
      WHERE $1::boolean OR (
        estado = 'disponible'
        AND NOT EXISTS (
          SELECT 1
          FROM public.contratos AS c
          WHERE c.vehiculo_id = vehiculos.id
            AND c.estado IN ('pendiente_firma', 'activo')
        )
      )
      ORDER BY id DESC
    `, [mostrarTodos]);

    const vehiculos = result.rows.map((vehiculo: Record<string, unknown>) => {
      const {
        id,
        anio,
        precioDia,
        descripcion,
        imagen,
        disponible,
        estado,
        ultimoKilometraje,
        ...datosVehiculo
      } = vehiculo;
      const estadoValido =
        typeof estado === "string" &&
        ESTADOS_VEHICULO.includes(estado as (typeof ESTADOS_VEHICULO)[number])
          ? estado
          : disponible === true
            ? "disponible"
            : "rentado";

      return {
        ...datosVehiculo,
        id: Number(id),
        anio: Number(anio),
        precioDia: Number(precioDia ?? 0),
        descripcion:
          typeof descripcion === "string" && descripcion.trim() !== ""
            ? descripcion.trim()
            : null,
        imagen:
          typeof imagen === "string" && imagen.trim() !== "" ? imagen : null,
        disponible:
          estadoValido === "disponible",
        estado: estadoValido,
        ...(mostrarTodos
          ? {
              ultimoKilometraje:
                ultimoKilometraje == null
                  ? null
                  : Number(ultimoKilometraje),
            }
          : {}),
      };
    });

    return NextResponse.json(vehiculos, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error al consultar vehículos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los vehículos." },
      { status: 500 }
    );
  }
}

// POST /api/vehiculos
export async function POST(request: Request) {
  try {
    // 1. Verificar la sesión del administrador.
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    // 2. Leer los datos recibidos.
    const body = await request.json();

    const {
      marca,
      modelo,
      anio,
      placa,
      color,
      tipoSeguro,
      precioDia,
      imagen,
      descripcion,
      disponible,
      estado,
      kilometraje,
    } = body ?? {};

    // 3. Validar los campos obligatorios.
    if (
      typeof marca !== "string" ||
      !marca.trim() ||
      typeof modelo !== "string" ||
      !modelo.trim() ||
      (placa != null && typeof placa !== "string") ||
      typeof color !== "string" ||
      !color.trim() ||
      typeof tipoSeguro !== "string" ||
      !tipoSeguro.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Completa correctamente la marca, el modelo, el color y el tipo de seguro.",
        },
        { status: 400 }
      );
    }

    const anioNumero = Number(anio);
    const precioNumero = Number(precioDia);

    if (
      !Number.isInteger(anioNumero) ||
      anioNumero < 1900 ||
      anioNumero > new Date().getFullYear() + 2
    ) {
      return NextResponse.json(
        { error: "El año del vehículo no es válido." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
      return NextResponse.json(
        { error: "El precio por día debe ser mayor que cero." },
        { status: 400 }
      );
    }

    if (
      (imagen != null && typeof imagen !== "string") ||
      (descripcion != null && typeof descripcion !== "string") ||
      (disponible != null && typeof disponible !== "boolean") ||
      (estado != null &&
        (typeof estado !== "string" ||
          estado === "reservado" ||
          !ESTADOS_VEHICULO.includes(
            estado as (typeof ESTADOS_VEHICULO)[number]
          ))) ||
      (kilometraje != null &&
        ((typeof kilometraje !== "number" &&
          typeof kilometraje !== "string") ||
          (typeof kilometraje === "string" && !kilometraje.trim()) ||
          !Number.isSafeInteger(Number(kilometraje)) ||
          Number(kilometraje) < 0 ||
          Number(kilometraje) > 2147483647))
    ) {
      return NextResponse.json(
        { error: "Hay campos con formatos incorrectos." },
        { status: 400 }
      );
    }

    // La descripción puede contener varias características separadas
    // por comas, punto y coma o saltos de línea.
    const descripcionLimpia =
      typeof descripcion === "string" && descripcion.trim()
        ? descripcion.trim()
        : null;

    const imagenLimpia =
      typeof imagen === "string" && imagen.trim()
        ? imagen.trim()
        : null;
    const estadoInicial =
      estado ??
      (disponible === false ? "rentado" : "disponible");

    // 4. Guardar el vehículo.
    const pool = await getConnection();

    const result = await pool.query(
      `
      INSERT INTO vehiculos (
        marca,
        modelo,
        anio,
        placa,
        color,
        tiposeguro,
        preciodia,
        imagen,
        descripcion,
        disponible,
        estado,
        kilometraje
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
        id,
        marca,
        modelo,
        anio,
        placa,
        color,
        tiposeguro AS "tipoSeguro",
        preciodia AS "precioDia",
        imagen,
        descripcion,
        disponible,
        estado,
        kilometraje AS "ultimoKilometraje"
      `,
      [
        marca.trim(),
        modelo.trim(),
        anioNumero,
        typeof placa === "string" ? placa.trim().toUpperCase() : "",
        color.trim(),
        tipoSeguro.trim(),
        precioNumero,
        imagenLimpia,
        descripcionLimpia,
        estadoInicial === "disponible",
        estadoInicial,
        kilometraje == null ? null : Number(kilometraje),
      ]
    );

    const vehiculo = result.rows[0];

    return NextResponse.json(
      {
        ...vehiculo,
        id: Number(vehiculo.id),
        anio: Number(vehiculo.anio),
        precioDia: Number(vehiculo.precioDia),
        descripcion: vehiculo.descripcion ?? null,
        imagen: vehiculo.imagen ?? null,
        disponible: vehiculo.estado === "disponible",
        estado: vehiculo.estado,
        ultimoKilometraje:
          vehiculo.ultimoKilometraje == null
            ? null
            : Number(vehiculo.ultimoKilometraje),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar vehículo:", error);

    return NextResponse.json(
      {
        error:
          "No se pudo registrar el vehículo. Verifica los datos e inténtalo nuevamente.",
      },
      { status: 500 }
    );
  }
}