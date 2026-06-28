import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Obtener el inicio del día de hoy a las 00:00:00 del servidor
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Obtener los registros del historial del usuario para hoy
    const historyRecords = await prisma.history.findMany({
      where: {
        userId,
        timestamp: {
          gte: startOfToday
        }
      },
      include: {
        cto: {
          include: {
            subStatus: { select: { id: true, name: true, color: true } },
            assignedTo: { select: { id: true, name: true, email: true, color: true } }
          }
        }
      },
      orderBy: { timestamp: "desc" }
    });

    // 1. Identificar las CTOs que cambiaron a CORRECTO o FALLO hoy por este usuario
    const auditedCtoIds = new Set<string>();
    for (const record of historyRecords) {
      const action = (record.action || "").toLowerCase();
      if (
        action.includes("a correcto") || 
        action.includes("a fallo")
      ) {
        auditedCtoIds.add(record.ctoId);
      }
    }

    // 2. Agrupar por CTO para quedarnos con el último cambio de hoy, filtrando solo las auditadas hoy
    const uniqueCtosMap = new Map();
    for (const record of historyRecords) {
      if (!record.cto) continue;
      if (!auditedCtoIds.has(record.ctoId)) continue;

      if (!uniqueCtosMap.has(record.ctoId)) {
        uniqueCtosMap.set(record.ctoId, {
          ...record.cto,
          auditTime: record.timestamp,
          lastAction: record.action
        });
      }
    }

    const myDayCtos = Array.from(uniqueCtosMap.values());

    return NextResponse.json(myDayCtos);
  } catch (error: any) {
    console.error("Error en GET /api/my-day:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
