import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: editar sub-estado
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name, color } = await req.json();

    const subStatus = await prisma.subStatus.update({
      where: { id: params.id },
      data: {
        name,
        color
      }
    });

    return NextResponse.json(subStatus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: eliminar sub-estado
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Desvincular de todas las CTOs antes de eliminar
    await prisma.cTO.updateMany({
      where: { subStatusId: params.id },
      data: { subStatusId: null }
    });

    await prisma.subStatus.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
