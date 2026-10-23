import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { validarDatosCliente } from "../../../lib/clientes";
import { eliminarDocumentoCliente } from "../../../lib/documentos-clientes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json(
        { error: "El identificador del cliente no es válido." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    const [cliente, contratos, documentos] = await Promise.all([
      pool.query(
        `SELECT
           id, nombre, apellido, cedula, nacionalidad, telefono, whatsapp,
           email, vencimiento_licencia::text AS "vencimientoLicencia",
           direccion, notas
         FROM public.clientes
         WHERE id = $1`,
        [id]
      ),
      pool.query(
        `SELECT
           c.id, c.fecha_inicio::text AS "fechaInicio",
           c.fecha_fin::text AS "fechaFin", c.moneda, c.total,
           c.estado, c.firmado_en AS "firmadoEn",
           c.vehiculo_marca AS marca, c.vehiculo_modelo AS modelo,
           c.vehiculo_anio AS anio, c.vehiculo_placa AS placa,
           COALESCE(p.pagado, 0) AS pagado
         FROM public.contratos AS c
         LEFT JOIN (
           SELECT contrato_id, SUM(monto) AS pagado
           FROM public.contrato_pagos WHERE tipo = 'renta'
           GROUP BY contrato_id
         ) AS p ON p.contrato_id = c.id
         WHERE c.cliente_id = $1
         ORDER BY c.creado_en DESC, c.id DESC`,
        [id]
      ),
      pool.query(
        `SELECT
           id, tipo, nombre_archivo AS "nombreArchivo", formato,
           creado_en AS "creadoEn"
         FROM public.cliente_documentos
         WHERE cliente_id = $1
         ORDER BY creado_en DESC, id DESC`,
        [id]
      ),
    ]);
    if (cliente.rows.length === 0) {
      return NextResponse.json(
        { error: "El cliente no existe." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        ...cliente.rows[0],
        documentos: documentos.rows,
        contratos: contratos.rows.map((contrato: Record<string, unknown>) => ({
          ...contrato,
          id: Number(contrato.id),
          total: Number(contrato.total),
          pagado: Number(contrato.pagado),
        })),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error al consultar cliente:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el cliente." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json(
        { error: "El identificador del cliente no es válido." },
        { status: 400 }
      );
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
      `UPDATE public.clientes
       SET
         nombre = $2,
         apellido = $3,
         cedula = $4,
         nacionalidad = $5,
         telefono = $6,
         whatsapp = $7,
         email = $8,
         vencimiento_licencia = $9,
         direccion = $10,
         notas = $11,
         actualizado_en = NOW()
       WHERE id = $1
       RETURNING
         id, nombre, apellido, cedula, nacionalidad, telefono, whatsapp,
         email, vencimiento_licencia::text AS "vencimientoLicencia",
         direccion, notas`,
      [
        id,
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
    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El cliente no existe." },
        { status: 404 }
      );
    }
    return NextResponse.json(resultado.rows[0]);
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
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el cliente." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json(
        { error: "El identificador del cliente no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const cliente = await pool.query(
      "SELECT id FROM public.clientes WHERE id = $1",
      [id]
    );
    if (cliente.rows.length === 0) {
      return NextResponse.json(
        { error: "El cliente no existe." },
        { status: 404 }
      );
    }

    const contratosAsociados = await pool.query(
      "SELECT 1 FROM public.contratos WHERE cliente_id = $1 LIMIT 1",
      [id]
    );
    if (contratosAsociados.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar este cliente porque tiene contratos asociados. Conserva el perfil para mantener el historial de renta.",
        },
        { status: 409 }
      );
    }

    const documentos = await pool.query(
      `SELECT public_id AS "publicId", resource_type AS "resourceType"
       FROM public.cliente_documentos
       WHERE cliente_id = $1`,
      [id]
    );
    for (const documento of documentos.rows as {
      publicId: string;
      resourceType: string;
    }[]) {
      if (documento.resourceType !== "image" && documento.resourceType !== "raw") {
        throw new Error("El tipo de un documento almacenado no es válido.");
      }
      await eliminarDocumentoCliente(
        documento.publicId,
        documento.resourceType
      );
    }

    await pool.query("DELETE FROM public.clientes WHERE id = $1", [id]);
    return NextResponse.json({ mensaje: "Cliente eliminado." });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el cliente y sus documentos." },
      { status: 500 }
    );
  }
}
