import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";
import {
  CATEGORIAS_MANTENIMIENTO,
  validarDatosMantenimiento,
} from "../../lib/mantenimientos";
import {
  eliminarFacturaMantenimiento,
  subirFacturaMantenimiento,
  validarFactura,
} from "../../lib/facturas-mantenimiento";

export const runtime = "nodejs";

type RegistroMantenimiento = {
  id: number;
  vehiculoId: number;
  vehiculo: string;
  placa: string;
  fecha: string;
  categoria: string;
  monto: number;
  kilometraje: number;
  descripcion: string | null;
  tieneFactura: boolean;
};

type ResumenVehiculoGasto = {
  vehiculo: string;
  placa: string;
  gastoTotal: string | number;
  mantenimientoHistorico: string | number;
  proyeccionRecurrenteAnual: string | number;
};

type ResumenVehiculoKilometraje = {
  vehiculo: string;
  placa: string;
  kilometraje: string | number;
};

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pagina = Number(searchParams.get("pagina") ?? "1");
    const limite = Number(searchParams.get("limite") ?? "25");
    const vehiculoParametro = searchParams.get("vehiculoId");
    const categoriaParametro = searchParams.get("categoria");
    const vehiculoId =
      vehiculoParametro && vehiculoParametro !== "todos"
        ? Number(vehiculoParametro)
        : null;
    const categoria =
      categoriaParametro && categoriaParametro !== "todas"
        ? categoriaParametro
        : null;

    if (
      !Number.isSafeInteger(pagina) ||
      pagina < 1 ||
      !Number.isSafeInteger(limite) ||
      limite < 1 ||
      limite > 100 ||
      (vehiculoId !== null &&
        (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0)) ||
      (categoria !== null &&
        !CATEGORIAS_MANTENIMIENTO.includes(
          categoria as (typeof CATEGORIAS_MANTENIMIENTO)[number]
        ))
    ) {
      return NextResponse.json(
        { error: "Los filtros o la paginación no son válidos." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const offset = (pagina - 1) * limite;
    const filtros: string[] = [];
    const parametros: (number | string)[] = [];
    if (vehiculoId !== null) {
      parametros.push(vehiculoId);
      filtros.push(`m.vehiculo_id = $${parametros.length}`);
    }
    if (categoria !== null) {
      parametros.push(categoria);
      filtros.push(`m.categoria = $${parametros.length}`);
    }
    const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";
    const parametrosConteo = [...parametros];
    const parametrosPagina = [
      ...parametros,
      limite,
      offset,
    ];
    const placeholderLimite = parametros.length + 1;
    const placeholderOffset = parametros.length + 2;
    const [resultado, conteo, resumenResultado] = await Promise.all([
      pool.query(
        `SELECT
          m.id,
          m.vehiculo_id AS "vehiculoId",
          CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
          v.placa,
          m.fecha::text AS fecha,
          m.categoria,
          m.monto,
          m.kilometraje,
          m.descripcion,
          m.factura_public_id IS NOT NULL AS "tieneFactura"
        FROM public.mantenimientos AS m
        INNER JOIN public.vehiculos AS v ON v.id = m.vehiculo_id
        ${where}
        ORDER BY m.fecha DESC, m.id DESC
        LIMIT $${placeholderLimite} OFFSET $${placeholderOffset}`,
        parametrosPagina
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM public.mantenimientos AS m
         ${where}`,
        parametrosConteo
      ),
      pool.query(`
        WITH mantenimiento_por_vehiculo AS (
          SELECT vehiculo_id, SUM(monto) AS total
          FROM public.mantenimientos
          GROUP BY vehiculo_id
        ),
        recurrente_anual_por_vehiculo AS (
          SELECT
            vehiculo_id,
            SUM(
              CASE frecuencia
                WHEN 'mensual' THEN monto * 12
                ELSE monto
              END
            ) AS total
          FROM public.vehiculo_gastos_recurrentes
          GROUP BY vehiculo_id
        )
        SELECT
          COALESCE(
            (SELECT SUM(monto) FROM public.mantenimientos),
            0
          ) AS "mantenimientoHistorico",
          COALESCE(
            (SELECT SUM(total) FROM recurrente_anual_por_vehiculo),
            0
          ) AS "proyeccionRecurrenteAnual",
          COALESCE(
            (SELECT SUM(monto) FROM public.mantenimientos),
            0
          ) + COALESCE(
            (SELECT SUM(total) FROM recurrente_anual_por_vehiculo),
            0
          ) AS "gastoTotal",
          (
            SELECT jsonb_build_object(
              'vehiculo', CONCAT_WS(' ', v.marca, v.modelo),
              'placa', v.placa,
              'gastoTotal', gastos.total,
              'mantenimientoHistorico', gastos.mantenimiento_historico,
              'proyeccionRecurrenteAnual', gastos.proyeccion_recurrente_anual
            )
            FROM (
              SELECT
                v.id AS vehiculo_id,
                COALESCE(m.total, 0) AS mantenimiento_historico,
                COALESCE(r.total, 0) AS proyeccion_recurrente_anual,
                COALESCE(m.total, 0) + COALESCE(r.total, 0) AS total
              FROM public.vehiculos AS v
              LEFT JOIN mantenimiento_por_vehiculo AS m
                ON m.vehiculo_id = v.id
              LEFT JOIN recurrente_anual_por_vehiculo AS r
                ON r.vehiculo_id = v.id
              WHERE m.total IS NOT NULL OR r.total IS NOT NULL
              ORDER BY total DESC, v.id ASC
              LIMIT 1
            ) AS gastos
            INNER JOIN public.vehiculos AS v ON v.id = gastos.vehiculo_id
          ) AS "vehiculoMayorGasto",
          (
            SELECT jsonb_build_object(
              'vehiculo', CONCAT_WS(' ', v.marca, v.modelo),
              'placa', v.placa,
              'kilometraje', lecturas.kilometraje
            )
            FROM (
              SELECT DISTINCT ON (vehiculo_id)
                vehiculo_id,
                kilometraje
              FROM public.mantenimientos
              ORDER BY vehiculo_id, fecha DESC, id DESC
            ) AS lecturas
            INNER JOIN public.vehiculos AS v ON v.id = lecturas.vehiculo_id
            ORDER BY lecturas.kilometraje DESC, lecturas.vehiculo_id ASC
            LIMIT 1
          ) AS "vehiculoMayorKilometraje"
      `),
    ]);

    const registros: RegistroMantenimiento[] = resultado.rows.map(
      (fila: Record<string, unknown>) => ({
        id: Number(fila.id),
        vehiculoId: Number(fila.vehiculoId),
        vehiculo: String(fila.vehiculo),
        placa: String(fila.placa),
        fecha: String(fila.fecha),
        categoria: String(fila.categoria),
        monto: Number(fila.monto),
        kilometraje: Number(fila.kilometraje),
        descripcion:
          typeof fila.descripcion === "string" ? fila.descripcion : null,
        tieneFactura: fila.tieneFactura === true,
      })
    );

    const resumenFila = resumenResultado.rows[0] as {
      gastoTotal: string | number;
      mantenimientoHistorico: string | number;
      proyeccionRecurrenteAnual: string | number;
      vehiculoMayorGasto: ResumenVehiculoGasto | null;
      vehiculoMayorKilometraje: ResumenVehiculoKilometraje | null;
    };
    const total = Number(conteo.rows[0].total);

    return NextResponse.json(
      {
        registros,
        total,
        pagina,
        limite,
        paginas: Math.ceil(total / limite),
        resumen: {
          gastoTotal: Number(resumenFila.gastoTotal),
          mantenimientoHistorico: Number(
            resumenFila.mantenimientoHistorico
          ),
          proyeccionRecurrenteAnual: Number(
            resumenFila.proyeccionRecurrenteAnual
          ),
          vehiculoMayorGasto: resumenFila.vehiculoMayorGasto
            ? {
                ...resumenFila.vehiculoMayorGasto,
                gastoTotal: Number(
                  resumenFila.vehiculoMayorGasto.gastoTotal
                ),
                mantenimientoHistorico: Number(
                  resumenFila.vehiculoMayorGasto.mantenimientoHistorico
                ),
                proyeccionRecurrenteAnual: Number(
                  resumenFila.vehiculoMayorGasto.proyeccionRecurrenteAnual
                ),
              }
            : null,
          vehiculoMayorKilometraje: resumenFila.vehiculoMayorKilometraje
            ? {
                ...resumenFila.vehiculoMayorKilometraje,
                kilometraje: Number(
                  resumenFila.vehiculoMayorKilometraje.kilometraje
                ),
              }
            : null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al consultar mantenimientos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los mantenimientos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    let body: unknown;
    let factura: File | null = null;
    try {
      if (request.headers.get("content-type")?.includes("multipart/form-data")) {
        const formData = await request.formData();
        const datos = formData.get("datos");
        if (typeof datos !== "string") {
          return NextResponse.json(
            { error: "Faltan los datos del mantenimiento." },
            { status: 400 }
          );
        }
        body = JSON.parse(datos);
        const archivo = formData.get("factura");
        if (archivo !== null && typeof archivo !== "string") {
          factura = archivo;
        }
      } else {
        body = await request.json();
      }
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no contiene datos válidos." },
        { status: 400 }
      );
    }

    const validacion = validarDatosMantenimiento(body);
    if (!validacion.valido) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }
    const datos = validacion.datos;

    let facturaSubida: {
      publicId: string;
      formato: string;
      version: number;
    } | null = null;
    if (factura) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(factura.type) ||
        factura.size > 5 * 1024 * 1024
      ) {
        return NextResponse.json(
          { error: "La factura debe ser JPG, PNG o WEBP y no superar 5 MB." },
          { status: 400 }
        );
      }

      const bytes = Buffer.from(await factura.arrayBuffer());
      if (!validarFactura(factura.type, bytes)) {
        return NextResponse.json(
          { error: "El archivo de factura no es una imagen válida." },
          { status: 400 }
        );
      }
      facturaSubida = await subirFacturaMantenimiento(bytes);
    }

    try {
      const pool = await getConnection();
      const resultado = await pool.query(
        `INSERT INTO public.mantenimientos (
           vehiculo_id,
           fecha,
           categoria,
           monto,
           kilometraje,
           descripcion,
           factura_public_id,
           factura_formato,
           factura_version
         )
         SELECT id, $2, $3, $4, $5, $6, $7, $8, $9
         FROM public.vehiculos
         WHERE id = $1
         RETURNING
           id,
           vehiculo_id AS "vehiculoId",
           fecha::text AS fecha,
           categoria,
           monto,
           kilometraje,
           descripcion,
           factura_public_id IS NOT NULL AS "tieneFactura"`,
        [
          datos.vehiculoId,
          datos.fecha,
          datos.categoria,
          datos.monto,
          datos.kilometraje,
          datos.descripcion,
          facturaSubida?.publicId ?? null,
          facturaSubida?.formato ?? null,
          facturaSubida?.version ?? null,
        ]
      );

      if (resultado.rows.length === 0) {
        if (facturaSubida) {
          await eliminarFacturaMantenimiento(facturaSubida.publicId);
        }
        return NextResponse.json(
          { error: "El vehículo seleccionado no existe." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ...resultado.rows[0],
          id: Number(resultado.rows[0].id),
          vehiculoId: Number(resultado.rows[0].vehiculoId),
          monto: Number(resultado.rows[0].monto),
          kilometraje: Number(resultado.rows[0].kilometraje),
          tieneFactura: resultado.rows[0].tieneFactura === true,
        },
        { status: 201 }
      );
    } catch (error) {
      if (facturaSubida) {
        try {
          await eliminarFacturaMantenimiento(facturaSubida.publicId);
        } catch (errorLimpieza) {
          console.error(
            "No se pudo eliminar la factura huérfana de Cloudinary:",
            errorLimpieza
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error al guardar mantenimiento:", error);

    return NextResponse.json(
      { error: "No se pudo guardar el mantenimiento." },
      { status: 500 }
    );
  }
}
