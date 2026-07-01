import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      // Descomentar en producción
    }

    const data = await req.formData();
    const files = data.getAll("files") as File[];
    const ctoId = data.get("ctoId") as string;

    if (!files || files.length === 0 || !ctoId) {
      return NextResponse.json({ error: "Archivos o CTO ID no proporcionados" }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Obtener parámetros de compresión de la base de datos (por defecto WhatsApp HD: 1600px max, 80% calidad)
    const qualitySetting = await prisma.setting.findUnique({ where: { key: "imageQuality" } });
    const maxWidthSetting = await prisma.setting.findUnique({ where: { key: "imageMaxWidth" } });
    
    const quality = qualitySetting ? parseInt(qualitySetting.value) : 80;
    const maxWidth = maxWidthSetting ? parseInt(maxWidthSetting.value) : 1600;

    const uploadedImages = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop()?.toLowerCase();
      let processedBuffer = buffer;

      // Comprimir imágenes si son formatos soportados
      if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) {
        try {
          let pipeline = sharp(buffer)
            .rotate()
            .resize({
              width: maxWidth,
              height: maxWidth,
              fit: "inside",
              withoutEnlargement: true
            });
          
          if (ext === "png") {
            pipeline = pipeline.png({ quality, compressionLevel: 8 });
          } else if (ext === "webp") {
            pipeline = pipeline.webp({ quality });
          } else {
            pipeline = pipeline.jpeg({ quality, progressive: true });
          }
          
          processedBuffer = await pipeline.toBuffer();
        } catch (sharpError) {
          console.error("Error al comprimir imagen con sharp:", sharpError);
        }
      }

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, processedBuffer);

      // Guardamos la URL apuntando a nuestra nueva API dinámica de uploads
      const imageUrl = `/api/uploads/${filename}`;
      
      let imageRecord = null;
      try {
        imageRecord = await prisma.image.create({
          data: {
            url: imageUrl,
            ctoId: ctoId,
          }
        });
      } catch (dbError) {
        console.warn("No se pudo guardar en BD (¿Base de datos apagada?), pero la imagen se subió.", dbError);
      }
      
      uploadedImages.push(imageRecord || { url: imageUrl });
    }

    return NextResponse.json({ success: true, images: uploadedImages });
  } catch (error: any) {
    console.error("Error subiendo imagen:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
