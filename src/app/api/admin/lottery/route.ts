import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const technicians = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });

    const zonesRaw = await prisma.cTO.findMany({
      distinct: ['zona'],
      where: { zona: { not: null } },
      select: { zona: true }
    });
    const zones = zonesRaw.map(z => z.zona).filter(Boolean).sort();

    return NextResponse.json({ technicians, zones });
  } catch (error: any) {
    console.error("Error fetching lottery options:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUserId = (session.user as any).id;
    const body = await req.json();
    const { participantIds, zones, drawUnassigned, drawAssignedToId, isDryRun } = body;

    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json({ error: "Debes seleccionar al menos un técnico participante" }, { status: 400 });
    }

    // 1. Obtener participantes
    const participants = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, name: true, email: true },
    });

    if (participants.length === 0) {
      return NextResponse.json({ error: "Técnicos no encontrados" }, { status: 404 });
    }

    // 2. Construir la consulta para CTOs a repartir
    const whereClause: any = {
      status: "PENDIENTE",
      category: { not: "PROGRAMADA" },
    };

    if (zones && zones.length > 0) {
      whereClause.zona = { in: zones };
    }

    const orConditions = [];
    if (drawUnassigned) {
      orConditions.push({ assignedToId: null });
    }
    if (drawAssignedToId) {
      orConditions.push({ assignedToId: drawAssignedToId });
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    } else {
      return NextResponse.json({ error: "Selecciona el origen de asignación (Sin asignar o técnico específico)" }, { status: 400 });
    }

    const ctos = await prisma.cTO.findMany({
      where: whereClause,
      include: { subStatus: true },
    });

    if (ctos.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No se encontraron CTOs pendientes que coincidan con los criterios seleccionados.",
        preview: {},
      });
    }

    // 3. Inicializar contadores por participante
    const assignments: Record<string, { userId: string; name: string; ctos: string[]; counts: Record<string, number> }> = {};
    for (const p of participants) {
      assignments[p.id] = {
        userId: p.id,
        name: p.name || p.email,
        ctos: [],
        counts: {},
      };
    }

    // Helper para clasificar subestados
    const getSubStatusGroup = (subName: string): "GROUP1" | "GROUP2" | "GROUP3" => {
      if (!subName) return "GROUP3";
      const name = subName.trim().toUpperCase();
      if (name === "EN CONSTRUCCIÓN" || name === "EN CONSTRUCCION" || name === "ACEPTADA") {
        return "GROUP1"; // Cluster-based
      }
      if (name === "ACEPTADAS" || name === "SINCRONIZADAS" || name === "SINCRONIZADA" || name === "CON REPARO" || name === "REPARO") {
        return "GROUP2"; // Individual equitable
      }
      return "GROUP3"; // Rest
    };

    // Clasificar CTOs
    const group1: typeof ctos = [];
    const group2: typeof ctos = [];
    const group3: typeof ctos = [];

    for (const cto of ctos) {
      const g = getSubStatusGroup(cto.subStatus?.name || "");
      if (g === "GROUP1") group1.push(cto);
      else if (g === "GROUP2") group2.push(cto);
      else group3.push(cto);
    }

    // --- REPARTO GRUPO 1: Basado en clúster ---
    // Agrupar por clúster
    const clusterMap: Record<string, typeof ctos> = {};
    for (const cto of group1) {
      const cl = cto.cluster || "SIN_CLUSTER";
      if (!clusterMap[cl]) clusterMap[cl] = [];
      clusterMap[cl].push(cto);
    }

    // Ordenar clústeres por tamaño descendente
    const sortedClusters = Object.entries(clusterMap).sort((a, b) => b[1].length - a[1].length);

    // Asignar clústeres greedy
    for (const [clusterName, clusterCtos] of sortedClusters) {
      // Encontrar el participante con menor carga de CTOs totales asignadas hasta el momento
      let targetP = participants[0].id;
      let minLoad = Infinity;

      for (const p of participants) {
        const load = assignments[p.id].ctos.length;
        if (load < minLoad) {
          minLoad = load;
          targetP = p.id;
        }
      }

      // Asignar todas las CTOs del clúster a este participante
      for (const cto of clusterCtos) {
        assignments[targetP].ctos.push(cto.id);
        const subName = cto.subStatus?.name || "Sin Subestado";
        assignments[targetP].counts[subName] = (assignments[targetP].counts[subName] || 0) + 1;
      }
    }

    // --- REPARTO GRUPO 2: Equitativo individual ---
    // Mezclar o repartir uno a uno
    for (const cto of group2) {
      let targetP = participants[0].id;
      let minLoad = Infinity;

      for (const p of participants) {
        const load = assignments[p.id].ctos.length;
        if (load < minLoad) {
          minLoad = load;
          targetP = p.id;
        }
      }

      assignments[targetP].ctos.push(cto.id);
      const subName = cto.subStatus?.name || "Sin Subestado";
      assignments[targetP].counts[subName] = (assignments[targetP].counts[subName] || 0) + 1;
    }

    // --- REPARTO GRUPO 3: Restantes individuales ---
    for (const cto of group3) {
      let targetP = participants[0].id;
      let minLoad = Infinity;

      for (const p of participants) {
        const load = assignments[p.id].ctos.length;
        if (load < minLoad) {
          minLoad = load;
          targetP = p.id;
        }
      }

      assignments[targetP].ctos.push(cto.id);
      const subName = cto.subStatus?.name || "Sin Subestado";
      assignments[targetP].counts[subName] = (assignments[targetP].counts[subName] || 0) + 1;
    }

    // 4. Si no es simulación, guardar en base de datos
    if (!isDryRun) {
      await prisma.$transaction(async (tx) => {
        for (const pId of Object.keys(assignments)) {
          const ctoIds = assignments[pId].ctos;
          const tech = participants.find((p) => p.id === pId);
          if (ctoIds.length === 0) continue;

          // Actualizar CTOs
          await tx.cTO.updateMany({
            where: { id: { in: ctoIds } },
            data: { assignedToId: pId },
          });

          // Registrar historial
          const techName = tech?.name || tech?.email || pId;
          const historyData = ctoIds.map((ctoId) => ({
            action: `Sorteo: Asignada a ${techName}`,
            ctoId,
            userId: adminUserId,
          }));

          await tx.history.createMany({
            data: historyData,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: isDryRun ? "Simulación de sorteo calculada con éxito." : "Sorteo aplicado y guardado correctamente.",
      preview: assignments,
    });
  } catch (error: any) {
    console.error("Error running lottery draw:", error);
    return NextResponse.json({ error: "Error interno al ejecutar el sorteo: " + error.message }, { status: 500 });
  }
}
