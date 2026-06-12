import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: obtener detalles completos de una CTO (comentarios, imágenes, historial)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cto = await prisma.cTO.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, color: true }
        },
        subStatus: true,
        images: true,
        comments: {
          include: {
            user: { select: { name: true, color: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        history: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { timestamp: "desc" }
        }
      }
    });

    if (!cto) {
      return NextResponse.json({ error: "CTO no encontrada" }, { status: 404 });
    }

    return NextResponse.json(cto);
  } catch (error: any) {
    console.error("Error obteniendo detalles de CTO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: actualizar estado, sub-estado, notas, asignado y/o añadir comentarios
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { status, subStatusId, assignedToId, notas, commentText } = body;
    const userId = (session.user as any).id;

    // Obtener estado anterior para el historial
    const oldCto = await prisma.cTO.findUnique({
      where: { id: params.id },
      include: { subStatus: true }
    });

    if (!oldCto) {
      return NextResponse.json({ error: "CTO no encontrada" }, { status: 404 });
    }

    const updateData: any = {};
    const historyActions: string[] = [];

    if (status && status !== oldCto.status) {
      updateData.status = status;
      historyActions.push(`Cambió estado de ${oldCto.status} a ${status}`);
    }

    if (subStatusId !== undefined && subStatusId !== oldCto.subStatusId) {
      updateData.subStatusId = subStatusId;
      if (subStatusId) {
        const sub = await prisma.subStatus.findUnique({ where: { id: subStatusId } });
        historyActions.push(`Cambió sub-estado a: "${sub?.name || 'N/A'}"`);
      } else {
        historyActions.push("Quitó el sub-estado");
      }
    }

    if (assignedToId !== undefined && assignedToId !== oldCto.assignedToId) {
      updateData.assignedToId = assignedToId;
      if (assignedToId) {
        const u = await prisma.user.findUnique({ where: { id: assignedToId } });
        historyActions.push(`Asignó CTO a: ${u?.name || u?.email || 'N/A'}`);
      } else {
        historyActions.push("Desasignó la CTO");
      }
    }

    if (notas !== undefined && notas !== oldCto.notas) {
      updateData.notas = notas;
      historyActions.push("Actualizó las notas generales");
    }

    // Actualizar CTO en la BD
    const updatedCto = await prisma.cTO.update({
      where: { id: params.id },
      data: updateData
    });

    // Guardar comentario si se proporcionó
    if (commentText && commentText.trim() !== "") {
      await prisma.comment.create({
        data: {
          text: commentText.trim(),
          ctoId: params.id,
          userId: userId
        }
      });
      historyActions.push("Añadió un comentario");
    }

    // Registrar cambios en el historial
    if (historyActions.length > 0) {
      await prisma.history.create({
        data: {
          action: historyActions.join(" | "),
          ctoId: params.id,
          userId: userId
        }
      });
    }

    return NextResponse.json(updatedCto);
  } catch (error: any) {
    console.error("Error actualizando CTO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
