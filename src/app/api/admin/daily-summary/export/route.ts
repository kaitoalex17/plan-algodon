import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";

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

// Función común para recolectar datos del día en Madrid
async function getDailySummaryData() {
  const todayMadridStr = new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
  const startOfRange = new Date();
  startOfRange.setDate(startOfRange.getDate() - 2);

  const historyLogs = await prisma.history.findMany({
    where: { timestamp: { gte: startOfRange } },
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

  const auditedTodayMap = new Map<string, any>();

  for (const log of historyLogs) {
    const recordMadridStr = log.timestamp.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
    if (recordMadridStr !== todayMadridStr) continue;

    const isCtoAuditedState = log.cto && (log.cto.status === "CORRECTO" || log.cto.status === "FALLO");

    if (isCtoAuditedState && !auditedTodayMap.has(log.ctoId)) {
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

  return {
    date: todayMadridStr,
    ctos: Array.from(auditedTodayMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  };
}

// Función común para construir el buffer del Excel
function buildExcelBuffer(ctos: any[], dateStr: string): Buffer {
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
    "Coordenadas": c.coordenadas
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Auditoría Diaria");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Función común para construir el buffer del PDF (PDFKit)
async function buildPdfBuffer(ctos: any[], dateStr: string): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40 });
  
  // Título principal
  doc.fillColor("#1e293b").fontSize(20).text("Reporte Diario de Auditoría", { align: "center" });
  doc.fontSize(12).fillColor("#64748b").text(`Plan Algodón - Fecha: ${dateStr}`, { align: "center" });
  doc.moveDown(1.5);

  // Resumen
  const total = ctos.length;
  const correctas = ctos.filter(c => c.status === "CORRECTO").length;
  const fallidas = ctos.filter(c => c.status === "FALLO").length;

  doc.fillColor("#0f172a").fontSize(12).text(`Resumen de actividad de hoy:`, { underline: true });
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

  for (const [techName, techCtos] of Object.entries(techGroups)) {
    doc.fillColor("#f97316").fontSize(12).text(`Técnico: ${techName} (${techCtos.length} auditadas)`, { underline: false });
    doc.moveDown(0.5);

    // Encabezados de tabla
    doc.fillColor("#475569").fontSize(9);
    doc.text("Hora", 40, doc.y, { width: 50, continued: true });
    doc.text("CTO", 90, doc.y, { width: 120, continued: true });
    doc.text("Zona/Cluster", 210, doc.y, { width: 100, continued: true });
    doc.text("Estado", 310, doc.y, { width: 70, continued: true });
    doc.text("Subestado", 380, doc.y, { width: 150 });
    doc.moveDown(0.3);
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Filas
    doc.fillColor("#0f172a");
    for (const cto of techCtos) {
      const currentY = doc.y;
      doc.text(cto.auditTime, 40, currentY, { width: 50 });
      doc.text(cto.num, 90, currentY, { width: 120 });
      doc.text(`${cto.zona} / ${cto.cluster}`, 210, currentY, { width: 100 });
      
      doc.fillColor(cto.status === "CORRECTO" ? "#166534" : "#991b1b");
      doc.text(cto.status, 310, currentY, { width: 70 });
      
      doc.fillColor("#475569");
      doc.text(cto.subStatusName, 380, currentY, { width: 150 });
      
      doc.moveDown(0.5);
      doc.fillColor("#0f172a");
    }
    doc.moveDown(1.5);
  }

  return generatePdfBuffer(doc);
}

// GET: Descargar directamente el Excel o el PDF
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "excel" o "pdf"

    const data = await getDailySummaryData();

    if (type === "pdf") {
      const buffer = await buildPdfBuffer(data.ctos, data.date);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=resumen_diario_${data.date.replace(/\//g, "-")}.pdf`
        }
      });
    } else {
      const buffer = buildExcelBuffer(data.ctos, data.date);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=resumen_diario_${data.date.replace(/\//g, "-")}.xlsx`
        }
      });
    }
  } catch (error: any) {
    console.error("Error exporting daily summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Enviar correo manual/de prueba
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Cargar configuraciones SMTP
    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    for (const s of settings) {
      config[s.key] = s.value;
    }

    const smtpHost = config["smtp_host"];
    const smtpPort = parseInt(config["smtp_port"] || "587");
    const smtpSecure = config["smtp_secure"] === "true";
    const smtpUser = config["smtp_user"];
    const smtpPass = config["smtp_pass"];
    const emailRecipients = config["email_recipients"];

    if (!smtpHost || !smtpUser || !smtpPass || !emailRecipients) {
      return NextResponse.json({ error: "Configuración SMTP incompleta o vacía en la base de datos." }, { status: 400 });
    }

    // 2. Obtener datos y generar adjuntos
    const data = await getDailySummaryData();
    const excelBuffer = buildExcelBuffer(data.ctos, data.date);
    const pdfBuffer = await buildPdfBuffer(data.ctos, data.date);

    // 3. Crear transportador nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const publicLink = `${proto}://${host}/public-report`;

    const formattedDate = data.date.replace(/\//g, "-");

    // 4. Enviar correo
    await transporter.sendMail({
      from: `"Plan Algodón Reporte" <${smtpUser}>`,
      to: emailRecipients,
      subject: `Resumen Diario de Auditoría - ${data.date} (Plan Algodón)`,
      text: `Adjunto encontrarás el reporte de auditoría de hoy (${data.date}).\n\nTotal CTOs Auditadas hoy: ${data.ctos.length}\n\nEnlace de acceso público: ${publicLink}\nContraseña: netdata`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px; margin-top: 0;">Plan Algodón - Reporte Diario</h2>
          <p>Se ha generado el reporte de auditoría diario correspondiente al día <strong>${data.date}</strong>.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;">📊 <strong>Resumen de actividad:</strong></p>
            <p style="margin: 4px 0; padding-left: 15px;">• Total CTOs Auditadas hoy: <strong>${data.ctos.length}</strong></p>
            <p style="margin: 4px 0; padding-left: 15px;">• Correctas: <strong>${data.ctos.filter(c => c.status === "CORRECTO").length}</strong></p>
            <p style="margin: 4px 0; padding-left: 15px;">• Fallidas: <strong>${data.ctos.filter(c => c.status === "FALLO").length}</strong></p>
          </div>
          <p>Puedes acceder a la visualización del mapa y lista pública en tiempo real aquí:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${publicLink}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver Reporte Interactivo</a>
          </p>
          <p style="font-size: 0.85rem; color: #64748b;">* Contraseña de acceso predeterminada: <strong>netdata</strong> (o la configurada por el administrador).</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-bottom: 0;">Plan Algodón - Reportes Automatizados</p>
        </div>
      `,
      attachments: [
        {
          filename: `resumen_diario_${formattedDate}.xlsx`,
          content: excelBuffer
        },
        {
          filename: `resumen_diario_${formattedDate}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    return NextResponse.json({ success: true, message: "Correo resumen enviado correctamente a todos los destinatarios." });
  } catch (error: any) {
    console.error("Error sending manual daily email summary:", error);
    return NextResponse.json({ error: "Error al enviar el correo: " + error.message }, { status: 500 });
  }
}
