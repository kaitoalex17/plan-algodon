import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usersCount = await prisma.user.count();
    const ctosCount = await prisma.cTO.count();
    const programadasCount = await prisma.cTO.count({ where: { category: "PROGRAMADA" } });
    const auditoriaCount = await prisma.cTO.count({ where: { category: "AUDITORIA" } });

    return NextResponse.json({
      usersCount,
      ctosCount,
      programadasCount,
      auditoriaCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
