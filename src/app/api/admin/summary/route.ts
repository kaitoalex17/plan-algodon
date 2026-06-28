import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usersCount = await prisma.user.count();
    const ctosCount = await prisma.cTO.count();
    const programadasCount = await prisma.cTO.count({ where: { category: "PROGRAMADA" } });
    const auditoriaCount = await prisma.cTO.count({ where: { category: "AUDITORIA" } });
    const ctosAuditadas = await prisma.cTO.count({ where: { status: { in: ["CORRECTO", "FALLO"] } } });
    const ctosPendientes = await prisma.cTO.count({ where: { status: "PENDIENTE" } });

    return NextResponse.json({
      usersCount,
      ctosCount,
      programadasCount,
      auditoriaCount,
      ctosAuditadas,
      ctosPendientes
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
