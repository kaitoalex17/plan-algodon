/**
 * mailer.ts — Sistema centralizado de envío de correo de Plan Algodón
 *
 * Soporta 3 métodos:
 *   "brevo"    → API REST de Brevo v3 (recomendado, sin SMTP, fiable con adjuntos)
 *   "smtp"     → SMTP clásico con nodemailer (para proveedores SMTP genéricos)
 *   "sendmail" → Sendmail local del servidor Linux (sin credenciales)
 */

import nodemailer from "nodemailer";

export interface MailAttachment {
  filename: string;
  content: Buffer; // raw buffer
}

export interface SendMailOptions {
  to: string;           // destinatarios separados por coma
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
  senderName?: string;
  senderEmail?: string;
}

export interface MailConfig {
  method: "brevo" | "smtp" | "sendmail";
  // Brevo API
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  brevoSenderName?: string;
  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brevo REST API (recomendado)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaBrevoApi(opts: SendMailOptions, cfg: MailConfig): Promise<{ messageId?: string }> {
  const apiKey = cfg.brevoApiKey?.trim();
  if (!apiKey) throw new Error("Brevo API Key no configurada. Ve a Brevo → Settings → SMTP & API → API Keys y crea una clave.");

  const senderEmail = (opts.senderEmail || cfg.brevoSenderEmail || "").trim();
  const senderName  = (opts.senderName  || cfg.brevoSenderName  || "Plan Algodón").trim();
  if (!senderEmail) throw new Error("Debes configurar el email del remitente (Brevo Sender Email). Debe ser un dominio o email verificado en Brevo.");

  // Parsear destinatarios (pueden ser varios separados por coma)
  const toList = opts.to.split(",")
    .map(e => e.trim())
    .filter(Boolean)
    .map(e => ({ email: e }));

  // Convertir adjuntos a base64
  const attachments = (opts.attachments || []).map(a => ({
    name: a.filename,
    content: a.content.toString("base64"),
  }));

  const body: any = {
    sender: { name: senderName, email: senderEmail },
    to: toList,
    subject: opts.subject,
    htmlContent: opts.html,
    textContent: opts.text || "",
  };

  if (attachments.length > 0) {
    body.attachment = attachments;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `Brevo API error ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = `Brevo API ${res.status}: ${errJson.message || JSON.stringify(errJson)}`;
      // Pistas específicas
      if (res.status === 401) errMsg += " — API Key inválida o sin permisos. Genera una nueva en Brevo → Settings → SMTP & API → API Keys.";
      if (res.status === 400 && errJson.message?.includes("sender")) errMsg += " — El email del remitente no está verificado en Brevo. Verifica el dominio o email en Brevo → Senders & IP.";
    } catch {}
    throw new Error(errMsg);
  }

  const result = await res.json();
  console.log("[Mailer/Brevo] Enviado correctamente. MessageId:", result.messageId);
  return { messageId: result.messageId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMTP (nodemailer)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaSmtp(opts: SendMailOptions, cfg: MailConfig): Promise<{ messageId?: string }> {
  const host = cfg.smtpHost?.trim();
  const user = cfg.smtpUser?.trim();
  const pass = cfg.smtpPass?.trim();
  const port = cfg.smtpPort || 587;

  if (!host || !user || !pass) throw new Error("Configuración SMTP incompleta. Host, usuario y contraseña son obligatorios.");

  const secure = port === 465; // SSL directo solo en puerto 465; 587 usa STARTTLS

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  // Verificar conexión antes de enviar
  await transporter.verify();
  console.log("[Mailer/SMTP] Conexión verificada.");

  const senderEmail = opts.senderEmail || user;
  const senderName  = opts.senderName  || "Plan Algodón";

  const info = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || "",
    html: opts.html,
    attachments: (opts.attachments || []).map(a => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  console.log("[Mailer/SMTP] Enviado. MessageId:", info.messageId);
  return { messageId: info.messageId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sendmail local
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaSendmail(opts: SendMailOptions, cfg: MailConfig): Promise<{ messageId?: string }> {
  const transporter = nodemailer.createTransport({
    sendmail: true,
    newline: "unix",
    path: "/usr/sbin/sendmail",
  } as any);

  const info = await transporter.sendMail({
    from: `"${opts.senderName || "Plan Algodón"}" <${opts.senderEmail || "noreply@plan-algodon.com"}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || "",
    html: opts.html,
    attachments: (opts.attachments || []).map(a => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  console.log("[Mailer/Sendmail] Enviado. MessageId:", info.messageId);
  return { messageId: info.messageId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal exportada
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMail(opts: SendMailOptions, cfg: MailConfig): Promise<{ messageId?: string }> {
  console.log(`[Mailer] Enviando con método: ${cfg.method} → Para: ${opts.to} | Asunto: ${opts.subject}`);

  if (cfg.method === "brevo") {
    return sendViaBrevoApi(opts, cfg);
  } else if (cfg.method === "smtp") {
    return sendViaSmtp(opts, cfg);
  } else {
    return sendViaSendmail(opts, cfg);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper para construir la configuración de correo desde los settings de la BD
// ─────────────────────────────────────────────────────────────────────────────
export function buildMailConfigFromSettings(config: Record<string, string>): MailConfig {
  const method = (config["email_method"] || "brevo") as MailConfig["method"];
  return {
    method,
    brevoApiKey: config["brevo_api_key"] || "",
    brevoSenderEmail: config["brevo_sender_email"] || "",
    brevoSenderName: config["brevo_sender_name"] || "Plan Algodón",
    smtpHost: config["smtp_host"] || "",
    smtpPort: parseInt(config["smtp_port"] || "587"),
    smtpUser: config["smtp_user"] || "",
    smtpPass: config["smtp_pass"] || "",
  };
}
