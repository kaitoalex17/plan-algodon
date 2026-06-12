"use client";

import { useState, useMemo } from "react";
import MapWrapper from "@/components/MapWrapper";
import CtoDrawer from "@/components/CtoDrawer";
import { signOut } from "next-auth/react";

export default function ClientPageWrapper({ initialCtos, initialMapState }: { initialCtos: any[]; initialMapState: any }) {
  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [ctos, setCtos] = useState(initialCtos);
  const [activeView, setActiveView] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar CTOs dinámicamente según el buscador
  const filteredCtos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ctos;
    return ctos.filter(c => 
      c.num.toLowerCase().includes(query) ||
      (c.municipio && c.municipio.toLowerCase().includes(query)) ||
      (c.colocacion && c.colocacion.toLowerCase().includes(query)) ||
      (c.numeroNuevo && c.numeroNuevo.toLowerCase().includes(query))
    );
  }, [ctos, searchQuery]);

  // Limitar el renderizado en lista para rendimiento móvil óptimo (máx 100 elementos a la vez)
  const visibleListCtos = useMemo(() => {
    return filteredCtos.slice(0, 100);
  }, [filteredCtos]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "#f3f4f6" }}>
      
      {/* Cabecera Principal y Barra de Búsqueda (Fija arriba) */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", zIndex: 10, padding: "12px 16px" }}>
        
        {/* Fila 1: Logo y Acciones */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#FF7900" }}>●</span> Plan Algodon
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={() => window.location.href = "/admin"} 
              className="btn" 
              style={{ padding: "6px 12px", fontSize: "0.85rem", background: "#f3f4f6", color: "#111827", minHeight: "36px", fontWeight: 600 }}
            >
              Admin
            </button>
            <button 
              onClick={() => signOut()} 
              className="btn" 
              style={{ padding: "6px 12px", fontSize: "0.85rem", background: "#fee2e2", color: "#dc2626", minHeight: "36px", fontWeight: 600 }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Fila 2: Buscador */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Buscar por número de CTO o municipio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              padding: "10px 40px 10px 14px", 
              fontSize: "0.95rem", 
              minHeight: "44px", 
              background: "#f8fafc",
              border: "1.5px solid #cbd5e1"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", fontSize: "1.2rem", color: "#94a3b8", cursor: "pointer", padding: "4px"
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Fila 3: Selector de Vista (Mapa vs Lista) - Diseño Premium Táctil */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "4px" }}>
          <button
            onClick={() => setActiveView("map")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
              background: activeView === "map" ? "#FF7900" : "transparent",
              color: activeView === "map" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            🗺️ Vista Mapa ({filteredCtos.length})
          </button>
          <button
            onClick={() => setActiveView("list")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
              background: activeView === "list" ? "#FF7900" : "transparent",
              color: activeView === "list" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            📋 Vista Lista ({filteredCtos.length})
          </button>
        </div>

      </div>

      {/* Contenedor de la Vista Activa */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        
        {/* VISTA MAPA */}
        <div style={{ display: activeView === "map" ? "block" : "none", width: "100%", height: "100%" }}>
          <MapWrapper 
            ctos={filteredCtos} // El mapa también se filtra en tiempo real
            onCtoClick={(cto: any) => setSelectedCto(cto)} 
            initialMapState={initialMapState}
          />
        </div>

        {/* VISTA LISTA (Scrollable y optimizada para móvil) */}
        {activeView === "list" && (
          <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "12px" }}>
            
            {filteredCtos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>No se encontraron CTOs</p>
                <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "4px" }}>Prueba a cambiar el término de búsqueda</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
                
                {filteredCtos.length > 100 && (
                  <div style={{ background: "#eff6ff", color: "#1e40af", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #bfdbfe", fontWeight: 600 }}>
                    Mostrando las primeras 100 de {filteredCtos.length} CTOs. Refina tu búsqueda para encontrar más.
                  </div>
                )}

                {visibleListCtos.map((cto) => {
                  const statusColor = cto.subStatus?.color || (cto.status === "PENDIENTE" ? "#808080" : cto.status === "CORRECTO" ? "#10b981" : "#ef4444");
                  
                  return (
                    <div
                      key={cto.id}
                      onClick={() => setSelectedCto(cto)}
                      className="glass-panel"
                      style={{
                        display: "flex", alignItems: "center", justifyItems: "center", padding: "14px 16px", cursor: "pointer",
                        background: "white", borderLeft: `6px solid ${statusColor}`, minHeight: "60px",
                        active: { background: "#f8fafc" }
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                            CTO {cto.num}
                          </span>
                          {cto.numeroNuevo && (
                            <span style={{ fontSize: "0.8rem", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                              Nuevo: {cto.numeroNuevo}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
                          {cto.municipio || "Sin municipio"} • {cto.colocacion || "Ubicación N/A"}
                        </div>
                      </div>

                      {/* Badge de Estado */}
                      <span style={{
                        padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700,
                        background: cto.status === "CORRECTO" ? "#d1fae5" : cto.status === "FALLO" ? "#fee2e2" : "#f3f4f6",
                        color: cto.status === "CORRECTO" ? "#065f46" : cto.status === "FALLO" ? "#991b1b" : "#374151"
                      }}>
                        {cto.subStatus?.name || cto.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Drawer inferior para detalles de CTO */}
      <CtoDrawer 
        cto={selectedCto} 
        onClose={() => setSelectedCto(null)} 
        onUpdate={(updatedCto: any) => {
          setCtos(prev => prev.map(c => c.id === updatedCto.id ? { ...c, ...updatedCto } : c));
          setSelectedCto(updatedCto);
        }}
      />

    </div>
  );
}
