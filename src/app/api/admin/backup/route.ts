import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener datos de todas las tablas principales
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        color: true,
        lastLat: true,
        lastLng: true,
        lastZoom: true,
        zoomThreshold: true,
        theme: true,
        markerShape: true,
        markerSize: true,
        showProgramadas: true,
        mapLayer: true,
      },
    });

    const ctos = await prisma.cTO.findMany();
    const subStatuses = await prisma.subStatus.findMany();
    const comments = await prisma.comment.findMany();
    const history = await prisma.history.findMany();
    const alerts = await prisma.alert.findMany();
    const settings = await prisma.setting.findMany();

    // 2. Crear libro Excel con XLSX
    const wb = XLSX.utils.book_new();

    // Hoja 1: Usuarios
    const wsUsers = XLSX.utils.json_to_sheet(users);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Usuarios");

    // Hoja 2: CTOs
    const wsCtos = XLSX.utils.json_to_sheet(
      ctos.map((c) => ({
        ...c,
        fechaAgregacion: c.fechaAgregacion ? c.fechaAgregacion.toISOString() : null,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsCtos, "CTOs");

    // Hoja 3: Subestados
    const wsSubStatuses = XLSX.utils.json_to_sheet(subStatuses);
    XLSX.utils.book_append_sheet(wb, wsSubStatuses, "Subestados");

    // Hoja 4: Historial de Cambios
    const wsHistory = XLSX.utils.json_to_sheet(
      history.map((h) => ({
        ...h,
        timestamp: h.timestamp.toISOString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsHistory, "Historial");

    // Hoja 5: Comentarios
    const wsComments = XLSX.utils.json_to_sheet(
      comments.map((co) => ({
        ...co,
        createdAt: co.createdAt.toISOString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsComments, "Comentarios");

    // Hoja 6: Alertas
    const wsAlerts = XLSX.utils.json_to_sheet(
      alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsAlerts, "Alertas");

    // Hoja 7: Configuración
    const wsSettings = XLSX.utils.json_to_sheet(settings);
    XLSX.utils.book_append_sheet(wb, wsSettings, "Configuracion");

    // 3. Generar buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 4. Retornar archivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=plan_algodon_backup.xlsx",
      },
    });
  } catch (error: any) {
    console.error("Error generating backup:", error);
    return NextResponse.json(
      { error: "Error interno al generar la copia de seguridad" },
      { status: 500 }
    );
  }
}
