export function validarRangoFechas(
  fechaInicio: unknown,
  fechaFin: unknown
): fechaInicio is string {
  if (
    typeof fechaInicio !== "string" ||
    typeof fechaFin !== "string" ||
    !esFecha(fechaInicio) ||
    !esFecha(fechaFin)
  ) {
    return false;
  }
  return fechaFin >= fechaInicio;
}

function esFecha(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export function condicionDisponibilidadFechas(
  aliasVehiculo: string,
  parametroInicio: string,
  parametroFin: string,
  parametroExcluirContrato?: string
) {
  const excluirContrato = parametroExcluirContrato
    ? `AND c.id <> ${parametroExcluirContrato}`
    : "";
  const excluirExtension = parametroExcluirContrato
    ? `AND ce.contrato_id <> ${parametroExcluirContrato}`
    : "";

  return `
    ${aliasVehiculo}.estado NOT IN ('mantenimiento', 'pintura')
    AND (
      ${aliasVehiculo}.estado = 'disponible'
      OR EXISTS (
        SELECT 1
        FROM public.contratos AS legado
        WHERE legado.vehiculo_id = ${aliasVehiculo}.id
          AND legado.estado IN ('pendiente_firma', 'activo')
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservas_vehiculos AS rv
      WHERE rv.vehiculo_id = ${aliasVehiculo}.id
        AND rv.estado = 'confirmada'
        AND rv.fecha_inicio <= ${parametroFin}::date
        AND rv.fecha_fin >= ${parametroInicio}::date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.contratos AS c
      WHERE c.vehiculo_id = ${aliasVehiculo}.id
        AND c.estado IN ('pendiente_firma', 'activo')
        ${excluirContrato}
        AND c.fecha_inicio <= ${parametroFin}::date
        AND COALESCE(
          (
            SELECT MAX(ce.fecha_fin_nueva)
            FROM public.contrato_extensiones AS ce
            WHERE ce.contrato_id = c.id
              AND ce.estado = 'aprobada'
          ),
          c.fecha_fin
        ) >= ${parametroInicio}::date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.contrato_extensiones AS ce
      INNER JOIN public.contratos AS contrato_extension
        ON contrato_extension.id = ce.contrato_id
      WHERE contrato_extension.vehiculo_id = ${aliasVehiculo}.id
        AND contrato_extension.estado IN ('pendiente_firma', 'activo')
        AND ce.estado = 'pendiente_aprobacion'
        ${excluirExtension}
        AND ce.fecha_fin_anterior < ${parametroFin}::date
        AND ce.fecha_fin_nueva >= ${parametroInicio}::date
    )
  `;
}
