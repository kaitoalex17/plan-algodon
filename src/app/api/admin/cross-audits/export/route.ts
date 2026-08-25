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

function generatePdfBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: any) => reject(err));
    doc.end();
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "excel";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const assignedToId = searchParams.get("assignedToId");
    const closedById = searchParams.get("closedById");
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");

    let startDateTime: Date | undefined;
    let endDateTime: Date | undefined;

    if (startDateParam) {
      startDateTime = new Date(`${startDateParam}T00:00:00+02:00`);
    }
    if (endDateParam) {
      endDateTime = new Date(`${endDateParam}T23:59:59.999+02:00`);
    }

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

    const [historyEntries, nonPendingCtos] = await Promise.all([
      prisma.history.findMany({
        where: historyWhere,
        include: {
          user: { select: { id: true, name: true, email: true } },
          cto: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true } },
              auditedBy: { select: { id: true, name: true, email: true } },
              subStatus: true
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
          assignedTo: { select: { id: true, name: true, email: true } },
          auditedBy: { select: { id: true, name: true, email: true } },
          subStatus: true,
          history: { include: { user: { select: { name: true } } }, orderBy: { timestamp: "desc" } }
        }
      })
    ]);

    const crossRecordsMap = new Map<string, any>();

    for (const h of historyEntries) {
      if (!h.cto) continue;
      const cto = h.cto;
      const originalAssigned = cto.assignedTo;
      const actingUser = h.user;

      const isCross = (originalAssigned && actingUser && originalAssigned.id !== actingUser.id) ||
                      (cto.auditedBy && originalAssigned && cto.auditedBy.id !== originalAssigned.id) ||
                      (h.action.toLowerCase().includes("reparada") && originalAssigned && originalAssigned.id !== actingUser.id);

      if (isCross) {
        const key = `${cto.id}-${actingUser?.id || "sys"}-${h.timestamp.toISOString().substring(0, 10)}`;
        if (!crossRecordsMap.has(key)) {
          crossRecordsMap.set(key, {
            ctoNum: cto.num,
            numeroNuevo: cto.numeroNuevo || "",
            municipio: cto.municipio || "N/A",
            colocacion: cto.colocacion || "N/A",
            zona: cto.zona || "N/A",
            category: cto.category,
            status: cto.status,
            subStatus: cto.subStatus?.name || "Sin subestado",
            assignedToName: originalAssigned?.name || "Sin asignar previo",
            closedByName: actingUser?.name || cto.auditedBy?.name || "Técnico",
            closedAt: h.timestamp.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
            rawDate: h.timestamp,
            action: h.action,
            location: h.location || ""
          });
        }
      }
    }

    for (const cto of nonPendingCtos) {
      if (cto.assignedTo && cto.auditedBy && cto.assignedTo.id !== cto.auditedBy.id) {
        const key = `${cto.id}-direct-${cto.auditedBy.id}`;
        if (!crossRecordsMap.has(key)) {
          const lastLog = cto.history && cto.history.length > 0 ? cto.history[0] : null;
          const logDate = lastLog ? lastLog.timestamp : new Date();
          crossRecordsMap.set(key, {
            ctoNum: cto.num,
            numeroNuevo: cto.numeroNuevo || "",
            municipio: cto.municipio || "N/A",
            colocacion: cto.colocacion || "N/A",
            zona: cto.zona || "N/A",
            category: cto.category,
            status: cto.status,
            subStatus: cto.subStatus?.name || "Sin subestado",
            assignedToName: cto.assignedTo.name || "Asignado",
            closedByName: cto.auditedBy.name || "Auditor",
            closedAt: logDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
            rawDate: logDate,
            action: lastLog ? lastLog.action : `Auditada como ${cto.status}`,
            location: lastLog?.location || ""
          });
        }
      }
    }

    let records = Array.from(crossRecordsMap.values());

    if (startDateTime || endDateTime) {
      records = records.filter(r => {
        if (startDateTime && r.rawDate < startDateTime) return false;
        if (endDateTime && r.rawDate > endDateTime) return false;
        return true;
      });
    }

    if (assignedToId && assignedToId !== "all") {
      records = records.filter(r => r.assignedToId === assignedToId);
    }
    if (closedById && closedById !== "all") {
      records = records.filter(r => r.closedById === closedById);
    }
    if (statusParam && statusParam !== "all") {
      records = records.filter(r => r.status === statusParam);
    }
    if (categoryParam && categoryParam !== "all") {
      records = records.filter(r => r.category === categoryParam);
    }

    records.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    // 1. FORMATO EXCEL
    if (format === "excel") {
      const rows = records.map((r, idx) => ({
        "Nº": idx + 1,
        "CTO": r.ctoNum,
        "Nº Nuevo": r.numeroNuevo,
        "Municipio": r.municipio,
        "Colocación / Dirección": r.colocacion,
        "Zona": r.zona,
        "Categoría": r.category === "PROGRAMADA" ? "Reparos" : "Auditoría",
        "Estado": r.status,
        "Subestado": r.subStatus,
        "👤 Técnico Asignado Original": r.assignedToName,
        "👤 Técnico que Cerró / Auditó": r.closedByName,
        "Fecha / Hora Cierre": r.closedAt,
        "Acción Registrada": r.action,
        "GPS / Ubicación": r.location
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Cierres Cruzados");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="Cierres_Cruzados_${startDateParam || "inicio"}_al_${endDateParam || "fin"}.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      });
    }

    // 2. FORMATO PDF
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

    // Registrar fuentes si están disponibles
    try {
      const fontBuffer = Buffer.from(robotoBase64, "base64");
      doc.registerFont("Roboto", fontBuffer);
      doc.font("Roboto");
    } catch (e) {
      doc.font("Helvetica");
    }

    // Header
    doc.fontSize(16).fillColor("#ff7900").text("Plan Algodón — Control de Cierres Cruzados", { align: "left" });
    doc.fontSize(10).fillColor("#64748b").text(`Período: ${startDateParam || "Inicio"} al ${endDateParam || "Hoy"} | Total Registros: ${records.length}`, { align: "left" });
    doc.moveDown(0.8);

    // Tabla simplificada
    const headers = ["Nº", "CTO", "Municipio", "Asignado a", "Cerrado por", "Estado", "Fecha Cierre"];
    const colWidths = [30, 90, 110, 140, 140, 90, 130];
    let startX = 30;
    let startY = doc.y;

    // Header Row
    doc.rect(startX, startY, 730, 20).fill("#f1f5f9");
    doc.fillColor("#0f172a").fontSize(8);
    let curX = startX;
    headers.forEach((h, i) => {
      doc.text(h, curX + 4, startY + 5, { width: colWidths[i] - 8, align: "left" });
      curX += colWidths[i];
    });

    startY += 22;
    doc.fillColor("#334155");

    records.forEach((r, idx) => {
      if (startY > 520) {
        doc.addPage();
        startY = 30;
      }

      if (idx % 2 === 0) {
        doc.rect(startX, startY, 730, 18).fill("#f8fafc");
      }

      doc.fillColor("#1e293b").fontSize(7.5);
      let cellX = startX;

      const cells = [
        String(idx + 1),
        r.ctoNum,
        r.municipio,
        r.assignedToName,
        r.closedByName,
        r.status,
        r.closedAt
      ];

      cells.forEach((val, i) => {
        doc.text(val, cellX + 4, startY + 4, { width: colWidths[i] - 8, align: "left", lineBreak: false });
        cellX += colWidths[i];
      });

      startY += 18;
    });

    const pdfBuffer = await generatePdfBuffer(doc);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Cierres_Cruzados_${startDateParam || "inicio"}_al_${endDateParam || "fin"}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error: any) {
    console.error("Error exportando cross-audits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
