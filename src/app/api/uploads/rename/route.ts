import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import fs from "fs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const { imageId, newName } = await req.json();
    if (!imageId || !newName) {
      return NextResponse.json({ error: "ID de imagen o nombre no proporcionado" }, { status: 400 });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    const oldFilename = image.url.split("/").pop();
    if (!oldFilename) {
      return NextResponse.json({ error: "Nombre de archivo antiguo no válido" }, { status: 400 });
    }

    const oldFilepath = join(process.cwd(), "public", "uploads", oldFilename);
    if (!fs.existsSync(oldFilepath)) {
      return NextResponse.json({ error: "Archivo original no encontrado" }, { status: 404 });
    }

    const ext = oldFilename.split(".").pop();
    const cleanName = newName.replace(/[^a-zA-Z0-9_-]/g, "_");
    // Conservamos el sufijo único original para evitar colisiones
    const parts = oldFilename.split("-");
    const uniqueSuffix = parts[0] + "-" + parts[1]; // timestamp-random
    const newFilename = `${uniqueSuffix}-${cleanName}.${ext}`;
    const newFilepath = join(process.cwd(), "public", "uploads", newFilename);

    // Renombrar en disco
    fs.renameSync(oldFilepath, newFilepath);

    // Actualizar en base de datos
    const newUrl = `/api/uploads/${newFilename}`;
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: { url: newUrl },
    });

    return NextResponse.json({ success: true, image: updatedImage });
  } catch (error: any) {
    console.error("Error al renombrar la imagen:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
