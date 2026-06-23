import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { decodeHtml } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { ctos, clearExisting, category } = await req.json();

    if (!ctos || !Array.isArray(ctos)) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }

    const activeCategory = category || "AUDITORIA";

    if (clearExisting) {
      // Eliminar historial, comentarios y fotos asociadas de la categoría específica antes de limpiar
      await prisma.cTO.deleteMany({
        where: { category: activeCategory }
      });
    }

    // Recopilar todos los nombres de subestados únicos
    const uniqueSubStatusNames = new Set<string>();
    for (const row of ctos) {
      const subName = row.Estado || row.Subestado || row.substatus;
      if (subName && typeof subName === "string") {
        const trimmed = subName.trim();
        if (trimmed) {
          uniqueSubStatusNames.add(trimmed);
        }
      }
    }

    // Asegurarse de que todos estos subestados existan en la BD
    const subStatusMap = new Map<string, string>(); // nombre -> id
    for (const name of Array.from(uniqueSubStatusNames)) {
      let sub = await prisma.subStatus.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          category: activeCategory
        }
      });
      if (!sub) {
        sub = await prisma.subStatus.create({
          data: {
            name,
            color: "#808080",
            category: activeCategory
          }
        });
      }
      subStatusMap.set(name.toLowerCase(), sub.id);
    }

    const formattedCtos = [];
    for (const row of ctos) {
      let lat = 0;
      let lng = 0;
      if (row.Coordenadas && typeof row.Coordenadas === 'string') {
        const parts = row.Coordenadas.split(',');
        if (parts.length >= 2) {
          lat = parseFloat(parts[0].trim());
          lng = parseFloat(parts[1].trim());
        }
      } else if (row.Latitud && row.Longitud) {
        lat = parseFloat(String(row.Latitud));
        lng = parseFloat(String(row.Longitud));
      }

      if (lat === 0 || lng === 0) continue;

      let fecha = new Date();
      if (typeof row['Fecha de agregación'] === 'number') {
        fecha = new Date(Math.round((row['Fecha de agregación'] - 25569) * 86400 * 1000));
      }

      const subName = row.Estado || row.Subestado || row.substatus;
      const subStatusId = subName ? (subStatusMap.get(String(subName).trim().toLowerCase()) || null) : null;

      // Intentar mapear estado de CTO
      let ctoStatus = "PENDIENTE";
      const rawStatus = row.Estado_CTO || row.EstadoCTO || row.status || row.Status;
      if (rawStatus) {
        const upper = String(rawStatus).toUpperCase().trim();
        if (upper === "CORRECTO" || upper === "REVISADO") {
          ctoStatus = "CORRECTO";
        } else if (upper === "FALLO" || upper === "FALLÓ") {
          ctoStatus = "FALLO";
        }
      }

      formattedCtos.push({
        num: decodeHtml(String(row.Número || row.Codigo || row.Código || row['№'] || Date.now().toString())),
        numeroNuevo: row.NumeroNuevo ? decodeHtml(String(row.NumeroNuevo)) : null,
        coordenadas: String(row.Coordenadas || `${lat}, ${lng}`),
        lat,
        lng,
        municipio: row.Municipio ? decodeHtml(String(row.Municipio)) : null,
        colocacion: row.Colocación || row.Colocacion ? decodeHtml(String(row.Colocación || row.Colocacion)) : null,
        fechaAgregacion: fecha,
        notas: row.Notas ? decodeHtml(String(row.Notas)) : null,
        status: ctoStatus,
        category: activeCategory,
        zona: row.Zona ? decodeHtml(String(row.Zona)) : null,
        cluster: row.Cluster ? decodeHtml(String(row.Cluster)) : null,
        subStatusId: subStatusId
      });
    }

    const result = await prisma.cTO.createMany({
      data: formattedCtos,
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Error importando CTOs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
