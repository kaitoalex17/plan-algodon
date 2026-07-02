import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      // return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["driveEnabled", "driveServiceAccount", "driveRootFolderId"]
        }
      }
    });

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      driveEnabled: settingsMap.driveEnabled === "true",
      driveServiceAccount: settingsMap.driveServiceAccount || "",
      driveRootFolderId: settingsMap.driveRootFolderId || "",
    });
  } catch (error) {
    console.error("Error al obtener ajustes de Drive:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      // return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { driveEnabled, driveServiceAccount, driveRootFolderId } = await req.json();

    const updates = [
      { key: "driveEnabled", value: driveEnabled ? "true" : "false" },
      { key: "driveServiceAccount", value: driveServiceAccount || "" },
      { key: "driveRootFolderId", value: driveRootFolderId || "" },
    ];

    for (const update of updates) {
      await prisma.setting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ success: true, message: "Ajustes de Drive guardados correctamente." });
  } catch (error) {
    console.error("Error al guardar ajustes de Drive:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
