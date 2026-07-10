import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const qualitySetting = await prisma.setting.findUnique({ where: { key: "imageQuality" } });
    const maxWidthSetting = await prisma.setting.findUnique({ where: { key: "imageMaxWidth" } });

    return NextResponse.json({
      imageQuality: qualitySetting ? parseInt(qualitySetting.value) : 80,
      imageMaxWidth: maxWidthSetting ? parseInt(maxWidthSetting.value) : 1600,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
