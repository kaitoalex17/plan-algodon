import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json({
      smtpHost: result["smtp_host"] || "",
      smtpPort: result["smtp_port"] || "587",
      smtpSecure: result["smtp_secure"] === "true",
      smtpUser: result["smtp_user"] || "",
      smtpPass: result["smtp_pass"] || "",
      emailRecipients: result["email_recipients"] || "",
      emailScheduleHour: result["email_schedule_hour"] || "20",
      emailScheduleEnabled: result["email_schedule_enabled"] === "true",
      publicReportPassword: result["public_report_password"] || "netdata"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass,
      emailRecipients, emailScheduleHour, emailScheduleEnabled, publicReportPassword
    } = body;

    const data = [
      { key: "smtp_host", value: smtpHost || "" },
      { key: "smtp_port", value: String(smtpPort || "587") },
      { key: "smtp_secure", value: smtpSecure ? "true" : "false" },
      { key: "smtp_user", value: smtpUser || "" },
      { key: "smtp_pass", value: smtpPass || "" },
      { key: "email_recipients", value: emailRecipients || "" },
      { key: "email_schedule_hour", value: String(emailScheduleHour || "20") },
      { key: "email_schedule_enabled", value: emailScheduleEnabled ? "true" : "false" },
      { key: "public_report_password", value: publicReportPassword || "netdata" }
    ];

    for (const item of data) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value }
      });
    }

    return NextResponse.json({ success: true, message: "Ajustes de correo guardados correctamente." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
