import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeHtml } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { substatuses, clearExisting, category } = await req.json();

    if (!substatuses || !Array.isArray(substatuses)) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }

    const activeCategory = category || "AUDITORIA";

    if (clearExisting) {
      await prisma.subStatus.deleteMany({
        where: { category: activeCategory }
      });
    }

    let createdCount = 0;
    for (const row of substatuses) {
      const name = decodeHtml(String(row.Nombre || row.name || "")).trim();
      const color = String(row.Color || row.color || "#808080").trim();

      if (!name) continue;

      const existing = await prisma.subStatus.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          category: activeCategory
        }
      });

      if (!existing) {
        await prisma.subStatus.create({
          data: {
            name,
            color,
            category: activeCategory
          }
        });
        createdCount++;
      } else if (row.Color || row.color) {
        await prisma.subStatus.update({
          where: { id: existing.id },
          data: { color }
        });
      }
    }

    return NextResponse.json({ success: true, count: createdCount });
  } catch (error: any) {
    console.error("Error importando subestados:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
