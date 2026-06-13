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

    const ctos = await prisma.cTO.findMany({
      include: {
        assignedTo: { select: { name: true, email: true } },
        subStatus: { select: { name: true } }
      },
      orderBy: { num: "asc" }
    });

    // Encabezados del Excel
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
      "Puertos Totales",
      "Puertos Ocupados",
      "Potencia (dBm)",
      "Cierre Seguridad",
      "Etiquetado Correcto",
      "Notas"
    ];

    // Construir filas
    const rows = ctos.map(cto => [
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
      cto.puertosTotal !== null ? cto.puertosTotal : "",
      cto.puertosOcupados !== null ? cto.puertosOcupados : "",
      cto.potenciaDbm !== null ? cto.potenciaDbm : "",
      cto.cierreSeguridad ? "OK" : "INCORRECTO",
      cto.etiquetadoCorrecto ? "SÍ" : "NO",
      cto.notas || ""
    ]);

    // Crear libro y hoja con XLSX (SheetJS)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "CTOs Auditadas");

    // Escribir a un buffer binario
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Retornar archivo Excel (.xlsx) como descarga directa
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=ctos_auditadas.xlsx"
      }
    });
  } catch (error: any) {
    console.error("Error al exportar datos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
