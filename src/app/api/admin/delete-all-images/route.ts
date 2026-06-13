import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import fs from "fs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Obtener todas las imágenes de la BD
    const images = await prisma.image.findMany();

    // Eliminar cada archivo físico
    for (const image of images) {
      const filename = image.url.split("/").pop();
      if (filename) {
        const filepath = join(process.cwd(), "public", "uploads", filename);
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (unlinkError) {
            console.error("Error al eliminar archivo del disco:", unlinkError);
          }
        }
      }
    }

    // Eliminar todos los registros de la base de datos
    await prisma.image.deleteMany();

    return NextResponse.json({ success: true, count: images.length });
  } catch (error: any) {
    console.error("Error al borrar todas las evidencias:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
