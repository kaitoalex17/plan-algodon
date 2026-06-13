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
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    // Devolver valores con fallback a WhatsApp HD (80% calidad, 1600px lado máximo)
    return NextResponse.json({
      imageQuality: settingsMap.imageQuality || "80",
      imageMaxWidth: settingsMap.imageMaxWidth || "1600",
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
    const { imageQuality, imageMaxWidth } = body;

    if (imageQuality !== undefined) {
      await prisma.setting.upsert({
        where: { key: "imageQuality" },
        update: { value: String(imageQuality) },
        create: { key: "imageQuality", value: String(imageQuality) }
      });
    }

    if (imageMaxWidth !== undefined) {
      await prisma.setting.upsert({
        where: { key: "imageMaxWidth" },
        update: { value: String(imageMaxWidth) },
        create: { key: "imageMaxWidth", value: String(imageMaxWidth) }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
