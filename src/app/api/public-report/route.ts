import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");

    // 1. Obtener la contraseña de los ajustes o usar "netdata" por defecto
    const savedPasswordSetting = await prisma.setting.findUnique({
      where: { key: "public_report_password" }
    });
    const correctPassword = savedPasswordSetting?.value || "netdata";

    if (password !== correctPassword) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // 2. Obtener fecha de hoy en Madrid
    const todayMadridStr = new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
    const startOfRange = new Date();
    startOfRange.setDate(startOfRange.getDate() - 2);

    const historyLogs = await prisma.history.findMany({
      where: { timestamp: { gte: startOfRange } },
      include: {
        cto: {
          include: {
            subStatus: true,
            assignedTo: { select: { name: true } },
            auditedBy: { select: { name: true } }
          }
        },
        user: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    const auditedTodayMap = new Map<string, any>();

    for (const log of historyLogs) {
      const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      if (recordMadridStr !== todayMadridStr) continue;

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

    const auditedList = Array.from(auditedTodayMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      date: todayMadridStr,
      count: auditedList.length,
      ctos: auditedList
    });
  } catch (error: any) {
    console.error("Error in public report API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const savedPasswordSetting = await prisma.setting.findUnique({
      where: { key: "public_report_password" }
    });
    const correctPassword = savedPasswordSetting?.value || "netdata";

    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
