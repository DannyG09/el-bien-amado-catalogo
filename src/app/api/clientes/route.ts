import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";
import { validarDatosCliente } from "../../lib/clientes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const busqueda = new URL(request.url).searchParams
      .get("busqueda")
      ?.trim();
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         c.id,
         c.nombre,
         c.apellido,
         c.cedula,
         c.nacionalidad,
         c.telefono,
         c.whatsapp,
         c.email,
         c.vencimiento_licencia::text AS "vencimientoLicencia",
         c.direccion,
         c.notas,
         c.creado_en AS "creadoEn",
         (
           SELECT d.id
           FROM public.cliente_documentos AS d
           WHERE d.cliente_id = c.id AND d.tipo = 'foto_perfil'
           ORDER BY d.creado_en DESC, d.id DESC
           LIMIT 1
         ) AS "fotoPerfilId"
       FROM public.clientes AS c
       WHERE $1::text IS NULL
          OR CONCAT_WS(' ', c.nombre, c.apellido, c.cedula, c.email, c.telefono)
             ILIKE '%' || $1 || '%'
       ORDER BY c.apellido, c.nombre, c.id DESC`,
      [busqueda || null]
    );
    return NextResponse.json(resultado.rows, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Error al consultar clientes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los clientes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene JSON válido." },
        { status: 400 }
      );
    }
    const validacion = validarDatosCliente(body);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }
    const { datos } = validacion;
    const pool = await getConnection();
    const resultado = await pool.query(
      `INSERT INTO public.clientes (
         nombre, apellido, cedula, nacionalidad, telefono, whatsapp, email,
         vencimiento_licencia, direccion, notas
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING
         id, nombre, apellido, cedula, nacionalidad, telefono, whatsapp,
         email, vencimiento_licencia::text AS "vencimientoLicencia",
         direccion, notas`,
      [
        datos.nombre,
        datos.apellido,
        datos.cedula,
        datos.nacionalidad,
        datos.telefono,
        datos.whatsapp,
        datos.email,
        datos.vencimientoLicencia,
        datos.direccion,
        datos.notas,
      ]
    );
    return NextResponse.json(resultado.rows[0], { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Ya existe un cliente registrado con esa cédula." },
        { status: 409 }
      );
    }
    console.error("Error al registrar cliente:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el cliente." },
      { status: 500 }
    );
  }
}
