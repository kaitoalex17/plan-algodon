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

    // Obtener todas las CTOs con asignaciones, subestados y el último registro en historial
    const ctos = await prisma.cTO.findMany({
      include: {
        assignedTo: { select: { name: true, email: true } },
        subStatus: { select: { name: true } },
        history: {
          orderBy: { timestamp: "desc" },
          take: 1
        }
      },
      orderBy: { num: "asc" }
    });

    // Dividir en categorías (Auditoría vs Programadas/Planeadas)
    const auditoriaCtos = ctos.filter(c => c.category !== "PROGRAMADA");
    const planeadasCtos = ctos.filter(c => c.category === "PROGRAMADA");

    // Encabezados del Excel modificados (sin puertos, potencia, cierre ni etiquetado; con Fecha/Hora Auditoría)
    const headers = [
      "Número",
      "Número Nuevo",
      "Municipio",
      "Colocación",
      "Coordenadas",
      "Latitud",
      "Longitud",
      "Estado",
      "Subestado",
      "Asignado a",
      "Fecha y Hora Auditoría",
      "Notas"
    ];

    const mapCtoToRow = (cto: any) => {
      let auditDate = "No auditado";
      if (cto.status !== "PENDIENTE") {
        if (cto.history && cto.history.length > 0) {
          // Formatear fecha a formato español local
          auditDate = new Date(cto.history[0].timestamp).toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        } else {
          auditDate = "Auditado (Fecha N/A)";
        }
      }

      return [
        cto.num || "",
        cto.numeroNuevo || "",
        cto.municipio || "",
        cto.colocacion || "",
        cto.coordenadas || "",
        cto.lat || 0,
        cto.lng || 0,
        cto.status || "PENDIENTE",
        cto.subStatus?.name || "",
        cto.assignedTo ? (cto.assignedTo.name || cto.assignedTo.email) : "",
        auditDate,
        cto.notas || ""
      ];
    };

    // Crear libro con XLSX (SheetJS)
    const wb = XLSX.utils.book_new();

    // 1. Pestaña CTOs Auditoría
    const auditoriaRows = auditoriaCtos.map(mapCtoToRow);
    const wsAuditoria = XLSX.utils.aoa_to_sheet([headers, ...auditoriaRows]);
    XLSX.utils.book_append_sheet(wb, wsAuditoria, "CTOs Auditoría");

    // 2. Pestaña CTOs Planeadas
    const planeadasRows = planeadasCtos.map(mapCtoToRow);
    const wsPlaneadas = XLSX.utils.aoa_to_sheet([headers, ...planeadasRows]);
    XLSX.utils.book_append_sheet(wb, wsPlaneadas, "CTOs Planeadas");

    // Escribir a un buffer binario
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Retornar archivo Excel (.xlsx) como descarga directa
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=ctos_exportadas.xlsx"
      }
    });
  } catch (error: any) {
    console.error("Error al exportar datos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
