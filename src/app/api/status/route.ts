import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: obtener lista de sub-estados
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const subStatuses = await prisma.subStatus.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(subStatuses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: crear nuevo sub-estado (solo ADMIN)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name, color } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const subStatus = await prisma.subStatus.create({
      data: {
        name,
        color: color || "#808080"
      }
    });

    return NextResponse.json(subStatus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
