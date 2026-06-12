import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Filtro por los últimos 15 días
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);
    startDate.setHours(0, 0, 0, 0);

    // Obtener todo el historial de cambios de estado relevantes (Correcto, Fallo, Auditoría)
    // Buscamos acciones de historial que contengan "Cambió estado" o "Creada"
    const history = await prisma.history.findMany({
      where: {
        timestamp: { gte: startDate },
        action: {
          contains: "Cambió estado"
        },
        // Si es un técnico (USER), solo mostramos sus estadísticas. Si es ADMIN, de todos.
        ...(role !== "ADMIN" ? { userId } : {})
      },
      include: {
        user: { select: { name: true, email: true, color: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    // Agrupar por fecha e ID de usuario
    const groupedData: { [key: string]: { date: string; total: number; technicians: { [key: string]: { name: string; email: string; color: string; count: number } } } } = {};

    history.forEach(item => {
      // Formatear fecha a YYYY-MM-DD local
      const dateStr = item.timestamp.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });

      if (!groupedData[dateStr]) {
        groupedData[dateStr] = {
          date: dateStr,
          total: 0,
          technicians: {}
        };
      }

      groupedData[dateStr].total += 1;

      const techId = item.userId;
      const techName = item.user?.name || item.user?.email || "Técnico";
      const techEmail = item.user?.email || "";
      const techColor = item.user?.color || "#3b82f6";

      if (!groupedData[dateStr].technicians[techId]) {
        groupedData[dateStr].technicians[techId] = {
          name: techName,
          email: techEmail,
          color: techColor,
          count: 0
        };
      }

      groupedData[dateStr].technicians[techId].count += 1;
    });

    // Convertir objeto agrupado a un array ordenado por fecha descendente
    const stats = Object.values(groupedData).sort((a, b) => {
      const partsA = a.date.split("/");
      const partsB = b.date.split("/");
      // Comparar fechas dd/mm/yyyy
      const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
      const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
      return dateB.getTime() - dateA.getTime();
    });

    // También calcular estadísticas totales generales por técnico
    const totalByTech: { [key: string]: { name: string; color: string; total: number } } = {};
    history.forEach(item => {
      const techId = item.userId;
      const techName = item.user?.name || item.user?.email || "Técnico";
      const techColor = item.user?.color || "#3b82f6";

      if (!totalByTech[techId]) {
        totalByTech[techId] = { name: techName, color: techColor, total: 0 };
      }
      totalByTech[techId].total += 1;
    });

    return NextResponse.json({
      stats,
      totalByTech: Object.values(totalByTech),
      role
    });
  } catch (error: any) {
    console.error("Error al calcular estadísticas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
