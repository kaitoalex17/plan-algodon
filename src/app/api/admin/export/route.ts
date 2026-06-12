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

    const ctos = await prisma.cTO.findMany({
      include: {
        assignedTo: { select: { name: true, email: true } },
        subStatus: { select: { name: true } }
      },
      orderBy: { num: "asc" }
    });

    // Función auxiliar para escapar campos CSV
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val).trim();
      // Si contiene comillas, comas, saltos de línea o retornos de carro, envolver en comillas
      if (/[",\n\r]/.test(str)) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Encabezados del CSV
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
      escapeCsv(cto.num),
      escapeCsv(cto.numeroNuevo),
      escapeCsv(cto.municipio),
      escapeCsv(cto.colocacion),
      escapeCsv(cto.coordenadas),
      escapeCsv(cto.lat),
      escapeCsv(cto.lng),
      escapeCsv(cto.status),
      escapeCsv(cto.subStatus?.name),
      escapeCsv(cto.assignedTo ? (cto.assignedTo.name || cto.assignedTo.email) : ""),
      escapeCsv(cto.puertosTotal),
      escapeCsv(cto.puertosOcupados),
      escapeCsv(cto.potenciaDbm),
      escapeCsv(cto.cierreSeguridad ? "OK" : "INCORRECTO"),
      escapeCsv(cto.etiquetadoCorrecto ? "SÍ" : "NO"),
      escapeCsv(cto.notas)
    ]);

    // Añadir el BOM de UTF-8 para que Excel detecte correctamente los acentos y la eñe
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

    // Retornar archivo CSV como descarga directa
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=ctos_auditadas.csv"
      }
    });
  } catch (error: any) {
    console.error("Error al exportar datos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
