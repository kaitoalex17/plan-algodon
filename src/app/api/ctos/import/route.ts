import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { ctos, clearExisting } = await req.json();

    if (!ctos || !Array.isArray(ctos)) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }

    if (clearExisting) {
      // Eliminar historial, comentarios y fotos asociadas antes de limpiar (la BD lo hace por cascade onDelete)
      await prisma.cTO.deleteMany();
    }

    const formattedCtos = ctos.map((row: any) => {
      let lat = 0;
      let lng = 0;
      if (row.Coordenadas && typeof row.Coordenadas === 'string') {
        const parts = row.Coordenadas.split(',');
        if (parts.length >= 2) {
          lat = parseFloat(parts[0].trim());
          lng = parseFloat(parts[1].trim());
        }
      }

      let fecha = new Date();
      if (typeof row['Fecha de agregación'] === 'number') {
        // Conversión de fecha de Excel a JS Date
        fecha = new Date(Math.round((row['Fecha de agregación'] - 25569) * 86400 * 1000));
      }

      return {
        num: String(row.Número || row['№'] || Date.now().toString()),
        numeroNuevo: row.NumeroNuevo ? String(row.NumeroNuevo) : null,
        coordenadas: String(row.Coordenadas || ''),
        lat,
        lng,
        municipio: row.Municipio ? String(row.Municipio) : null,
        colocacion: row.Colocación ? String(row.Colocación) : null,
        fechaAgregacion: fecha,
        notas: row.Notas ? String(row.Notas) : null,
        status: "PENDIENTE",
      };
    }).filter((c: any) => c.lat !== 0 && c.lng !== 0);

    const result = await prisma.cTO.createMany({
      data: formattedCtos,
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Error importando CTOs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
