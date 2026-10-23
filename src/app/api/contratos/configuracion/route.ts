import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { validarImagenFirma } from "../../../lib/contratos";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT nombre_empresa AS "nombreEmpresa", telefono, email, terminos,
              firma_empresa IS NOT NULL AS "tieneFirmaEmpresa"
       FROM public.contrato_configuracion WHERE id = 1`
    );
    return NextResponse.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al consultar configuración de contrato:", error);
    return NextResponse.json(
      { error: "No se pudo obtener la configuración del contrato." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const formulario = await request.formData();
    const nombre = formulario.get("nombreEmpresa");
    const telefono = formulario.get("telefono");
    const email = formulario.get("email");
    const terminos = formulario.get("terminos");
    const firma = formulario.get("firmaEmpresa");
    const eliminarFirma = formulario.get("eliminarFirma") === "true";
    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      nombre.trim().length > 200 ||
      typeof telefono !== "string" ||
      telefono.length > 40 ||
      typeof email !== "string" ||
      email.length > 254 ||
      (email.trim() !== "" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      typeof terminos !== "string" ||
      !terminos.trim() ||
      terminos.length > 20000
    ) {
      return NextResponse.json(
        { error: "Revisa el nombre, contacto y términos de la empresa." },
        { status: 400 }
      );
    }

    let firmaBytes: Buffer | null = null;
    let firmaMime: "image/png" | "image/jpeg" | null = null;
    if (firma instanceof File && firma.size > 0) {
      const bytes = Buffer.from(await firma.arrayBuffer());
      if (!validarImagenFirma(firma.type, bytes)) {
        return NextResponse.json(
          { error: "La firma de empresa debe ser una imagen PNG o JPG de hasta 8 MB." },
          { status: 400 }
        );
      }
      firmaBytes = bytes;
      firmaMime = firma.type;
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `INSERT INTO public.contrato_configuracion (
         id, nombre_empresa, telefono, email, terminos,
         firma_empresa, firma_mime, actualizado_en
       )
       VALUES (
         1, $1, NULLIF($2, ''), NULLIF($3, ''), $4,
         $5, $6, NOW()
       )
       ON CONFLICT (id) DO UPDATE SET
         nombre_empresa = EXCLUDED.nombre_empresa,
         telefono = EXCLUDED.telefono,
         email = EXCLUDED.email,
         terminos = EXCLUDED.terminos,
         firma_empresa = CASE
           WHEN $7 THEN NULL
           WHEN $5::bytea IS NOT NULL THEN $5
           ELSE contrato_configuracion.firma_empresa
         END,
         firma_mime = CASE
           WHEN $7 THEN NULL
           WHEN $6::text IS NOT NULL THEN $6
           ELSE contrato_configuracion.firma_mime
         END,
         actualizado_en = NOW()
       RETURNING nombre_empresa AS "nombreEmpresa", telefono, email, terminos,
                 firma_empresa IS NOT NULL AS "tieneFirmaEmpresa"`,
      [
        nombre.trim(),
        telefono.trim(),
        email.trim(),
        terminos.trim(),
        firmaBytes,
        firmaMime,
        eliminarFirma,
      ]
    );
    return NextResponse.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al guardar configuración de contrato:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la configuración del contrato." },
      { status: 500 }
    );
  }
}
