import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndSendDailyReport } from "@/lib/scheduler";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Reset the last-sent date to allow re-sending
    await prisma.setting.upsert({
      where: { key: "email_last_sent_date" },
      update: { value: "" },
      create: { key: "email_last_sent_date", value: "" }
    });

    // Override the hour check by temporarily setting the target hour to 0
    const currentHourSetting = await prisma.setting.findUnique({ where: { key: "email_schedule_hour" } });
    const originalHour = currentHourSetting?.value || "20";

    await prisma.setting.upsert({
      where: { key: "email_schedule_hour" },
      update: { value: "0:00" },
      create: { key: "email_schedule_hour", value: "0:00" }
    });

    try {
      await checkAndSendDailyReport(prisma);
    } finally {
      // Restore the original hour
      await prisma.setting.upsert({
        where: { key: "email_schedule_hour" },
        update: { value: originalHour },
        create: { key: "email_schedule_hour", value: originalHour }
      });
    }

    return NextResponse.json({ success: true, message: "Reporte enviado manualmente." });
  } catch (error: any) {
    console.error("[Force-Send] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
