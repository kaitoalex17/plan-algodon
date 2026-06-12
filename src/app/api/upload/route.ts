import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";

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

    const uploadedImages = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, buffer);

      const imageUrl = `/uploads/${filename}`;
      
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
