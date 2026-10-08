
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { usuario, password } = body;

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
      return NextResponse.json(
        {
          error: "Las credenciales del administrador no están configuradas",
        },
        { status: 500 }
      );
    }

    if (usuario !== adminUser || password !== adminPassword) {
      return NextResponse.json(
        {
          error: "Usuario o contraseña incorrectos",
        },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error al procesar el inicio de sesión",
      },
      { status: 500 }
    );
  }
}
