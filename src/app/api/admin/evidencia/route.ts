import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Verificar que el usuario sea administrador
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ctosWithImages = await prisma.cTO.findMany({
      where: {
        images: {
          some: {} // Al menos tiene una imagen
        }
      },
      include: {
        images: {
          orderBy: {
            id: "asc"
          }
        }
      },
      orderBy: {
        num: "asc"
      }
    });

    return NextResponse.json(ctosWithImages);
  } catch (error: any) {
    console.error("Error al obtener evidencias:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
