import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");
    const token = searchParams.get("token");
    const dateParam = searchParams.get("date"); // e.g. "2026-06-28"

    let isAuthorized = false;

    if (token) {
      const savedTokenSetting = await prisma.setting.findUnique({
        where: { key: "public_access_token" }
      });
      if (savedTokenSetting && savedTokenSetting.value === token) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const savedPasswordSetting = await prisma.setting.findUnique({
        where: { key: "public_report_password" }
      });
      const correctPassword = savedPasswordSetting?.value || "netdata";
      if (password === correctPassword) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Acceso denegado o token inválido" }, { status: 401 });
    }

    // Calcular la fecha objetivo en formato "es-ES" (Madrid) y rangos de búsqueda
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
            assignedTo: { select: { name: true } },
            auditedBy: { select: { name: true } }
          }
        },
        user: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    // 1. Identificar CTOs que tuvieron un cambio de estado a CORRECTO o FALLO en la fecha
    const auditedCtoIds = new Set<string>();
    for (const log of historyLogs) {
      const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
      if (recordMadridStr !== targetDateStr) continue;

      const action = (log.action || "").toLowerCase();
      if (
        action.includes("a correcto") ||
        action.includes("a fallo")
      ) {
        auditedCtoIds.add(log.ctoId);
      }
    }

    // 2. Agrupar por CTO solo las que cambiaron de estado hoy
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
          auditor: log.cto.auditedBy?.name || log.user.name || log.user.email,
          auditTime,
          timestamp: log.timestamp.getTime()
        });
      }
    }

    const auditedList = Array.from(auditedTodayMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      date: targetDateStr,
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
