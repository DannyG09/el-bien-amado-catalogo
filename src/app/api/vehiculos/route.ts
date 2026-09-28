import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";

export const runtime = "nodejs";

// ==========================================
// GET - Obtener todos los vehículos
// ==========================================

export async function GET() {
  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .query(`
        SELECT
          id,
          marca,
          modelo,
          anio,
          placa,
          color,
          tipoSeguro,
          precioDia,
          imagen,
          descripcion,
          disponible
        FROM Vehiculos
        ORDER BY id DESC
      `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error al consultar vehículos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los vehículos" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST - Registrar un vehículo
// ==========================================

export async function POST(request: Request) {
  try {
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
    } = body;

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("marca", marca)
      .input("modelo", modelo)
      .input("anio", anio)
      .input("placa", placa)
      .input("color", color)
      .input("tipoSeguro", tipoSeguro)
      .input("precioDia", precioDia)
      .input("imagen", imagen)
      .input("descripcion", descripcion)
      .input("disponible", disponible)
      .query(`
        INSERT INTO Vehiculos (
          marca,
          modelo,
          anio,
          placa,
          color,
          tipoSeguro,
          precioDia,
          imagen,
          descripcion,
          disponible
        )
        OUTPUT INSERTED.*
        VALUES (
          @marca,
          @modelo,
          @anio,
          @placa,
          @color,
          @tipoSeguro,
          @precioDia,
          @imagen,
          @descripcion,
          @disponible
        )
      `);

    return NextResponse.json(result.recordset[0], {
      status: 201,
    });
  } catch (error) {
    console.error("Error al registrar vehículo:", error);

    return NextResponse.json(
      { error: "No se pudo registrar el vehículo" },
      { status: 500 }
    );
  }
}