import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: obtener detalles completos de una CTO (comentarios, imágenes, historial)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const cto = await prisma.cTO.findUnique({
      where: { id },
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
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { 
      status, subStatusId, assignedToId, notas, commentText,
      num, numeroNuevo, lat, lng, municipio, colocacion,
      puertosTotal, puertosOcupados, potenciaDbm, cierreSeguridad, etiquetadoCorrecto
    } = body;
    const userId = (session.user as any).id;

    // Obtener estado anterior para el historial
    const oldCto = await prisma.cTO.findUnique({
      where: { id },
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

    // Datos específicos de auditoría de fibra
    if (puertosTotal !== undefined && puertosTotal !== oldCto.puertosTotal) {
      updateData.puertosTotal = puertosTotal !== null ? parseInt(puertosTotal) : null;
      historyActions.push(`Puertos totales: ${puertosTotal}`);
    }
    if (puertosOcupados !== undefined && puertosOcupados !== oldCto.puertosOcupados) {
      updateData.puertosOcupados = puertosOcupados !== null ? parseInt(puertosOcupados) : null;
      historyActions.push(`Puertos ocupados: ${puertosOcupados}`);
    }
    if (potenciaDbm !== undefined && potenciaDbm !== oldCto.potenciaDbm) {
      updateData.potenciaDbm = potenciaDbm !== null ? parseFloat(potenciaDbm) : null;
      historyActions.push(`Potencia óptica: ${potenciaDbm} dBm`);
    }
    if (cierreSeguridad !== undefined && cierreSeguridad !== oldCto.cierreSeguridad) {
      updateData.cierreSeguridad = cierreSeguridad;
      historyActions.push(`Cierre de seguridad: ${cierreSeguridad ? 'Correcto' : 'Incorrecto'}`);
    }
    if (etiquetadoCorrecto !== undefined && etiquetadoCorrecto !== oldCto.etiquetadoCorrecto) {
      updateData.etiquetadoCorrecto = etiquetadoCorrecto;
      historyActions.push(`Etiquetado correcto: ${etiquetadoCorrecto ? 'Sí' : 'No'}`);
    }

    // Campos de administrador adicionales
    if (num !== undefined && num !== oldCto.num) {
      updateData.num = String(num);
      historyActions.push(`Modificó el número de CTO a "${num}"`);
    }
    if (numeroNuevo !== undefined && numeroNuevo !== oldCto.numeroNuevo) {
      updateData.numeroNuevo = numeroNuevo ? String(numeroNuevo) : null;
      historyActions.push(`Modificó el número nuevo a "${numeroNuevo || 'N/A'}"`);
    }
    if (lat !== undefined && lat !== oldCto.lat) {
      updateData.lat = parseFloat(lat);
      historyActions.push(`Modificó latitud a ${lat}`);
    }
    if (lng !== undefined && lng !== oldCto.lng) {
      updateData.lng = parseFloat(lng);
      historyActions.push(`Modificó longitud a ${lng}`);
    }
    if (lat !== undefined || lng !== undefined) {
      updateData.coordenadas = `${updateData.lat ?? oldCto.lat}, ${updateData.lng ?? oldCto.lng}`;
    }
    if (municipio !== undefined && municipio !== oldCto.municipio) {
      updateData.municipio = municipio ? String(municipio) : null;
      historyActions.push(`Modificó municipio a "${municipio || 'N/A'}"`);
    }
    if (colocacion !== undefined && colocacion !== oldCto.colocacion) {
      updateData.colocacion = colocacion ? String(colocacion) : null;
      historyActions.push(`Modificó colocación a "${colocacion || 'N/A'}"`);
    }

    // Actualizar CTO en la BD
    const updatedCto = await prisma.cTO.update({
      where: { id },
      data: updateData
    });

    // Guardar comentario si se proporcionó
    if (commentText && commentText.trim() !== "") {
      await prisma.comment.create({
        data: {
          text: commentText.trim(),
          ctoId: id,
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
          ctoId: id,
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

// DELETE: Eliminar una CTO individual por un administrador
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.cTO.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando CTO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
