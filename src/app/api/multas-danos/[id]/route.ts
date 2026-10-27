import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { ESTADOS_MULTA_DANO, validarDatosMultaDano } from "../../../lib/multas-danos";
import {
  eliminarFotoMultaDano,
  MAX_FOTOS_MULTA_DANO,
  MAX_TAMANO_FOTO_MULTA_DANO,
  subirFotoMultaDano,
  validarFotoMultaDano,
  type FotoMultaDanoSubida,
} from "../../../lib/fotos-multas-danos";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type ArchivoFoto = {
  nombre: string;
  bytes: Buffer;
};

async function limpiarFotosSubidas(fotos: FotoMultaDanoSubida[]) {
  for (const foto of fotos) {
    try {
      await eliminarFotoMultaDano(foto.publicId);
    } catch (error) {
      console.error(
        "No se pudo limpiar una foto de edición en Cloudinary:",
        error
      );
    }
  }
}

async function validarRelaciones(
  vehiculoId: number,
  clienteId: number | null,
  contratoId: number | null
): Promise<{ error: string; status: number } | null> {
  const pool = await getConnection();
  const [vehiculo, cliente] = await Promise.all([
    pool.query("SELECT id FROM public.vehiculos WHERE id = $1", [vehiculoId]),
    clienteId === null
      ? Promise.resolve({ rows: [{ id: null }] })
      : pool.query("SELECT id FROM public.clientes WHERE id = $1", [clienteId]),
  ]);
  if (vehiculo.rows.length === 0) {
    return { error: "El vehículo seleccionado no existe.", status: 404 };
  }
  if (cliente.rows.length === 0) {
    return { error: "El cliente seleccionado no existe.", status: 404 };
  }
  if (contratoId !== null) {
    const contrato = await pool.query(
      `SELECT vehiculo_id AS "vehiculoId", cliente_id AS "clienteId"
       FROM public.contratos
       WHERE id = $1`,
      [contratoId]
    );
    if (contrato.rows.length === 0) {
      return { error: "El contrato seleccionado no existe.", status: 404 };
    }
    const fila = contrato.rows[0] as {
      vehiculoId: number;
      clienteId: number;
    };
    if (
      Number(fila.vehiculoId) !== vehiculoId ||
      (clienteId !== null && Number(fila.clienteId) !== clienteId)
    ) {
      return {
        error:
          "El contrato debe corresponder al vehículo y al cliente seleccionados.",
        status: 400,
      };
    }
  }
  return null;
}

async function leerFormulario(
  request: Request
): Promise<
  | {
      valido: true;
      datos: unknown;
      archivos: ArchivoFoto[];
      fotosEliminarIds: number[];
    }
  | { valido: false; error: string }
> {
  let formulario: FormData;
  let datos: unknown;
  let fotosEliminarIds: number[];
  try {
    formulario = await request.formData();
    const valor = formulario.get("datos");
    if (typeof valor !== "string") {
      return { valido: false, error: "Faltan los datos del registro." };
    }
    datos = JSON.parse(valor);
    const fotosEliminar = formulario.get("fotosEliminarIds");
    const idsLeidos =
      typeof fotosEliminar === "string" && fotosEliminar !== ""
        ? JSON.parse(fotosEliminar)
        : [];
    if (
      !Array.isArray(idsLeidos) ||
      idsLeidos.some(
        (id) => !Number.isSafeInteger(id) || Number(id) <= 0
      ) ||
      new Set(idsLeidos).size !== idsLeidos.length
    ) {
      return {
        valido: false,
        error: "La selección de fotos por eliminar no es válida.",
      };
    }
    fotosEliminarIds = idsLeidos as number[];
  } catch {
    return { valido: false, error: "El formulario no contiene datos válidos." };
  }

  const entradas = formulario.getAll("fotos");
  if (
    entradas.length > MAX_FOTOS_MULTA_DANO ||
    entradas.some((entrada) => typeof entrada === "string")
  ) {
    return {
      valido: false,
      error: `Puedes adjuntar hasta ${MAX_FOTOS_MULTA_DANO} fotos.`,
    };
  }

  const archivos: ArchivoFoto[] = [];
  for (const entrada of entradas) {
    if (typeof entrada === "string") continue;
    const bytes = Buffer.from(await entrada.arrayBuffer());
    if (
      entrada.size > MAX_TAMANO_FOTO_MULTA_DANO ||
      !validarFotoMultaDano(entrada.type, bytes)
    ) {
      return {
        valido: false,
        error: "Cada foto debe ser JPG, PNG o WEBP y no superar los 5 MB.",
      };
    }
    archivos.push({
      nombre:
        entrada.name.replace(/[\\/\0-\x1f]/g, "_").trim().slice(0, 255) ||
        "foto",
      bytes,
    });
  }

  return { valido: true, datos, archivos, fotosEliminarIds };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const multaDanoId = Number(id);
    if (!Number.isSafeInteger(multaDanoId) || multaDanoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del registro no es válido." },
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
    if (
      typeof body !== "object" ||
      body === null ||
      !("estado" in body) ||
      typeof body.estado !== "string" ||
      !ESTADOS_MULTA_DANO.includes(
        body.estado as (typeof ESTADOS_MULTA_DANO)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Selecciona un estado de pago válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `UPDATE public.multas_danos
       SET
         estado = $2,
         fecha_pago = CASE
           WHEN $2 = 'pendiente' THEN NULL
           WHEN estado = 'pagado' THEN fecha_pago
           ELSE CURRENT_DATE
         END,
         actualizado_en = NOW()
       WHERE id = $1
       RETURNING estado, fecha_pago::text AS "fechaPago"`,
      [multaDanoId, body.estado]
    );
    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El registro no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar el estado de multa o daño:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del registro." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const fotosSubidas: FotoMultaDanoSubida[] = [];
  let cliente: PoolClient | null = null;
  let transaccionIniciada = false;
  let actualizacionGuardada = false;
  let fotosEliminadas: string[] = [];

  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const multaDanoId = Number(id);
    if (!Number.isSafeInteger(multaDanoId) || multaDanoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del registro no es válido." },
        { status: 400 }
      );
    }

    const formulario = await leerFormulario(request);
    if (!formulario.valido) {
      return NextResponse.json(
        { error: formulario.error },
        { status: 400 }
      );
    }
    const validacion = validarDatosMultaDano(formulario.datos);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    const datos = validacion.datos;
    const errorRelacion = await validarRelaciones(
      datos.vehiculoId,
      datos.clienteId,
      datos.contratoId
    );
    if (errorRelacion) {
      return NextResponse.json(
        { error: errorRelacion.error },
        { status: errorRelacion.status }
      );
    }

    for (const archivo of formulario.archivos) {
      fotosSubidas.push(await subirFotoMultaDano(archivo.bytes));
    }

    const pool = await getConnection();
    cliente = await pool.connect();
    await cliente.query("BEGIN");
    transaccionIniciada = true;

    const registro = await cliente.query(
      "SELECT id FROM public.multas_danos WHERE id = $1 FOR UPDATE",
      [multaDanoId]
    );
    if (registro.rows.length === 0) {
      await cliente.query("ROLLBACK");
      transaccionIniciada = false;
      await limpiarFotosSubidas(fotosSubidas);
      fotosSubidas.length = 0;
      return NextResponse.json(
        { error: "El registro no existe." },
        { status: 404 }
      );
    }

    const fotosExistentes = await cliente.query(
      `SELECT id, public_id AS "publicId"
       FROM public.multas_danos_fotos
       WHERE multa_dano_id = $1
       FOR UPDATE`,
      [multaDanoId]
    );
    const idsExistentes = new Set(
      fotosExistentes.rows.map((foto: { id: string | number }) =>
        Number(foto.id)
      )
    );
    if (
      formulario.fotosEliminarIds.some((fotoId) => !idsExistentes.has(fotoId))
    ) {
      await cliente.query("ROLLBACK");
      transaccionIniciada = false;
      await limpiarFotosSubidas(fotosSubidas);
      fotosSubidas.length = 0;
      return NextResponse.json(
        { error: "Una de las fotos seleccionadas ya no existe." },
        { status: 400 }
      );
    }

    const cantidadRestante =
      fotosExistentes.rows.length - formulario.fotosEliminarIds.length;
    if (
      cantidadRestante + formulario.archivos.length > MAX_FOTOS_MULTA_DANO
    ) {
      await cliente.query("ROLLBACK");
      transaccionIniciada = false;
      await limpiarFotosSubidas(fotosSubidas);
      fotosSubidas.length = 0;
      return NextResponse.json(
        {
          error: `El registro no puede superar ${MAX_FOTOS_MULTA_DANO} fotos en total.`,
        },
        { status: 400 }
      );
    }

    const clienteId = datos.contratoId
      ? (
          await cliente.query(
            "SELECT cliente_id AS id FROM public.contratos WHERE id = $1",
            [datos.contratoId]
          )
        ).rows[0].id
      : datos.clienteId;

    if (formulario.fotosEliminarIds.length > 0) {
      const resultadoFotosEliminadas = await cliente.query(
        `DELETE FROM public.multas_danos_fotos
         WHERE multa_dano_id = $1 AND id = ANY($2::bigint[])
         RETURNING public_id AS "publicId"`,
        [multaDanoId, formulario.fotosEliminarIds]
      );
      fotosEliminadas = resultadoFotosEliminadas.rows.map(
        (foto: { publicId: string }) => foto.publicId
      );
    }

    await cliente.query(
      `UPDATE public.multas_danos
       SET
         vehiculo_id = $2,
         cliente_id = $3,
         cliente_nombre_manual = CASE WHEN $3 IS NULL THEN $4 ELSE NULL END,
         contrato_id = $5,
         tipo = $6,
         fecha = $7,
         descripcion = $8,
         monto = $9,
         estado = $10,
         fecha_pago = $11,
         actualizado_en = NOW()
       WHERE id = $1`,
      [
        multaDanoId,
        datos.vehiculoId,
        clienteId,
        clienteId === null ? datos.nombreClienteManual : null,
        datos.contratoId,
        datos.tipo,
        datos.fecha,
        datos.descripcion,
        datos.monto,
        datos.estado,
        datos.fechaPago,
      ]
    );

    for (const [indice, foto] of fotosSubidas.entries()) {
      await cliente.query(
        `INSERT INTO public.multas_danos_fotos (
           multa_dano_id, nombre_archivo, public_id, formato, version
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          multaDanoId,
          formulario.archivos[indice].nombre,
          foto.publicId,
          foto.formato,
          foto.version,
        ]
      );
    }

    await cliente.query("COMMIT");
    transaccionIniciada = false;
    actualizacionGuardada = true;
    const limpiezaFotos = await Promise.allSettled(
      fotosEliminadas.map((publicId) => eliminarFotoMultaDano(publicId))
    );
    const fotosNoEliminadas = limpiezaFotos.filter(
      (resultado) => resultado.status === "rejected"
    ).length;
    if (fotosNoEliminadas > 0) {
      console.error(
        `No se pudieron eliminar ${fotosNoEliminadas} fotos de Cloudinary del registro ${multaDanoId}.`
      );
    }
    return NextResponse.json({
      mensaje: "El registro se actualizó correctamente.",
      advertencia:
        fotosNoEliminadas > 0
          ? `Los cambios se guardaron, pero ${fotosNoEliminadas} fotos no se pudieron borrar del almacenamiento.`
          : null,
    });
  } catch (error) {
    if (cliente && transaccionIniciada) {
      try {
        await cliente.query("ROLLBACK");
      } catch (errorRollback) {
        console.error(
          "Error al revertir la edición de multa o daño:",
          errorRollback
        );
      }
    }
    if (!actualizacionGuardada) {
      await limpiarFotosSubidas(fotosSubidas);
    }
    console.error("Error al editar multa o daño:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el registro." },
      { status: 500 }
    );
  } finally {
    cliente?.release();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const multaDanoId = Number(id);
    if (!Number.isSafeInteger(multaDanoId) || multaDanoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del registro no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const cliente = await pool.connect();
    let publicIds: string[] = [];
    try {
      await cliente.query("BEGIN");
      const resultado = await cliente.query(
        `SELECT public_id AS "publicId"
         FROM public.multas_danos_fotos
         WHERE multa_dano_id = $1
         FOR UPDATE`,
        [multaDanoId]
      );
      const eliminado = await cliente.query(
        "DELETE FROM public.multas_danos WHERE id = $1 RETURNING id",
        [multaDanoId]
      );
      if (eliminado.rows.length === 0) {
        await cliente.query("ROLLBACK");
        return NextResponse.json(
          { error: "El registro no existe." },
          { status: 404 }
        );
      }
      publicIds = resultado.rows.map(
        (fila: { publicId: string }) => fila.publicId
      );
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }

    const resultadosLimpieza = await Promise.allSettled(
      publicIds.map((publicId) => eliminarFotoMultaDano(publicId))
    );
    const fotosNoEliminadas = resultadosLimpieza.filter(
      (resultado) => resultado.status === "rejected"
    ).length;
    if (fotosNoEliminadas > 0) {
      console.error(
        `No se pudieron eliminar ${fotosNoEliminadas} fotos de Cloudinary del registro ${multaDanoId}.`
      );
    }

    return NextResponse.json({
      mensaje: "El registro se eliminó correctamente.",
      advertencia:
        fotosNoEliminadas > 0
          ? `El registro se eliminó, pero ${fotosNoEliminadas} fotos no se pudieron borrar del almacenamiento.`
          : null,
    });
  } catch (error) {
    console.error("Error al eliminar multa o daño:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el registro." },
      { status: 500 }
    );
  }
}
