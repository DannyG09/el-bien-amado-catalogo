import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../lib/auth";
import { getConnection } from "../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `WITH contratos AS (
         SELECT c.id, c.vehiculo_id, c.fecha_inicio,
                c.hora_entrega,
                COALESCE(
                  (SELECT ce.fecha_fin_nueva
                   FROM public.contrato_extensiones AS ce
                   WHERE ce.contrato_id = c.id AND ce.estado = 'aprobada'
                   ORDER BY ce.fecha_fin_nueva DESC, ce.id DESC
                   LIMIT 1),
                  c.fecha_fin
                ) AS fecha_fin,
                COALESCE(
                  (SELECT ce.hora_devolucion
                   FROM public.contrato_extensiones AS ce
                   WHERE ce.contrato_id = c.id AND ce.estado = 'aprobada'
                   ORDER BY ce.fecha_fin_nueva DESC, ce.id DESC
                   LIMIT 1),
                  c.hora_devolucion
                ) AS hora_devolucion,
                c.estado, cl.nombre, cl.apellido,
                v.marca, v.modelo, v.placa
         FROM public.contratos AS c
         INNER JOIN public.vehiculos AS v ON v.id = c.vehiculo_id
         INNER JOIN public.clientes AS cl ON cl.id = c.cliente_id
         WHERE c.estado IN ('pendiente_firma', 'activo')
       ),
       eventos AS (
         SELECT 'contrato'::text AS origen, c.id AS "registroId",
                'entrega'::text AS tipo,
                c.fecha_inicio AS fecha, c.hora_entrega AS hora,
                CONCAT_WS(' ', c.nombre, c.apellido) AS cliente,
                c.marca, c.modelo, c.placa, c.estado
         FROM contratos AS c
         WHERE c.fecha_inicio >= CURRENT_DATE
         UNION ALL
         SELECT 'contrato', c.id, 'devolucion', c.fecha_fin,
                c.hora_devolucion, CONCAT_WS(' ', c.nombre, c.apellido),
                c.marca, c.modelo, c.placa, c.estado
         FROM contratos AS c
         WHERE c.fecha_fin >= CURRENT_DATE
            OR (
              c.estado = 'activo'
              AND c.fecha_fin >= CURRENT_DATE - INTERVAL '30 days'
            )
         UNION ALL
         SELECT 'reserva', rv.id, 'entrega', rv.fecha_inicio,
                rv.hora_entrega,
                COALESCE(NULLIF(rv.cliente_nombre_manual, ''),
                         NULLIF(CONCAT_WS(' ', cl.nombre, cl.apellido), '')),
                v.marca, v.modelo, v.placa, rv.estado
         FROM public.reservas_vehiculos AS rv
         INNER JOIN public.vehiculos AS v ON v.id = rv.vehiculo_id
         LEFT JOIN public.clientes AS cl ON cl.id = rv.cliente_id
         WHERE rv.estado = 'confirmada'
           AND rv.fecha_inicio >= CURRENT_DATE
         UNION ALL
         SELECT 'reserva', rv.id, 'devolucion', rv.fecha_fin,
                rv.hora_devolucion,
                COALESCE(NULLIF(rv.cliente_nombre_manual, ''),
                         NULLIF(CONCAT_WS(' ', cl.nombre, cl.apellido), '')),
                v.marca, v.modelo, v.placa, rv.estado
         FROM public.reservas_vehiculos AS rv
         INNER JOIN public.vehiculos AS v ON v.id = rv.vehiculo_id
         LEFT JOIN public.clientes AS cl ON cl.id = rv.cliente_id
         WHERE rv.estado = 'confirmada'
           AND rv.fecha_fin >= CURRENT_DATE
         UNION ALL
         SELECT 'contrato', c.id, 'extension_pendiente', ce.fecha_fin_nueva,
                ce.hora_devolucion, CONCAT_WS(' ', cl.nombre, cl.apellido),
                v.marca, v.modelo, v.placa, ce.estado
         FROM public.contrato_extensiones AS ce
         INNER JOIN public.contratos AS c ON c.id = ce.contrato_id
         INNER JOIN public.clientes AS cl ON cl.id = c.cliente_id
         INNER JOIN public.vehiculos AS v ON v.id = c.vehiculo_id
         WHERE ce.estado = 'pendiente_aprobacion'
           AND c.estado = 'activo'
           AND ce.fecha_fin_nueva >= CURRENT_DATE
       )
       SELECT origen, "registroId", tipo,
              fecha::text AS fecha, TO_CHAR(hora, 'HH24:MI') AS hora,
              cliente, marca, modelo, placa, estado
       FROM eventos
       ORDER BY (fecha < CURRENT_DATE) ASC, fecha ASC, hora ASC
       LIMIT 40`
    );
    return NextResponse.json(
      resultado.rows.map((evento: Record<string, unknown>) => ({
        ...evento,
        registroId: Number(evento.registroId),
      }))
    );
  } catch (error) {
    console.error("Error al cargar agenda:", error);
    return NextResponse.json({ error: "No se pudo cargar la agenda." }, { status: 500 });
  }
}
