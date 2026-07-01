import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { join } from "path";
import fs from "fs";
import JSZip from "jszip";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== "ADMIN" && role !== "GESTOR" && role !== "AUDITOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ctoId = searchParams.get("ctoId");

    if (!ctoId) {
      return NextResponse.json({ error: "ID de CTO no proporcionado" }, { status: 400 });
    }

    const cto = await prisma.cTO.findUnique({
      where: { id: ctoId },
      include: { images: true }
    });

    if (!cto) {
      return NextResponse.json({ error: "CTO no encontrada" }, { status: 404 });
    }

    if (!cto.images || cto.images.length === 0) {
      return NextResponse.json({ error: "Esta CTO no tiene imágenes asociadas" }, { status: 400 });
    }

    const zip = new JSZip();
    const uploadDir = join(process.cwd(), "public", "uploads");

    for (const image of cto.images) {
      const filename = image.url.split("/").pop();
      if (!filename) continue;

      const filepath = join(uploadDir, filename);
      if (fs.existsSync(filepath)) {
        const fileBuffer = fs.readFileSync(filepath);
        // Usar el nombre original o el nombre de archivo guardado en el zip
        zip.file(filename, fileBuffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const safeNum = cto.num.replace(/[^a-zA-Z0-9.-]/g, "_");
    const response = new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=evidencias_cto_${safeNum}.zip`
      }
    });

    return response;
  } catch (error: any) {
    console.error("Error al descargar carpeta de evidencias de CTO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
