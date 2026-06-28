import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { robotoBase64 } from "@/assets/fonts/robotoBase64";
import fs from "fs";
import { helveticaAfm } from "@/assets/fonts/helveticaAfm";

// Interceptar lecturas de Helvetica.afm para evitar ENOENT en entornos standalone / Docker
if (!(fs as any).__helvetica_patched) {
  (fs as any).__helvetica_patched = true;
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = function (path: any, options?: any) {
    if (typeof path === "string" && path.includes("Helvetica.afm")) {
      return options === "utf8" || (options && options.encoding === "utf8")
        ? helveticaAfm
        : Buffer.from(helveticaAfm, "utf8");
    }
    return originalReadFileSync.apply(this, arguments as any);
  } as any;

  const originalExistsSync = fs.existsSync;
  fs.existsSync = function (path: any) {
    if (typeof path === "string" && path.includes("Helvetica.afm")) {
      return true;
    }
    return originalExistsSync.apply(this, arguments as any);
  } as any;
}

// Helper to convert PDF stream to Buffer
function generatePdfBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: any) => reject(err));
    doc.end();
  });
}

// Recolectar datos diarios de CTOs auditadas
async function getDailySummaryData(prisma: PrismaClient) {
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
    "Coordenadas": c.coordenadas
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Auditoría Diaria");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function buildPdfBuffer(ctos: any[], dateStr: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 40 });
  
  try {
    const fontBuffer = Buffer.from(robotoBase64, "base64");
    doc.registerFont("Roboto", fontBuffer);
    doc.font("Roboto");
  } catch (err) {
    console.error("Error al registrar fuente Roboto en scheduler:", err);
  }
  
  doc.fillColor("#1e293b").fontSize(20).text("Reporte Diario de Auditoría", { align: "center" });
  doc.fontSize(12).fillColor("#64748b").text(`Plan Algodón - Fecha: ${dateStr}`, { align: "center" });
  doc.moveDown(1.5);

  const total = ctos.length;
  const correctas = ctos.filter(c => c.status === "CORRECTO").length;
  const fallidas = ctos.filter(c => c.status === "FALLO").length;

  doc.fillColor("#0f172a").fontSize(12).text(`Resumen de actividad de hoy:`, { underline: true });
  doc.fontSize(10).text(`• Total CTOs Auditadas: ${total}`);
  doc.text(`• Correctas: ${correctas}`);
  doc.text(`• Con Fallos: ${fallidas}`);
  doc.moveDown(2);

  const techGroups: Record<string, any[]> = {};
  for (const cto of ctos) {
    if (!techGroups[cto.auditor]) techGroups[cto.auditor] = [];
    techGroups[cto.auditor].push(cto);
  }

  for (const [techName, techCtos] of Object.entries(techGroups)) {
    doc.fillColor("#f97316").fontSize(12).text(`Técnico: ${techName} (${techCtos.length} auditadas)`, { underline: false });
    doc.moveDown(0.5);

    doc.fillColor("#475569").fontSize(9);
    doc.text("Hora", 40, doc.y, { width: 50, continued: true });
    doc.text("CTO", 90, doc.y, { width: 120, continued: true });
    doc.text("Zona/Cluster", 210, doc.y, { width: 100, continued: true });
    doc.text("Estado", 310, doc.y, { width: 70, continued: true });
    doc.text("Subestado", 380, doc.y, { width: 150 });
    doc.moveDown(0.3);
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

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

// Función principal del planificador
export async function checkAndSendDailyReport(prisma: PrismaClient) {
  try {
    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    for (const s of settings) {
      config[s.key] = s.value;
    }

    // 1. Validar si está habilitado
    if (config["email_schedule_enabled"] !== "true") return;

    // 2. Determinar hora actual de Madrid
    const now = new Date();
    const madridDateStr = now.toLocaleDateString("en-US", { timeZone: "Europe/Madrid" }); // e.g. "6/28/2026"
    
    const formatterHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false
    });
    const currentHour = parseInt(formatterHour.format(now));
    const targetHour = parseInt(config["email_schedule_hour"] || "20");

    // 3. Comprobar si corresponde enviar a esta hora
    if (currentHour < targetHour) return;

    // 4. Comprobar si ya fue enviado hoy
    if (config["email_last_sent_date"] === madridDateStr) return;

    // Bloqueo inmediato guardando la fecha de envío en la BD
    await prisma.setting.upsert({
      where: { key: "email_last_sent_date" },
      update: { value: madridDateStr },
      create: { key: "email_last_sent_date", value: madridDateStr }
    });

    console.log(`[Scheduler] Iniciando envío de reporte diario automático para ${madridDateStr}...`);

    // 5. Cargar ajustes SMTP
    const smtpHost = config["smtp_host"];
    const smtpPort = parseInt(config["smtp_port"] || "587");
    const smtpSecure = config["smtp_secure"] === "true";
    const smtpUser = config["smtp_user"];
    const smtpPass = config["smtp_pass"];
    const emailRecipients = config["email_recipients"];

    if (!smtpHost || !smtpUser || !smtpPass || !emailRecipients) {
      console.warn("[Scheduler] SMTP config is incomplete. Cancelling automatic report send.");
      return;
    }

    // 6. Obtener datos y compilar adjuntos
    const data = await getDailySummaryData(prisma);
    const excelBuffer = buildExcelBuffer(data.ctos);
    const pdfBuffer = await buildPdfBuffer(data.ctos, data.date);

    // 7. Enviar correo
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Usar localhost o fallback ya que es un proceso en background sin req headers
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const publicLink = `${appUrl}/public-report`;

    const formattedDate = data.date.replace(/\//g, "-");

    await transporter.sendMail({
      from: `"Plan Algodón Reporte" <${smtpUser}>`,
      to: emailRecipients,
      subject: `Resumen Diario de Auditoría - ${data.date} (Plan Algodón)`,
      text: `Adjunto encontrarás el reporte de auditoría automático de hoy (${data.date}).\n\nTotal CTOs Auditadas hoy: ${data.ctos.length}\n\nEnlace de acceso público: ${publicLink}\nContraseña: netdata`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px; margin-top: 0;">Plan Algodón - Reporte Diario Automático</h2>
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
          <p style="font-size: 0.85rem; color: #64748b;">* Contraseña de acceso predeterminada: <strong>netdata</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <div style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-bottom: 0;">
            ${config["email_footer"] || 'Plan Algodón - Reportes Automatizados'}
          </div>
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

    console.log(`[Scheduler] Reporte diario enviado con éxito a ${emailRecipients} para la fecha ${madridDateStr}.`);
  } catch (error: any) {
    console.error("[Scheduler] Error in checkAndSendDailyReport:", error);
    // Resetear en caso de fallo para permitir reintento
    try {
      await prisma.setting.delete({ where: { key: "email_last_sent_date" } }).catch(() => {});
    } catch (e) {}
  }
}

export function startEmailScheduler(prisma: PrismaClient) {
  const globalObject = global as any;
  if (globalObject.emailSchedulerStarted) return;

  globalObject.emailSchedulerStarted = true;
  console.log("[Scheduler] Planificador de reporte diario de correo iniciado (Verificaciones cada 10 minutos)...");

  // Verificar cada 10 minutos
  setInterval(() => {
    checkAndSendDailyReport(prisma);
  }, 10 * 60 * 1000);

  // Ejecución inicial tras 10 segundos
  setTimeout(() => {
    checkAndSendDailyReport(prisma);
  }, 10000);
}
