import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate"); // YYYY-MM-DD
    const endDateParam = searchParams.get("endDate");     // YYYY-MM-DD
    const assignedToId = searchParams.get("assignedToId");
    const closedById = searchParams.get("closedById");
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");

    // Construir límites de fecha con zona horaria Madrid
    let startDateTime: Date | undefined;
    let endDateTime: Date | undefined;

    if (startDateParam) {
      startDateTime = new Date(`${startDateParam}T00:00:00+02:00`);
    }
    if (endDateParam) {
      endDateTime = new Date(`${endDateParam}T23:59:59.999+02:00`);
    }

    // 1. Obtener historial relevante de cierres, auditorías y reparaciones
    const historyWhere: any = {
      OR: [
        { action: { contains: "correcto", mode: "insensitive" } },
        { action: { contains: "fallo", mode: "insensitive" } },
        { action: { contains: "revisado", mode: "insensitive" } },
        { action: { contains: "reparada por", mode: "insensitive" } },
        { action: { contains: "reparo", mode: "insensitive" } }
      ]
    };

    if (startDateTime || endDateTime) {
      historyWhere.timestamp = {};
      if (startDateTime) historyWhere.timestamp.gte = startDateTime;
      if (endDateTime) historyWhere.timestamp.lte = endDateTime;
    }

    const [historyEntries, nonPendingCtos, users, subStatuses] = await Promise.all([
      prisma.history.findMany({
        where: historyWhere,
        include: {
          user: { select: { id: true, name: true, email: true, color: true } },
          cto: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true, color: true } },
              auditedBy: { select: { id: true, name: true, email: true, color: true } },
              subStatus: true,
              images: true,
              comments: { include: { user: { select: { name: true, color: true } } } },
              history: { include: { user: { select: { name: true, color: true } } }, orderBy: { timestamp: "desc" } }
            }
          }
        },
        orderBy: { timestamp: "desc" }
      }),
      prisma.cTO.findMany({
        where: {
          status: { in: ["CORRECTO", "FALLO", "REVISADO"] }
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true, color: true } },
          auditedBy: { select: { id: true, name: true, email: true, color: true } },
          subStatus: true,
          images: true,
          comments: { include: { user: { select: { name: true, color: true } } } },
          history: { include: { user: { select: { name: true, color: true } } }, orderBy: { timestamp: "desc" } }
        }
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, color: true },
        orderBy: { name: "asc" }
      }),
      prisma.subStatus.findMany({
        orderBy: { name: "asc" }
      })
    ]);

    const crossRecordsMap = new Map<string, any>();

    // A. Procesar historial para detectar acciones donde el usuario que ejecuta no es el asignado
    for (const h of historyEntries) {
      if (!h.cto) continue;
      const cto = h.cto;
      const originalAssigned = cto.assignedTo;
      const actingUser = h.user;

      // Condición de cierre cruzado:
      // Había un técnico asignado y quien ejecutó la acción fue otra persona (o auditedBy es diferente)
      const isCross = (originalAssigned && actingUser && originalAssigned.id !== actingUser.id) ||
                      (cto.auditedBy && originalAssigned && cto.auditedBy.id !== originalAssigned.id) ||
                      (h.action.toLowerCase().includes("reparada") && originalAssigned && originalAssigned.id !== actingUser.id);

      if (isCross) {
        const key = `${cto.id}-${actingUser?.id || "sys"}-${h.timestamp.toISOString().substring(0, 10)}`;
        if (!crossRecordsMap.has(key)) {
          crossRecordsMap.set(key, {
            id: `${cto.id}-${h.id}`,
            ctoId: cto.id,
            ctoNum: cto.num,
            numeroNuevo: cto.numeroNuevo,
            municipio: cto.municipio || "N/A",
            colocacion: cto.colocacion || "N/A",
            zona: cto.zona || "N/A",
            cluster: cto.cluster || "N/A",
            category: cto.category,
            status: cto.status,
            subStatus: cto.subStatus?.name || "Sin subestado",
            subStatusColor: cto.subStatus?.color || "#808080",
            assignedTo: originalAssigned || { name: "Sin asignar previo", color: "#64748b" },
            closedBy: actingUser || cto.auditedBy || { name: "Técnico", color: "#3b82f6" },
            closedAt: h.timestamp.toISOString(),
            action: h.action,
            location: h.location || null,
            ctoRaw: cto
          });
        }
      }
    }

    // B. Procesar CTOs no pendientes directamente por asignación vs auditor
    for (const cto of nonPendingCtos) {
      if (cto.assignedTo && cto.auditedBy && cto.assignedTo.id !== cto.auditedBy.id) {
        const key = `${cto.id}-direct-${cto.auditedBy.id}`;
        if (!crossRecordsMap.has(key)) {
          const lastLog = cto.history && cto.history.length > 0 ? cto.history[0] : null;
          crossRecordsMap.set(key, {
            id: `${cto.id}-direct`,
            ctoId: cto.id,
            ctoNum: cto.num,
            numeroNuevo: cto.numeroNuevo,
            municipio: cto.municipio || "N/A",
            colocacion: cto.colocacion || "N/A",
            zona: cto.zona || "N/A",
            cluster: cto.cluster || "N/A",
            category: cto.category,
            status: cto.status,
            subStatus: cto.subStatus?.name || "Sin subestado",
            subStatusColor: cto.subStatus?.color || "#808080",
            assignedTo: cto.assignedTo,
            closedBy: cto.auditedBy,
            closedAt: lastLog ? lastLog.timestamp.toISOString() : new Date().toISOString(),
            action: lastLog ? lastLog.action : `Auditada como ${cto.status}`,
            location: lastLog?.location || null,
            ctoRaw: cto
          });
        }
      }
    }

    let records = Array.from(crossRecordsMap.values());

    // Filtro por fecha si no vino por history timestamp
    if (startDateTime || endDateTime) {
      records = records.filter(r => {
        const d = new Date(r.closedAt);
        if (startDateTime && d < startDateTime) return false;
        if (endDateTime && d > endDateTime) return false;
        return true;
      });
    }

    // Filtro por Técnico Asignado
    if (assignedToId && assignedToId !== "all") {
      records = records.filter(r => r.assignedTo?.id === assignedToId);
    }

    // Filtro por Técnico que Cerró
    if (closedById && closedById !== "all") {
      records = records.filter(r => r.closedBy?.id === closedById);
    }

    // Filtro por Estado
    if (statusParam && statusParam !== "all") {
      records = records.filter(r => r.status === statusParam);
    }

    // Filtro por Categoría
    if (categoryParam && categoryParam !== "all") {
      records = records.filter(r => r.category === categoryParam);
    }

    // Ordenar por fecha de cierre descendente
    records.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

    // Estadísticas
    const totalCross = records.length;
    const correctas = records.filter(r => r.status === "CORRECTO" || r.status === "REVISADO").length;
    const fallos = records.filter(r => r.status === "FALLO").length;
    const reparos = records.filter(r => r.category === "PROGRAMADA" || r.action.toLowerCase().includes("repar")).length;

    return NextResponse.json({
      records,
      stats: {
        totalCross,
        correctas,
        fallos,
        reparos
      },
      users,
      subStatuses
    });
  } catch (error: any) {
    console.error("Error en API cross-audits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
