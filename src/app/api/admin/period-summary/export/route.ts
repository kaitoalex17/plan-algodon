import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/assets/fonts/robotoBase64";
import fs from "fs";
import { helveticaAfm } from "@/assets/fonts/helveticaAfm";

// Interceptar lecturas de Helvetica.afm para evitar ENOENT en entornos standalone / Docker
if (!(fs as any).__helvetica_patched) {
  (fs as any).__helvetica_patched = true;
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = function (this: any, path: any, options?: any) {
    if (typeof path === "string" && path.includes("Helvetica.afm")) {
      return options === "utf8" || (options && options.encoding === "utf8")
        ? helveticaAfm
        : Buffer.from(helveticaAfm, "utf8");
    }
    return (originalReadFileSync as any).apply(fs, arguments);
  } as any;

  const originalExistsSync = fs.existsSync;
  fs.existsSync = function (this: any, path: any) {
    if (typeof path === "string" && path.includes("Helvetica.afm")) {
      return true;
    }
    return (originalExistsSync as any).apply(fs, arguments);
  } as any;
}

// Helper para convertir flujo PDFKit a Buffer
function generatePdfBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: any) => reject(err));
    doc.end();
  });
}

// Función para recolectar datos del período
async function getPeriodSummaryData(startDateParam: string | null, endDateParam: string | null) {
  const todayMadridIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

  const startDateIso = startDateParam && startDateParam.includes("-") ? startDateParam : todayMadridIso;
  const endDateIso = endDateParam && endDateParam.includes("-") ? endDateParam : todayMadridIso;

  const [sy, sm, sd] = startDateIso.split("-").map(Number);
  const [ey, em, ed] = endDateIso.split("-").map(Number);

  const startOfRange = new Date(sy, sm - 1, sd, 0, 0, 0);
  startOfRange.setDate(startOfRange.getDate() - 2);

  const endOfRange = new Date(ey, em - 1, ed, 23, 59, 59);
  endOfRange.setDate(endOfRange.getDate() + 2);

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
          assignedTo: { select: { id: true, name: true, email: true } },
          auditedBy: { select: { id: true, name: true, email: true } }
        }
      },
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { timestamp: "desc" }
  });

  const auditedMap = new Map<string, any>();

  for (const log of historyLogs) {
    if (!log.cto) continue;

    const recordMadridDateIso = log.timestamp.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
    if (recordMadridDateIso < startDateIso || recordMadridDateIso > endDateIso) continue;

    const action = (log.action || "").toLowerCase();
    if (!action.includes("a correcto") && !action.includes("a fallo")) continue;

    const key = `${log.ctoId}_${recordMadridDateIso}`;
    if (!auditedMap.has(key)) {
      const auditTime = log.timestamp.toLocaleTimeString("es-ES", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit"
      });
      const auditDate = log.timestamp.toLocaleDateString("es-ES", {
        timeZone: "Europe/Madrid",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      auditedMap.set(key, {
        id: key,
        ctoId: log.cto.id,
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
        auditor: log.cto.auditedBy?.name || log.user?.name || log.user?.email || "Sistema",
        auditTime,
        auditDate,
        rawDate: recordMadridDateIso,
        timestamp: log.timestamp.getTime()
      });
    }
  }

  const startDateFormatted = new Date(sy, sm - 1, sd).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const endDateFormatted = new Date(ey, em - 1, ed).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return {
    startDateIso,
    endDateIso,
    startDateFormatted,
    endDateFormatted,
    ctos: Array.from(auditedMap.values()).sort((a, b) => b.timestamp - a.timestamp)
  };
}

// Función para construir el buffer del Excel con columna Fecha al final
function buildExcelBuffer(ctos: any[]): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = ctos.map(c => ({
    "Hora": c.auditTime,
    "Técnico Auditor": c.auditor,
    "Número CTO": c.num,
    "Número Nuevo": c.numeroNuevo || "N/A",
    "Zona": c.zona,
    "Cluster": c.cluster,
    "Estado": c.status,
    "Subestado": c.subStatusName,
    "Coordenadas": c.coordenadas,
    "Fecha": c.auditDate
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Auditoría Período");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Función para construir el buffer del PDF con columna Fecha al final
async function buildPdfBuffer(ctos: any[], startDateStr: string, endDateStr: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 40 });
  
  try {
    const fontBuffer = Buffer.from(robotoBase64, "base64");
    doc.registerFont("Roboto", fontBuffer);
    doc.font("Roboto");
  } catch (err) {
    console.error("Error al registrar fuente Roboto:", err);
  }
  
  // Título principal
  doc.fillColor("#1e293b").fontSize(20).text("Reporte de Auditoría por Período", { align: "center" });
  doc.fontSize(12).fillColor("#64748b").text(`Plan Algodón - Período: ${startDateStr} al ${endDateStr}`, { align: "center" });
  doc.moveDown(1.5);

  // Resumen
  const total = ctos.length;
  const correctas = ctos.filter(c => c.status === "CORRECTO").length;
  const fallidas = ctos.filter(c => c.status === "FALLO").length;

  doc.fillColor("#0f172a").fontSize(12).text(`Resumen de actividad del período:`, { underline: true });
  doc.fontSize(10).text(`• Total CTOs Auditadas: ${total}`);
  doc.text(`• Correctas: ${correctas}`);
  doc.text(`• Con Fallos: ${fallidas}`);
  doc.moveDown(2);

  // Agrupar por técnico
  const techGroups: Record<string, any[]> = {};
  for (const cto of ctos) {
    if (!techGroups[cto.auditor]) techGroups[cto.auditor] = [];
    techGroups[cto.auditor].push(cto);
  }

  const rowHeight = 22;

  for (const [techName, techCtos] of Object.entries(techGroups)) {
    if (doc.y > 600) {
      doc.addPage();
    }

    doc.fillColor("#f97316").fontSize(12).text(`Técnico: ${techName} (${techCtos.length} auditadas)`, { underline: false });
    doc.moveDown(0.5);

    // Cabeceras de la tabla
    const headerY = doc.y;
    doc.fillColor("#475569").fontSize(9);
    doc.text("Hora", 40, headerY, { width: 45 });
    doc.text("CTO", 85, headerY, { width: 95 });
    doc.text("Zona / Cluster", 180, headerY, { width: 90 });
    doc.text("Estado", 270, headerY, { width: 60 });
    doc.text("Subestado", 330, headerY, { width: 105 });
    doc.text("Fecha", 435, headerY, { width: 85 });

    doc.y = headerY + 14;
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.y += 6;

    // Filas
    for (const cto of techCtos) {
      if (doc.y > 700) {
        doc.addPage();
        
        const newPageHeaderY = doc.y;
        doc.fillColor("#475569").fontSize(9);
        doc.text("Hora", 40, newPageHeaderY, { width: 45 });
        doc.text("CTO", 85, newPageHeaderY, { width: 95 });
        doc.text("Zona / Cluster", 180, newPageHeaderY, { width: 90 });
        doc.text("Estado", 270, newPageHeaderY, { width: 60 });
        doc.text("Subestado", 330, newPageHeaderY, { width: 105 });
        doc.text("Fecha", 435, newPageHeaderY, { width: 85 });

        doc.y = newPageHeaderY + 14;
        doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.y += 6;
      }

      const currentY = doc.y;
      doc.fillColor("#0f172a").fontSize(8.5);
      doc.text(cto.auditTime, 40, currentY, { width: 45 });
      doc.text(cto.num, 85, currentY, { width: 95 });
      doc.text(`${cto.zona} / ${cto.cluster}`, 180, currentY, { width: 90 });
      
      doc.fillColor(cto.status === "CORRECTO" ? "#166534" : "#991b1b");
      doc.text(cto.status, 270, currentY, { width: 60 });
      
      doc.fillColor("#475569");
      doc.text(cto.subStatusName, 330, currentY, { width: 105 });

      doc.fillColor("#0f172a");
      doc.text(cto.auditDate, 435, currentY, { width: 85 });
      
      doc.y = currentY + rowHeight;
    }

    // Mapa estático OpenStreetMap si hay coordenadas
    let techMapBuffer: Buffer | null = null;
    try {
      const markers = techCtos
        .filter(c => {
          const lat = parseFloat(String(c.lat).replace(",", "."));
          const lng = parseFloat(String(c.lng).replace(",", "."));
          return !isNaN(lat) && !isNaN(lng);
        })
        .slice(0, 30)
        .map(c => {
          const lat = parseFloat(String(c.lat).replace(",", "."));
          const lng = parseFloat(String(c.lng).replace(",", "."));
          return `${lat},${lng},ol-marker`;
        })
        .join("|");

      if (markers) {
        const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?zoom=13&size=550x300&maptype=mapnik&markers=${markers}`;
        const res = await fetch(staticMapUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          techMapBuffer = Buffer.from(ab);
        }
      }
    } catch (err) {
      console.error(`Error cargando mapa OpenStreetMap para ${techName}:`, err);
    }

    if (techMapBuffer) {
      if (doc.y > 450) {
        doc.addPage();
      } else {
        doc.y += 10;
      }

      doc.fillColor("#1e293b").fontSize(10).text(`Ubicación de CTOs Auditadas - Técnico: ${techName}`, { align: "left" });
      doc.moveDown(0.4);
      try {
        doc.image(techMapBuffer, {
          fit: [480, 240],
          align: "center",
          valign: "center"
        });
        doc.moveDown(13);
      } catch (imgErr) {
        console.error("Error al incrustar imagen de mapa en PDF:", imgErr);
      }
    }

    doc.moveDown(1.5);
  }

  return generatePdfBuffer(doc);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "excel";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getPeriodSummaryData(startDate, endDate);

    if (type === "pdf") {
      const pdfBuffer = await buildPdfBuffer(data.ctos, data.startDateFormatted, data.endDateFormatted);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="auditoria_periodo_${data.startDateIso}_al_${data.endDateIso}.pdf"`
        }
      });
    }

    // Por defecto: Excel
    const excelBuffer = buildExcelBuffer(data.ctos);
    return new NextResponse(excelBuffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="auditoria_periodo_${data.startDateIso}_al_${data.endDateIso}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error("Error exporting period summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
