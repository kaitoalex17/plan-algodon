import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import fs from "fs";
import sharp from "sharp";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const { imageId, direction } = await req.json();
    if (!imageId || !direction) {
      return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    const filename = image.url.split("/").pop();
    if (!filename) {
      return NextResponse.json({ error: "Nombre de archivo no válido" }, { status: 400 });
    }

    const filepath = join(process.cwd(), "public", "uploads", filename);
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Archivo físico no encontrado" }, { status: 404 });
    }

    // Rotar imagen
    const angle = direction === "left" || direction === -90 ? 270 : 90;
    
    const imageBuffer = fs.readFileSync(filepath);
    const rotatedBuffer = await sharp(imageBuffer)
      .rotate(angle)
      .toBuffer();

    fs.writeFileSync(filepath, rotatedBuffer);

    // Retornar éxito con una marca de tiempo para forzar la actualización de caché en la interfaz
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error: any) {
    console.error("Error al rotar la imagen:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
