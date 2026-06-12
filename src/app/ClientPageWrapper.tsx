"use client";

import { useState } from "react";
import MapWrapper from "@/components/MapWrapper";
import CtoDrawer from "@/components/CtoDrawer";
import { signOut } from "next-auth/react";

export default function ClientPageWrapper({ initialCtos }: { initialCtos: any[] }) {
  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [ctos, setCtos] = useState(initialCtos);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Navbar superpuesta */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}>CTO Tracker</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.location.href='/admin'} className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#f3f4f6', color: '#111827', minHeight: 'auto' }}>Admin</button>
          <button onClick={() => signOut()} className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#fee2e2', color: '#dc2626', minHeight: 'auto' }}>Salir</button>
        </div>
      </div>

      <MapWrapper 
        ctos={ctos} 
        onCtoClick={(cto: any) => setSelectedCto(cto)} 
      />

      <CtoDrawer 
        cto={selectedCto} 
        onClose={() => setSelectedCto(null)} 
      />
    </div>
  );
}
