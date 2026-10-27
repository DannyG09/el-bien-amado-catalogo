import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";
import {
  ESTADOS_MULTA_DANO,
  TIPOS_MULTA_DANO,
  validarDatosMultaDano,
} from "../../lib/multas-danos";
import {
  crearUrlPrivadaFotoMultaDano,
  eliminarFotoMultaDano,
  MAX_FOTOS_MULTA_DANO,
  MAX_TAMANO_FOTO_MULTA_DANO,
  subirFotoMultaDano,
  validarFotoMultaDano,
  type FotoMultaDanoSubida,
} from "../../lib/fotos-multas-danos";

export const runtime = "nodejs";

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
        "No se pudo limpiar una foto huérfana de Cloudinary:",
        error
      );
    }
  }
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pagina = Number(searchParams.get("pagina") ?? "1");
    const limite = Number(searchParams.get("limite") ?? "20");
    const vehiculoParametro = searchParams.get("vehiculoId");
    const tipoParametro = searchParams.get("tipo");
    const estadoParametro = searchParams.get("estado");
    const vehiculoId =
      vehiculoParametro && vehiculoParametro !== "todos"
        ? Number(vehiculoParametro)
        : null;
    const tipo =
      tipoParametro && tipoParametro !== "todos" ? tipoParametro : null;
    const estado =
      estadoParametro && estadoParametro !== "todos"
        ? estadoParametro
        : null;

    if (
      !Number.isSafeInteger(pagina) ||
      pagina < 1 ||
      !Number.isSafeInteger(limite) ||
      limite < 1 ||
      limite > 100 ||
      (vehiculoId !== null &&
        (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0)) ||
      (tipo !== null &&
        !TIPOS_MULTA_DANO.includes(tipo as (typeof TIPOS_MULTA_DANO)[number])) ||
      (estado !== null &&
        !ESTADOS_MULTA_DANO.includes(
          estado as (typeof ESTADOS_MULTA_DANO)[number]
        ))
    ) {
      return NextResponse.json(
        { error: "Los filtros o la paginación no son válidos." },
        { status: 400 }
      );
    }

    const filtros: string[] = [];
    const parametros: (number | string)[] = [];
    if (vehiculoId !== null) {
      parametros.push(vehiculoId);
      filtros.push(`m.vehiculo_id = $${parametros.length}`);
    }
    if (tipo !== null) {
      parametros.push(tipo);
      filtros.push(`m.tipo = $${parametros.length}`);
    }
    if (estado !== null) {
      parametros.push(estado);
      filtros.push(`m.estado = $${parametros.length}`);
    }

    const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";
    const pool = await getConnection();
    const offset = (pagina - 1) * limite;
    const [registrosResultado, resumenResultado] = await Promise.all([
      pool.query(
        `SELECT
           m.id,
           m.vehiculo_id AS "vehiculoId",
           CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
           v.anio,
           v.placa,
           m.cliente_id AS "clienteId",
           COALESCE(
             NULLIF(CONCAT_WS(' ', c.nombre, c.apellido), ''),
             m.cliente_nombre_manual
           ) AS cliente,
           m.contrato_id AS "contratoId",
           m.tipo,
           m.fecha::text AS fecha,
           m.descripcion,
           m.monto,
           m.estado,
           m.fecha_pago::text AS "fechaPago"
         FROM public.multas_danos AS m
         INNER JOIN public.vehiculos AS v ON v.id = m.vehiculo_id
         LEFT JOIN public.clientes AS c ON c.id = m.cliente_id
         ${where}
         ORDER BY m.fecha DESC, m.id DESC
         LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
        [...parametros, limite, offset]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(m.monto), 0) AS "montoTotal",
           COALESCE(SUM(m.monto) FILTER (WHERE m.estado = 'pendiente'), 0) AS pendiente,
           COALESCE(SUM(m.monto) FILTER (WHERE m.estado = 'pagado'), 0) AS pagado
         FROM public.multas_danos AS m
         ${where}`,
        parametros
      ),
    ]);

    const filas = registrosResultado.rows as Record<string, unknown>[];
    const ids = filas.map((fila) => Number(fila.id));
    const fotosPorIncidente = new Map<
      number,
      { id: number; nombre: string; url: string }[]
    >();

    if (ids.length > 0) {
      const fotosResultado = await pool.query(
        `SELECT
           id,
           multa_dano_id AS "multaDanoId",
           nombre_archivo AS nombre,
           public_id AS "publicId",
           version
         FROM public.multas_danos_fotos
         WHERE multa_dano_id = ANY($1::bigint[])
         ORDER BY creado_en, id`,
        [ids]
      );

      for (const foto of fotosResultado.rows as Record<string, unknown>[]) {
        const multaDanoId = Number(foto.multaDanoId);
        const fotos = fotosPorIncidente.get(multaDanoId) ?? [];
        fotos.push({
          id: Number(foto.id),
          nombre: String(foto.nombre),
          url: crearUrlPrivadaFotoMultaDano(
            String(foto.publicId),
            Number(foto.version)
          ),
        });
        fotosPorIncidente.set(multaDanoId, fotos);
      }
    }

    const resumen = resumenResultado.rows[0] as Record<string, unknown>;
    const total = Number(resumen.total);
    return NextResponse.json(
      {
        registros: filas.map((fila) => ({
          ...fila,
          id: Number(fila.id),
          vehiculoId: Number(fila.vehiculoId),
          clienteId: fila.clienteId == null ? null : Number(fila.clienteId),
          contratoId: fila.contratoId == null ? null : Number(fila.contratoId),
          anio: Number(fila.anio),
          monto: Number(fila.monto),
          fotos: fotosPorIncidente.get(Number(fila.id)) ?? [],
        })),
        total,
        paginas: Math.ceil(total / limite),
        resumen: {
          montoTotal: Number(resumen.montoTotal),
          pendiente: Number(resumen.pendiente),
          pagado: Number(resumen.pagado),
        },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error al consultar multas y daños:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las multas y los daños." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const fotosSubidas: FotoMultaDanoSubida[] = [];
  let cliente: PoolClient | null = null;
  let transaccionIniciada = false;
  let registroGuardado = false;

  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    let datosFormulario: unknown;
    let archivosFormulario: FormDataEntryValue[];
    try {
      const formulario = await request.formData();
      const datos = formulario.get("datos");
      if (typeof datos !== "string") {
        return NextResponse.json(
          { error: "Faltan los datos del registro." },
          { status: 400 }
        );
      }
      datosFormulario = JSON.parse(datos);
      archivosFormulario = formulario.getAll("fotos");
    } catch {
      return NextResponse.json(
        { error: "El formulario no contiene datos válidos." },
        { status: 400 }
      );
    }

    const validacion = validarDatosMultaDano(datosFormulario);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }
    if (
      archivosFormulario.length > MAX_FOTOS_MULTA_DANO ||
      archivosFormulario.some((archivo) => typeof archivo === "string")
    ) {
      return NextResponse.json(
        { error: `Puedes adjuntar hasta ${MAX_FOTOS_MULTA_DANO} fotos.` },
        { status: 400 }
      );
    }

    const datos = validacion.datos;
    const archivos: ArchivoFoto[] = [];
    for (const entrada of archivosFormulario) {
      if (typeof entrada === "string") continue;
      const bytes = Buffer.from(await entrada.arrayBuffer());
      if (
        entrada.size > MAX_TAMANO_FOTO_MULTA_DANO ||
        !validarFotoMultaDano(entrada.type, bytes)
      ) {
        return NextResponse.json(
          { error: "Cada foto debe ser JPG, PNG o WEBP y no superar 5 MB." },
          { status: 400 }
        );
      }
      archivos.push({
        nombre:
          entrada.name.replace(/[\\/\0-\x1f]/g, "_").trim().slice(0, 255) ||
          "foto",
        bytes,
      });
    }

    const pool = await getConnection();
    const [vehiculoResultado, clienteResultado] = await Promise.all([
      pool.query("SELECT id FROM public.vehiculos WHERE id = $1", [
        datos.vehiculoId,
      ]),
      datos.clienteId === null
        ? Promise.resolve({ rows: [{ id: null }] })
        : pool.query("SELECT id FROM public.clientes WHERE id = $1", [
            datos.clienteId,
          ]),
    ]);
    if (vehiculoResultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El vehículo seleccionado no existe." },
        { status: 404 }
      );
    }
    if (clienteResultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El cliente seleccionado no existe." },
        { status: 404 }
      );
    }

    let clienteId = datos.clienteId;
    if (datos.contratoId !== null) {
      const contratoResultado = await pool.query(
        `SELECT vehiculo_id AS "vehiculoId", cliente_id AS "clienteId"
         FROM public.contratos
         WHERE id = $1`,
        [datos.contratoId]
      );
      if (contratoResultado.rows.length === 0) {
        return NextResponse.json(
          { error: "El contrato seleccionado no existe." },
          { status: 404 }
        );
      }
      const contrato = contratoResultado.rows[0] as {
        vehiculoId: number;
        clienteId: number;
      };
      if (
        Number(contrato.vehiculoId) !== datos.vehiculoId ||
        (clienteId !== null && Number(contrato.clienteId) !== clienteId)
      ) {
        return NextResponse.json(
          {
            error:
              "El contrato debe corresponder al vehículo y al cliente seleccionados.",
          },
          { status: 400 }
        );
      }
      clienteId = Number(contrato.clienteId);
    }

    for (const archivo of archivos) {
      fotosSubidas.push(await subirFotoMultaDano(archivo.bytes));
    }

    cliente = await pool.connect();
    await cliente.query("BEGIN");
    transaccionIniciada = true;
    const resultado = await cliente.query(
      `INSERT INTO public.multas_danos (
         vehiculo_id, cliente_id, cliente_nombre_manual, contrato_id, tipo,
         fecha, descripcion, monto, estado, fecha_pago
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
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
    const multaDanoId = Number(resultado.rows[0].id);

    for (const [indice, foto] of fotosSubidas.entries()) {
      await cliente.query(
        `INSERT INTO public.multas_danos_fotos (
           multa_dano_id, nombre_archivo, public_id, formato, version
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          multaDanoId,
          archivos[indice].nombre,
          foto.publicId,
          foto.formato,
          foto.version,
        ]
      );
    }

    await cliente.query("COMMIT");
    transaccionIniciada = false;
    registroGuardado = true;
    return NextResponse.json(
      { id: multaDanoId, mensaje: "El registro se guardó correctamente." },
      { status: 201 }
    );
  } catch (error) {
    if (cliente && transaccionIniciada) {
      try {
        await cliente.query("ROLLBACK");
      } catch (errorRollback) {
        console.error(
          "Error al revertir el registro de multa o daño:",
          errorRollback
        );
      }
    }
    if (!registroGuardado) {
      await limpiarFotosSubidas(fotosSubidas);
    }
    console.error("Error al guardar multa o daño:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la multa o el daño." },
      { status: 500 }
    );
  } finally {
    cliente?.release();
  }
}
