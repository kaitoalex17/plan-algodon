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
    const startDateParam = searchParams.get("startDate"); // e.g. "2026-08-01"
    const endDateParam = searchParams.get("endDate"); // e.g. "2026-08-16"

    const todayMadridIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

    const startDateIso = startDateParam && startDateParam.includes("-") ? startDateParam : todayMadridIso;
    const endDateIso = endDateParam && endDateParam.includes("-") ? endDateParam : todayMadridIso;

    // Calcular márgenes de búsqueda para incluir desfase UTC
    const [sy, sm, sd] = startDateIso.split("-").map(Number);
    const [ey, em, ed] = endDateIso.split("-").map(Number);

    const startOfRange = new Date(sy, sm - 1, sd, 0, 0, 0);
    startOfRange.setDate(startOfRange.getDate() - 2);

    const endOfRange = new Date(ey, em - 1, ed, 23, 59, 59);
    endOfRange.setDate(endOfRange.getDate() + 2);

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

    // 1. Identificar registros relevantes dentro del rango en Madrid
    const auditedMap = new Map<string, any>();

    for (const log of historyLogs) {
      if (!log.cto) continue;

      const recordMadridDateIso = log.timestamp.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
      if (recordMadridDateIso < startDateIso || recordMadridDateIso > endDateIso) continue;

      const action = (log.action || "").toLowerCase();
      if (!action.includes("a correcto") && !action.includes("a fallo")) continue;

      // Clave única por CTO y Fecha para permitir múltiples auditorías en días distintos del período
      const key = `${log.ctoId}_${recordMadridDateIso}`;
      if (!auditedMap.has(key)) {
        const auditTime = log.timestamp.toLocaleTimeString("es-ES", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          minute: "2-digit"
        });
        const auditDate = log.timestamp.toLocaleDateString("es-ES", {
          timeZone: "Europe/Madrid",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

        auditedMap.set(key, {
          id: key,
          ctoId: log.cto.id,
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
          auditDate,
          rawDate: recordMadridDateIso,
          timestamp: log.timestamp.getTime()
        });
      }
    }

    const auditedList = Array.from(auditedMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      startDate: startDateIso,
      endDate: endDateIso,
      count: auditedList.length,
      ctos: auditedList
    });
  } catch (error: any) {
    console.error("Error generating period summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
