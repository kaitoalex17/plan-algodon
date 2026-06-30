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

    const { ctos, dryRun } = await req.json();

    if (!ctos || !Array.isArray(ctos)) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }

    // 1. Obtener todas las CTOs existentes en la base de datos para comparar
    const existingCtos = await prisma.cTO.findMany({
      select: {
        id: true,
        num: true
      }
    });

    // Mapear por número normalizado para búsqueda eficiente
    const ctoNumMap = new Map<string, string>(); // num normalizado -> id
    existingCtos.forEach(c => {
      ctoNumMap.set(c.num.trim().toLowerCase(), c.id);
    });

    const matches: Array<{ id: string; urlFicha: string }> = [];
    const unmatchedList: string[] = [];

    // 2. Procesar la lista a importar
    for (const row of ctos) {
      const ctoNum = String(row.ctoNum || "").trim();
      const urlFicha = String(row.urlFicha || "").trim();

      if (!ctoNum) continue;

      const normNum = ctoNum.toLowerCase();
      const ctoId = ctoNumMap.get(normNum);

      if (ctoId) {
        matches.push({ id: ctoId, urlFicha });
      } else {
        unmatchedList.push(ctoNum);
      }
    }

    // 3. Si es solo vista previa (dryRun), devolver estadísticas
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        total: ctos.length,
        matched: matches.length,
        unmatched: unmatchedList.length,
        unmatchedList
      });
    }

    // 4. Si es importación real, actualizar las CTOs coincidentes
    let updatedCount = 0;
    await prisma.$transaction(
      matches.map(m =>
        prisma.cTO.update({
          where: { id: m.id },
          data: { urlFicha: m.urlFicha || null }
        })
      )
    );
    updatedCount = matches.length;

    return NextResponse.json({
      success: true,
      dryRun: false,
      count: updatedCount
    });
  } catch (error: any) {
    console.error("Error importando URLs de UserSide:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
