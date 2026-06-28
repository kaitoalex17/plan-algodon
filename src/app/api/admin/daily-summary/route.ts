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

    // Obtener la fecha de hoy en formato local de Madrid (DD/MM/YYYY)
    const todayMadridStr = new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });

    // Consultar el historial de los últimos 2 días para filtrar exactamente por la fecha local de Madrid
    const startOfRange = new Date();
    startOfRange.setDate(startOfRange.getDate() - 2);

    const historyLogs = await prisma.history.findMany({
      where: {
        timestamp: { gte: startOfRange }
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

    // Filtrar y agrupar por CTO para quedarnos con el último cambio relevante de hoy
    const auditedTodayMap = new Map<string, any>();

    for (const log of historyLogs) {
      const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      if (recordMadridStr !== todayMadridStr) continue;

      // Verificar si es un cambio de estado auditado (CORRECTO o FALLO)
      const isAuditAction = log.action.includes("Cambió estado") || log.action.includes("Formulario:") || log.action.includes("Requisitos de Auditoría");
      const isCtoAuditedState = log.cto && (log.cto.status === "CORRECTO" || log.cto.status === "FALLO");

      if (isCtoAuditedState && !auditedTodayMap.has(log.ctoId)) {
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
          auditor: log.cto.auditedBy?.name || log.user.name || log.user.email,
          auditTime,
          timestamp: log.timestamp.getTime()
        });
      }
    }

    // Convertir a array y ordenar cronológicamente
    const auditedList = Array.from(auditedTodayMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      date: todayMadridStr,
      count: auditedList.length,
      ctos: auditedList
    });
  } catch (error: any) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
