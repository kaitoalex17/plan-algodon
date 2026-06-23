import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { cto: { num: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [totalCount, history] = await Promise.all([
      prisma.history.count({ where }),
      prisma.history.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          cto: { select: { num: true, id: true } }
        },
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      history,
      totalCount,
      totalPages,
      currentPage: page
    });
  } catch (error: any) {
    console.error("Error en GET /api/admin/history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
