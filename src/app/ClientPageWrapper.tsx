"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import MapWrapper from "@/components/MapWrapper";
import CtoDrawer from "@/components/CtoDrawer";
import { signOut } from "next-auth/react";

type SubStatus = { id: string; name: string; color: string };
type User = { id: string; name: string; email: string };

export default function ClientPageWrapper({ initialCtos, initialMapState }: { initialCtos: any[]; initialMapState: any }) {
  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [ctos, setCtos] = useState(initialCtos);
  const [activeView, setActiveView] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de filtros avanzados
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSubStatus, setFilterSubStatus] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Opciones de filtros dinámicos (cargados de la BD)
  const [subStatuses, setSubStatuses] = useState<SubStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Cargar opciones para los filtros
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [resSub, resUsers] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/users"),
      ]);
      if (resSub.ok) setSubStatuses(await resSub.json());
      if (resUsers.ok) setUsers(await resUsers.json());
    } catch (e) {
      console.error("Error al cargar opciones de filtro:", e);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Contar cuántos filtros avanzados están aplicados
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus) count++;
    if (filterSubStatus) count++;
    if (filterAssigned) count++;
    return count;
  }, [filterStatus, filterSubStatus, filterAssigned]);

  // Resetear filtros
  const handleClearFilters = () => {
    setFilterStatus("");
    setFilterSubStatus("");
    setFilterAssigned("");
    setSearchQuery("");
  };

  // Filtrar CTOs dinámicamente según búsqueda y filtros avanzados
  const filteredCtos = useMemo(() => {
    let result = ctos;

    // 1. Buscador de texto
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(c => 
        c.num.toLowerCase().includes(query) ||
        (c.municipio && c.municipio.toLowerCase().includes(query)) ||
        (c.colocacion && c.colocacion.toLowerCase().includes(query)) ||
        (c.numeroNuevo && c.numeroNuevo.toLowerCase().includes(query))
      );
    }

    // 2. Filtro de Estado
    if (filterStatus) {
      result = result.filter(c => c.status === filterStatus);
    }

    // 3. Filtro de Subestado
    if (filterSubStatus) {
      if (filterSubStatus === "none") {
        result = result.filter(c => !c.subStatusId);
      } else {
        result = result.filter(c => c.subStatusId === filterSubStatus);
      }
    }

    // 4. Filtro de Asignación
    if (filterAssigned) {
      if (filterAssigned === "unassigned") {
        result = result.filter(c => !c.assignedToId);
      } else {
        result = result.filter(c => c.assignedToId === filterAssigned);
      }
    }

    return result;
  }, [ctos, searchQuery, filterStatus, filterSubStatus, filterAssigned]);

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

        {/* Fila 2: Buscador + Botón Filtros */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Buscar por número o municipio..."
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
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "0 12px", fontSize: "0.9rem", fontWeight: 700, borderRadius: "8px", border: "1.5px solid #cbd5e1",
              background: showFilters || activeFiltersCount > 0 ? "#FF7900" : "white",
              color: showFilters || activeFiltersCount > 0 ? "white" : "#475569",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px",
              transition: "all 0.2s"
            }}
          >
            🎛️ {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
          </button>
        </div>

        {/* Fila Opcional: Sección desplegable de filtros avanzados (Mobile-first) */}
        {showFilters && (
          <div style={{
            background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", 
            marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Selector de Estado */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>Estado</label>
                <select 
                  className="input-field" 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "white" }}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CORRECTO">CORRECTO</option>
                  <option value="FALLO">FALLO</option>
                </select>
              </div>

              {/* Selector de Subestado */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>Subestado</label>
                <select 
                  className="input-field" 
                  value={filterSubStatus} 
                  onChange={e => setFilterSubStatus(e.target.value)}
                  style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "white" }}
                >
                  <option value="">Todos</option>
                  <option value="none">Sin subestado</option>
                  {subStatuses.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector de Técnico */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>Asignado a</label>
              <select 
                className="input-field" 
                value={filterAssigned} 
                onChange={e => setFilterAssigned(e.target.value)}
                style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "white" }}
              >
                <option value="">Todos los técnicos</option>
                <option value="unassigned">Sin asignar</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>

            {/* Limpiar Filtros */}
            {(activeFiltersCount > 0 || searchQuery) && (
              <button 
                onClick={handleClearFilters}
                className="btn"
                style={{ 
                  background: "#fee2e2", color: "#dc2626", minHeight: "32px", fontSize: "0.85rem", 
                  padding: "4px 8px", width: "100%", fontWeight: 700 
                }}
              >
                Limpiar Filtros Aplicados
              </button>
            )}
          </div>
        )}

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
            ctos={filteredCtos} // El mapa se filtra en tiempo real
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
                <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "4px" }}>Prueba a cambiar el término o filtros de búsqueda</p>
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
