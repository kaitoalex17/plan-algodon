"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import MapWrapper from "@/components/MapWrapper";
import CtoDrawer from "@/components/CtoDrawer";
import { signOut, useSession } from "next-auth/react";

type SubStatus = { id: string; name: string; color: string };
type User = { id: string; name: string; email: string };

type StatDay = {
  date: string;
  total: number;
  technicians: {
    [key: string]: {
      name: string;
      email: string;
      color: string;
      count: number;
    };
  };
};

type TechStat = {
  name: string;
  color: string;
  total: number;
};

export default function ClientPageWrapper({ initialCtos, initialMapState }: { initialCtos: any[]; initialMapState: any }) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [selectedCto, setSelectedCto] = useState<any>(null);
  const [ctos, setCtos] = useState(initialCtos);
  const [activeView, setActiveView] = useState<"map" | "list">("map");
  const [searchQuery, setSearchQuery] = useState("");

  // Ajustes de visualización (persisten en la base de datos de usuario)
  const [zoomThreshold, setZoomThreshold] = useState(initialMapState?.zoomThreshold || 13);
  const [theme, setTheme] = useState(initialMapState?.theme || "orange");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    // Eliminar temas anteriores
    document.body.classList.forEach(className => {
      if (className.startsWith("theme-")) {
        document.body.classList.remove(className);
      }
    });
    // Añadir el nuevo tema
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const handleThemeChange = async (val: string) => {
    setTheme(val);
    try {
      await fetch("/api/users/map-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: val })
      });
    } catch (err) {
      console.error("Error guardando tema en BD:", err);
    }
  };

  // Estadísticas
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<{ stats: StatDay[]; totalByTech: TechStat[] }>({ stats: [], totalByTech: [] });

  // Estados de filtros avanzados
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSubStatus, setFilterSubStatus] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Opciones de filtros dinámicos (cargados de la BD)
  const [subStatuses, setSubStatuses] = useState<SubStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Cargar opciones para los filtros y ajustes guardados
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
    
    // Cargar preferencia de Zoom de localStorage como fallback
    const savedThreshold = localStorage.getItem("cto_zoom_threshold");
    if (savedThreshold && !initialMapState?.zoomThreshold) {
      setZoomThreshold(parseInt(savedThreshold));
    }
  }, [fetchFilterOptions, initialMapState]);

  // Cargar estadísticas
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        setStatsData(await res.json());
      }
    } catch (e) {
      console.error("Error cargando estadísticas:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const openStats = () => {
    fetchStats();
    setShowStatsModal(true);
  };

  const handleZoomThresholdChange = async (val: number) => {
    setZoomThreshold(val);
    localStorage.setItem("cto_zoom_threshold", String(val));
    try {
      await fetch("/api/users/map-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomThreshold: val })
      });
    } catch (err) {
      console.error("Error guardando zoomThreshold en BD:", err);
    }
  };

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
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-color)" }}>
      
      {/* Cabecera Principal y Barra de Búsqueda (Fija arriba) */}
      <div style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", zIndex: 10, padding: "12px 16px" }}>
        
        {/* Fila 1: Logo y Acciones */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-color)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--primary-color)" }}>●</span> Plan Algodon
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            {isAdmin && (
              <button 
                onClick={() => window.location.href = "/admin"} 
                className="btn" 
                style={{ padding: "6px 12px", fontSize: "0.85rem", background: "var(--bg-color)", color: "var(--text-color)", minHeight: "36px", fontWeight: 600 }}
              >
                Admin
              </button>
            )}
            <button 
              onClick={() => signOut()} 
              className="btn" 
              style={{ padding: "6px 12px", fontSize: "0.85rem", background: "#fee2e2", color: "#dc2626", minHeight: "36px", fontWeight: 600 }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Fila 2: Buscador + Botón Filtros + Stats + Ajustes */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                padding: "10px 40px 10px 14px", 
                fontSize: "0.95rem", 
                minHeight: "44px", 
                background: "var(--card-bg)",
                border: "1.5px solid var(--border-color)",
                color: "var(--text-color)"
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
          
          {/* Botón Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            title="Filtros avanzados"
            style={{
              padding: "0 10px", fontSize: "0.9rem", fontWeight: 700, borderRadius: "8px", border: "1.5px solid var(--border-color)",
              background: showFilters || activeFiltersCount > 0 ? "var(--primary-color)" : "var(--card-bg)",
              color: showFilters || activeFiltersCount > 0 ? "white" : "var(--text-color)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px",
              transition: "all 0.2s"
            }}
          >
            🎛️ {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
          </button>

          {/* Botón Estadísticas */}
          <button
            onClick={openStats}
            title="Estadísticas de auditoría"
            style={{
              padding: "0 10px", borderRadius: "8px", border: "1.5px solid var(--border-color)",
              background: "var(--card-bg)", color: "var(--text-color)",
              cursor: "pointer", display: "flex", alignItems: "center", minHeight: "44px"
            }}
          >
            📊
          </button>

          {/* Botón Ajustes */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Ajustes de mapa"
            style={{
              padding: "0 10px", borderRadius: "8px", border: "1.5px solid var(--border-color)",
              background: "var(--card-bg)", color: "var(--text-color)",
              cursor: "pointer", display: "flex", alignItems: "center", minHeight: "44px"
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Fila Opcional: Sección desplegable de filtros avanzados */}
        {showFilters && (
          <div style={{
            background: "var(--bg-color)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", 
            marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Selector de Estado */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-color)", opacity: 0.8, marginBottom: "3px" }}>Estado</label>
                <select 
                  className="input-field" 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CORRECTO">CORRECTO</option>
                  <option value="FALLO">FALLO</option>
                </select>
              </div>

              {/* Selector de Subestado */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-color)", opacity: 0.8, marginBottom: "3px" }}>Subestado</label>
                <select 
                  className="input-field" 
                  value={filterSubStatus} 
                  onChange={e => setFilterSubStatus(e.target.value)}
                  style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
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
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-color)", opacity: 0.8, marginBottom: "3px" }}>Asignado a</label>
              <select 
                className="input-field" 
                value={filterAssigned} 
                onChange={e => setFilterAssigned(e.target.value)}
                style={{ minHeight: "36px", padding: "4px 8px", fontSize: "0.85rem", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
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
        <div style={{ display: "flex", background: "var(--bg-color)", borderRadius: "10px", padding: "4px" }}>
          <button
            onClick={() => setActiveView("map")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
              background: activeView === "map" ? "var(--primary-color)" : "transparent",
              color: activeView === "map" ? "white" : "var(--text-color)",
              transition: "all 0.2s"
            }}
          >
            🗺️ Vista Mapa ({filteredCtos.length})
          </button>
          <button
            onClick={() => setActiveView("list")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
              background: activeView === "list" ? "var(--primary-color)" : "transparent",
              color: activeView === "list" ? "white" : "var(--text-color)",
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
            zoomThreshold={zoomThreshold}
            users={users}
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
                         background: "var(--card-bg)", borderLeft: `6px solid ${statusColor}`, minHeight: "60px", borderColor: "var(--border-color)"
                       }}
                     >
                       <div style={{ flex: 1 }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-color)" }}>
                             CTO {cto.num}
                           </span>
                           {cto.numeroNuevo && (
                             <span style={{ fontSize: "0.8rem", color: "var(--text-color)", opacity: 0.8, background: "var(--bg-color)", padding: "2px 6px", borderRadius: "4px" }}>
                               Nuevo: {cto.numeroNuevo}
                             </span>
                           )}
                         </div>
                         <div style={{ fontSize: "0.85rem", color: "var(--text-color)", opacity: 0.7, marginTop: "4px" }}>
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

      {/* MODAL DE AJUSTES (Visualización de CTOs y Temas) */}
      {showSettingsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "90%", maxWidth: "450px", padding: "2rem", background: "var(--card-bg)", color: "var(--text-color)", borderColor: "var(--border-color)" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-color)" }}>⚙️ Ajustes</h2>
            
            {/* Selector de Tema */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-color)" }}>
                Tema de Color de la Página:
              </label>
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                {[
                  { name: "orange", color: "#FF7900", label: "Naranja" },
                  { name: "blue", color: "#2563eb", label: "Azul" },
                  { name: "green", color: "#10b981", label: "Verde" },
                  { name: "purple", color: "#8b5cf6", label: "Morado" },
                  { name: "dark", color: "#334155", label: "Oscuro" }
                ].map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleThemeChange(t.name)}
                    style={{
                      flex: "1 1 calc(33% - 6px)",
                      minWidth: "70px",
                      padding: "8px 4px",
                      borderRadius: "8px",
                      border: theme === t.name ? "3px solid var(--text-color)" : "1.5px solid var(--border-color)",
                      background: t.name === "dark" ? "#1e293b" : "#ffffff",
                      color: t.name === "dark" ? "#ffffff" : "#111827",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      boxShadow: theme === t.name ? "0 0 8px rgba(0,0,0,0.15)" : "none",
                      transition: "all 0.15s"
                    }}
                  >
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: t.color, display: "inline-block" }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-color)" }}>
                Límite de Zoom para mostrar CTOs:
              </label>
              
              <select
                className="input-field"
                value={zoomThreshold}
                onChange={(e) => handleZoomThresholdChange(parseInt(e.target.value))}
                style={{ padding: "8px 12px", minHeight: "44px", background: "var(--card-bg)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
              >
                <option value="11">Zoom 11: Mostrar todo de lejos (Lento en móviles antiguos)</option>
                <option value="12">Zoom 12: Mostrar temprano</option>
                <option value="13">Zoom 13: Normal / Recomendado</option>
                <option value="14">Zoom 14: Mostrar tarde</option>
                <option value="15">Zoom 15: Mostrar solo muy de cerca (Más rápido)</option>
              </select>
              <p style={{ fontSize: "0.8rem", color: "var(--text-color)", opacity: 0.7, marginTop: "6px", lineHeight: 1.4 }}>
                Un nivel de zoom más bajo te permite ver más CTOs a la vez, pero puede ralentizar el rendimiento del mapa en tu dispositivo móvil.
              </p>
            </div>

            <button 
              onClick={() => setShowSettingsModal(false)}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Guardar Ajustes
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ESTADÍSTICAS */}
      {showStatsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "95%", maxWidth: "550px", padding: "2rem", background: "var(--card-bg)", color: "var(--text-color)", borderColor: "var(--border-color)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-color)", margin: 0 }}>📊 Estadísticas de Auditoría</h2>
              <button 
                onClick={() => setShowStatsModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {statsLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-color)", opacity: 0.8 }}>Calculando estadísticas...</div>
            ) : (
              <div>
                {/* 1. Vista de Administrador: Resumen de técnicos */}
                {isAdmin && statsData.totalByTech && statsData.totalByTech.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-color)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-color)", opacity: 0.8, marginBottom: "0.75rem", textTransform: "uppercase" }}>Total por Técnico (Últimos 15 días)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {statsData.totalByTech.map((tech, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: tech.color }} />
                            {tech.name}
                          </span>
                          <strong style={{ background: "var(--border-color)", padding: "2px 8px", borderRadius: "12px" }}>{tech.total} CTOs</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Historial de Auditoría Diario */}
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-color)", opacity: 0.8, marginBottom: "0.75rem", textTransform: "uppercase" }}>
                  {isAdmin ? "Historial Diario del Equipo" : "Mis CTOs Auditadas por Día"}
                </h3>

                {statsData.stats.length === 0 ? (
                  <p style={{ color: "var(--text-color)", opacity: 0.7, fontStyle: "italic", textAlign: "center", padding: "2rem" }}>No se registran auditorías en los últimos 15 días.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {statsData.stats.map((day, idx) => (
                      <div key={idx} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", background: "var(--bg-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.95rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", marginBottom: "6px" }}>
                          <span style={{ color: "var(--text-color)" }}>📅 {day.date}</span>
                          <span style={{ color: "var(--primary-color)" }}>{day.total} CTOs</span>
                        </div>

                        {/* Breakdown por técnico si es admin */}
                        {isAdmin ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "12px" }}>
                            {Object.values(day.technicians).map((tech: any, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-color)", opacity: 0.8 }}>
                                <span>{tech.name}</span>
                                <strong>{tech.count} auditadas</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: "0.85rem", color: "var(--text-color)", opacity: 0.7, margin: 0, paddingLeft: "12px" }}>
                            Has auditado {day.total} CTOs en esta fecha.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setShowStatsModal(false)}
              className="btn"
              style={{ width: "100%", background: "var(--border-color)", color: "var(--text-color)", marginTop: "1.5rem" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

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
