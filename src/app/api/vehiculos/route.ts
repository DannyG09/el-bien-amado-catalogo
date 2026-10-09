
import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";

export const runtime = "nodejs";

// GET /api/vehiculos
export async function GET() {
  try {
    const pool = await getConnection();

    const result = await pool.query(`
      SELECT
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
        disponible
      FROM vehiculos
      ORDER BY id DESC
    `);

    const vehiculos = result.rows.map(
      (vehiculo: Record<string, unknown>) => ({
        ...vehiculo,
        id: Number(vehiculo.id),
        anio: Number(vehiculo.anio),
        precioDia: Number(vehiculo.precioDia ?? 0),
        descripcion:
          typeof vehiculo.descripcion === "string" &&
          vehiculo.descripcion.trim() !== ""
            ? vehiculo.descripcion.trim()
            : null,
        imagen:
          typeof vehiculo.imagen === "string" &&
          vehiculo.imagen.trim() !== ""
            ? vehiculo.imagen
            : null,
        disponible:
          vehiculo.disponible === true ||
          vehiculo.disponible === 1 ||
          vehiculo.disponible === "true",
      })
    );

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
    } = body ?? {};

    // 3. Validar los campos obligatorios.
    if (
      typeof marca !== "string" ||
      !marca.trim() ||
      typeof modelo !== "string" ||
      !modelo.trim() ||
      typeof placa !== "string" ||
      !placa.trim() ||
      typeof color !== "string" ||
      !color.trim() ||
      typeof tipoSeguro !== "string" ||
      !tipoSeguro.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Completa correctamente la marca, el modelo, la placa, el color y el tipo de seguro.",
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
      (disponible != null && typeof disponible !== "boolean")
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
        disponible
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        disponible
      `,
      [
        marca.trim(),
        modelo.trim(),
        anioNumero,
        placa.trim(),
        color.trim(),
        tipoSeguro.trim(),
        precioNumero,
        imagenLimpia,
        descripcionLimpia,
        disponible ?? true,
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
        disponible: vehiculo.disponible === true,
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