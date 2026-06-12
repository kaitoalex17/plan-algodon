import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MapWrapper from "@/components/MapWrapper";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Si no hay BD conectada, esto fallará, así que lo envolvemos en un try/catch
  let ctos = [];
  try {
    ctos = await prisma.cTO.findMany({
      include: {
        assignedTo: true,
        subStatus: true,
      }
    });
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
      <ClientPageWrapper initialCtos={ctos} />
    </main>
  );
}

// Client component wrapper to handle states
import ClientPageWrapper from "./ClientPageWrapper";
