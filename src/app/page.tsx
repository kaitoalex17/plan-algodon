import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientPageWrapper from "./ClientPageWrapper";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  let ctos = [];
  let userMapState = { lat: 36.425, lng: -5.144, zoom: 14 }; // Default Estepona/Marbella area

  try {
    // Obtener CTOs
    ctos = await prisma.cTO.findMany({
      include: {
        assignedTo: true,
        subStatus: true,
      }
    });

    // Obtener última vista del mapa guardada para el usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLat: true, lastLng: true, lastZoom: true, zoomThreshold: true }
    });

    if (user) {
      userMapState = {
        lat: user.lastLat !== null ? user.lastLat : 36.425,
        lng: user.lastLng !== null ? user.lastLng : -5.144,
        zoom: user.lastZoom !== null ? user.lastZoom : 14,
        zoomThreshold: user.zoomThreshold || 13
      };
    }
  } catch (e) {
    console.error("Error connecting to DB", e);
    // Mock data temporal si la BD falla
    ctos = [
      { id: '1', num: '1001', lat: 36.425, lng: -5.144, status: 'PENDIENTE', municipio: 'Estepona' },
      { id: '2', num: '1002', lat: 36.428, lng: -5.140, status: 'CORRECTO', municipio: 'Estepona' }
    ];
  }

  return (
    <main>
      <ClientPageWrapper initialCtos={ctos} initialMapState={userMapState} />
    </main>
  );
}
