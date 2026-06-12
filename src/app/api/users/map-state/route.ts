import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { lat, lng, zoom } = await req.json();

    if (lat === undefined || lng === undefined || zoom === undefined) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLat: parseFloat(lat),
        lastLng: parseFloat(lng),
        lastZoom: parseInt(zoom),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error guardando estado del mapa:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
