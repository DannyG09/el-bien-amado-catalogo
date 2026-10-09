import { NextResponse } from "next/server";
import { setAdminSession } from "../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { usuario, password } = body ?? {};

    if (
      typeof usuario !== "string" ||
      typeof password !== "string" ||
      !usuario.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "Debes introducir el usuario y la contraseña" },
        { status: 400 }
      );
    }

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
      console.error("Faltan las credenciales del administrador");

      return NextResponse.json(
        { error: "El inicio de sesión no está disponible" },
        { status: 500 }
      );
    }

    if (usuario !== adminUser || password !== adminPassword) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    await setAdminSession();

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
    });
  } catch (error) {
    console.error("Error durante el inicio de sesión:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el inicio de sesión" },
      { status: 500 }
    );
  }
}

