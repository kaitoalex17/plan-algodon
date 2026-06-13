import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { promises as fs } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Sanitize filename to avoid path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = join(process.cwd(), "public", "uploads", safeFilename);

    const fileBuffer = await fs.readFile(filePath);

    // Get mime type based on extension
    const ext = safeFilename.split(".").pop()?.toLowerCase();
    let contentType = "image/jpeg";
    if (ext === "png") {
      contentType = "image/png";
    } else if (ext === "gif") {
      contentType = "image/gif";
    } else if (ext === "webp") {
      contentType = "image/webp";
    } else if (ext === "svg") {
      contentType = "image/svg+xml";
    }

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
