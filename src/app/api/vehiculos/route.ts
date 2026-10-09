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

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al consultar vehículos:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener los vehículos",
      },
      {
        status: 500,
      }
    );
  }
}

// POST /api/vehiculos
export async function POST(request: Request) {
  try {
    // 1. Comprobar que exista una sesión válida de administrador
    const autorizado = await isAdminAuthenticated();

    if (!autorizado) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    // 2. Leer y validar los datos recibidos
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

    if (
      typeof marca !== "string" || !marca.trim() ||
      typeof modelo !== "string" || !modelo.trim() ||
      typeof placa !== "string" || !placa.trim() ||
      typeof color !== "string" || !color.trim() ||
      typeof tipoSeguro !== "string" || !tipoSeguro.trim()
    ) {
      return NextResponse.json(
        { error: "Completa correctamente los campos obligatorios." },
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

    if (
      !Number.isFinite(precioNumero) ||
      precioNumero <= 0
    ) {
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

    // 3. Guardar el vehículo en la base de datos
    const pool = await getConnection();

    const result = await pool.query(
      `
      INSERT INTO vehiculos (
        marca, modelo, anio, placa, color, tiposeguro,
        preciodia, imagen, descripcion, disponible
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id, marca, modelo, anio, placa, color,
        tiposeguro AS "tipoSeguro",
        preciodia AS "precioDia",
        imagen, descripcion, disponible
      `,
      [
        marca.trim(),
        modelo.trim(),
        anioNumero,
        placa.trim(),
        color.trim(),
        tipoSeguro.trim(),
        precioNumero,
        imagen || null,
        descripcion || null,
        disponible ?? true,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error al registrar vehículo:", error);

    return NextResponse.json(
      { error: "No se pudo registrar el vehículo. Verifica los datos e inténtalo nuevamente." },
      { status: 500 }
    );
  }
}