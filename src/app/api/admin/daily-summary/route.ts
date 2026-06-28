import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // e.g. "2026-06-28"

    let targetDateStr = "";
    let startOfRange = new Date();

    if (dateParam && dateParam !== "null" && dateParam !== "undefined" && dateParam.includes("-")) {
      const [y, m, d] = dateParam.split("-");
      const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
      targetDateStr = dObj.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });

      startOfRange = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 0, 0, 0);
      startOfRange.setDate(startOfRange.getDate() - 1);
    } else {
      targetDateStr = new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      startOfRange.setDate(startOfRange.getDate() - 2);
    }

    const endOfRange = new Date(startOfRange);
    endOfRange.setDate(endOfRange.getDate() + 3);

    const historyLogs = await prisma.history.findMany({
      where: {
        timestamp: {
          gte: startOfRange,
          lte: endOfRange
        }
      },
      include: {
        cto: {
          include: {
            subStatus: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            auditedBy: { select: { id: true, name: true, email: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    // 1. Primer paso: identificar los CTO IDs que tuvieron un cambio de estado a CORRECTO o FALLO hoy
    const auditedCtoIds = new Set<string>();
    for (const log of historyLogs) {
      const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      if (recordMadridStr !== targetDateStr) continue;

      const action = log.action || "";
      if (
        action.includes("a CORRECTO") ||
        action.includes("a FALLO") ||
        action.includes("a: CORRECTO") ||
        action.includes("a: FALLO")
      ) {
        auditedCtoIds.add(log.ctoId);
      }
    }

    // 2. Segundo paso: agrupar por CTO para quedarnos con el último cambio relevante, solo de las auditadas hoy
    const auditedTodayMap = new Map<string, any>();

    for (const log of historyLogs) {
      const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      if (recordMadridStr !== targetDateStr) continue;
      if (!log.cto) continue;
      if (!auditedCtoIds.has(log.ctoId)) continue;

      if (!auditedTodayMap.has(log.ctoId)) {
        const auditTime = log.timestamp.toLocaleTimeString("es-ES", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          minute: "2-digit"
        });

        auditedTodayMap.set(log.ctoId, {
          id: log.cto.id,
          num: log.cto.num,
          numeroNuevo: log.cto.numeroNuevo,
          cluster: log.cto.cluster || "N/A",
          zona: log.cto.zona || "N/A",
          status: log.cto.status,
          subStatusName: log.cto.subStatus?.name || "Sin Subestado",
          subStatusColor: log.cto.subStatus?.color || "#808080",
          lat: log.cto.lat,
          lng: log.cto.lng,
          coordenadas: log.cto.coordenadas,
          auditor: log.cto.auditedBy?.name || log.user?.name || log.user?.email || "Sistema",
          auditTime,
          timestamp: log.timestamp.getTime()
        });
      }
    }

    // Convertir a array y ordenar cronológicamente
    const auditedList = Array.from(auditedTodayMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      date: targetDateStr,
      count: auditedList.length,
      ctos: auditedList
    });
  } catch (error: any) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
