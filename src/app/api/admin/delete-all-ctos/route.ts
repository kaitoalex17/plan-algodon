import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Contar cuántos registros hay de CTOs
    const count = await prisma.cTO.count();

    // Eliminar todas las CTOs de la base de datos
    // Esto disparará la eliminación en cascada de fotos, comentarios, alertas y logs de historial vinculados en la BD
    await prisma.cTO.deleteMany();

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("Error al borrar todas las CTOs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
