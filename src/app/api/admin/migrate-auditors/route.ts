import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar CTOs en estado CORRECTO que tengan un asignado y cuyo auditor esté vacío
    const ctosToMigrate = await prisma.cTO.findMany({
      where: {
        status: "CORRECTO",
        assignedToId: { not: null },
        auditedById: null,
      },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    let updatedCount = 0;
    for (const cto of ctosToMigrate) {
      if (cto.assignedToId) {
        await prisma.cTO.update({
          where: { id: cto.id },
          data: { auditedById: cto.assignedToId },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `Se han migrado correctamente ${updatedCount} registros de auditoría.`,
    });
  } catch (error: any) {
    console.error("Error migrating auditors:", error);
    return NextResponse.json(
      { error: "Error interno al realizar la migración de auditores" },
      { status: 500 }
    );
  }
}
