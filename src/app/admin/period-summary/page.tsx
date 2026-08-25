"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CtoDrawer from "@/components/CtoDrawer";

interface CtoPeriodReport {
  id: string;
  ctoId: string;
  num: string;
  numeroNuevo?: string;
  cluster: string;
  zona: string;
  municipio?: string;
  status: string;
  subStatusId?: string;
  subStatusName: string;
  subStatusColor: string;
  category?: string;
  auditor: string;
  auditorId?: string;
  assignedTo?: string;
  assignedToId?: string;
  hasFormulario?: boolean;
  hasDrive?: boolean;
  hasAntala?: boolean;
  puertosTotal?: number;
  puertosOcupados?: number;
  lat?: number;
  lng?: number;
  coordenadas?: string;
  auditTime: string;
  auditDate: string;
  rawDate: string;
  timestamp: number;
  ctoRaw?: any;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  color?: string;
}

interface SubStatusOption {
  id: string;
  name: string;
  color: string;
  category?: string;
}

export default function PeriodSummaryPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // Inicializar con los últimos 7 días por defecto
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  });

  // Filtros de administración
  const [selectedTech, setSelectedTech] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubStatus, setSelectedSubStatus] = useState<string>("ALL");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("ALL");
  const [selectedZona, setSelectedZona] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<{
    startDate: string;
    endDate: string;
    count: number;
    ctos: CtoPeriodReport[];
    users: UserOption[];
    subStatuses: SubStatusOption[];
  }>({
    startDate: "",
    endDate: "",
    count: 0,
    ctos: [],
    users: [],
    subStatuses: []
  });

  // CTO seleccionada para abrir en el drawer
  const [selectedCto, setSelectedCto] = useState<any | null>(null);

  useEffect(() => {
    if (authStatus === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "GESTOR") {
        router.push("/");
      }
    } else if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, session, router]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/period-summary?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (err) {
      console.error("Error cargando resumen por período:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate]);

  // Presets rápidos de rango de fechas
  const setDatePreset = (preset: "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth") => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(todayStr);
    } else if (preset === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(todayStr);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(todayStr);
    } else if (preset === "lastMonth") {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDayLastMonth.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(lastDayLastMonth.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
    }
  };

  // Opciones únicas dinámicas para filtros
  const uniqueMunicipios = useMemo(() => {
    const setM = new Set<string>();
    summaryData.ctos?.forEach(c => {
      if (c.municipio && c.municipio !== "N/A") setM.add(c.municipio);
    });
    return Array.from(setM).sort();
  }, [summaryData.ctos]);

  const uniqueZonas = useMemo(() => {
    const setZ = new Set<string>();
    summaryData.ctos?.forEach(c => {
      if (c.zona && c.zona !== "N/A") setZ.add(c.zona);
    });
    return Array.from(setZ).sort();
  }, [summaryData.ctos]);

  // Filtrado reactivo en memoria de todas las CTOs del período
  const filteredCtos = useMemo(() => {
    if (!summaryData.ctos) return [];
    return summaryData.ctos.filter(c => {
      // 1. Filtro Técnico / Auditor
      if (selectedTech !== "ALL") {
        const matchesAuditor = c.auditorId === selectedTech || (c.auditor || "").toLowerCase() === selectedTech.toLowerCase();
        const matchesAssigned = c.assignedToId === selectedTech;
        if (!matchesAuditor && !matchesAssigned) return false;
      }

      // 2. Filtro Estado General
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) {
        return false;
      }

      // 3. Filtro Categoría (AUDITORIA vs REPAROS / PROGRAMADA)
      if (selectedCategory !== "ALL") {
        if (selectedCategory === "REPAROS" || selectedCategory === "PROGRAMADA") {
          if (c.category !== "PROGRAMADA") return false;
        } else if (c.category !== selectedCategory) {
          return false;
        }
      }

      // 4. Filtro Subestado
      if (selectedSubStatus !== "ALL") {
        if (c.subStatusId !== selectedSubStatus && c.subStatusName !== selectedSubStatus) {
          return false;
        }
      }

      // 5. Filtro Municipio
      if (selectedMunicipio !== "ALL" && c.municipio !== selectedMunicipio) {
        return false;
      }

      // 6. Filtro Zona
      if (selectedZona !== "ALL" && c.zona !== selectedZona) {
        return false;
      }

      // 7. Buscador de texto libre
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (c.num || "").toLowerCase().includes(q);
        const numNewMatch = (c.numeroNuevo || "").toLowerCase().includes(q);
        const auditorMatch = (c.auditor || "").toLowerCase().includes(q);
        const subMatch = (c.subStatusName || "").toLowerCase().includes(q);
        const muniMatch = (c.municipio || "").toLowerCase().includes(q);
        const zonaMatch = (c.zona || "").toLowerCase().includes(q);
        if (!numMatch && !numNewMatch && !auditorMatch && !subMatch && !muniMatch && !zonaMatch) {
          return false;
        }
      }

      return true;
    });
  }, [summaryData.ctos, selectedTech, selectedStatus, selectedCategory, selectedSubStatus, selectedMunicipio, selectedZona, searchQuery]);

  // Contadores y métricas ejecutivas
  const totalCount = filteredCtos.length;
  const correctasCount = filteredCtos.filter(c => c.status === "CORRECTO").length;
  const fallosCount = filteredCtos.filter(c => c.status === "FALLO").length;
  const reparosCount = filteredCtos.filter(c => c.category === "PROGRAMADA").length;
  const approvalRate = totalCount > 0 ? Math.round((correctasCount / totalCount) * 100) : 0;

  // Manejo de apertura de CTO en Drawer
  const handleOpenCto = (item: CtoPeriodReport) => {
    if (item.ctoRaw) {
      setSelectedCto(item.ctoRaw);
    } else {
      setSelectedCto({
        id: item.ctoId,
        num: item.num,
        numeroNuevo: item.numeroNuevo,
        status: item.status,
        subStatusId: item.subStatusId,
        category: item.category || "AUDITORIA",
        lat: item.lat || 0,
        lng: item.lng || 0,
        municipio: item.municipio,
        zona: item.zona,
        cluster: item.cluster,
        puertosTotal: item.puertosTotal,
        puertosOcupados: item.puertosOcupados
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedTech("ALL");
    setSelectedStatus("ALL");
    setSelectedCategory("ALL");
    setSelectedSubStatus("ALL");
    setSelectedMunicipio("ALL");
    setSelectedZona("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedTech !== "ALL" || selectedStatus !== "ALL" || selectedCategory !== "ALL" || selectedSubStatus !== "ALL" || selectedMunicipio !== "ALL" || selectedZona !== "ALL" || searchQuery.trim() !== "";

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1350px", margin: "0 auto", color: "var(--text-color)" }}>
      
      {/* Barra de Navegación Superior */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/" className="btn" style={{ padding: "6px 12px", fontSize: "0.85rem", background: "var(--border-color)", color: "var(--text-color)" }}>
              ← Ir al Mapa Principal
            </Link>
            <Link href="/admin" className="btn" style={{ padding: "6px 12px", fontSize: "0.85rem", background: "var(--border-color)", color: "var(--text-color)" }}>
              Panel de Control
            </Link>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "12px 0 4px 0", color: "var(--text-color)", letterSpacing: "-0.5px" }}>
            📊 Resumen de Auditoría por Período
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            Control detallado de CTOs auditadas y reparadas con filtros avanzados por técnico, estado y subestado.
          </p>
        </div>

        {/* Acciones de Exportación */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href={`/api/admin/period-summary/export?type=excel&startDate=${startDate}&endDate=${endDate}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ background: "#16a34a", color: "white", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", minHeight: "38px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Excel
          </a>
          <a
            href={`/api/admin/period-summary/export?type=pdf&startDate=${startDate}&endDate=${endDate}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ background: "#dc2626", color: "white", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", minHeight: "38px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Descargar PDF
          </a>
        </div>
      </div>

      {/* PANEL 1: SELECCIÓN DE RANGO DE FECHAS & PRESETS */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "1.5rem", background: "var(--card-bg)", border: "1.5px solid var(--border-color)", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          
          {/* Selectores de Fecha */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-color)" }}>Desde:</span>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input-field"
                style={{ padding: "6px 10px", minHeight: "36px", borderRadius: "8px", fontWeight: 700, background: "var(--bg-color)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-color)" }}>Hasta:</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="input-field"
                style={{ padding: "6px 10px", minHeight: "36px", borderRadius: "8px", fontWeight: 700, background: "var(--bg-color)", color: "var(--text-color)", border: "1.5px solid var(--border-color)" }}
              />
            </div>
          </div>

          {/* Botones de Rangos Rápidos */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setDatePreset("today")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Hoy</button>
            <button type="button" onClick={() => setDatePreset("yesterday")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Ayer</button>
            <button type="button" onClick={() => setDatePreset("last7")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Últimos 7 días</button>
            <button type="button" onClick={() => setDatePreset("last30")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Últimos 30 días</button>
            <button type="button" onClick={() => setDatePreset("thisMonth")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Este Mes</button>
            <button type="button" onClick={() => setDatePreset("lastMonth")} className="btn" style={{ padding: "4px 10px", fontSize: "0.78rem", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontWeight: 700 }}>Mes Anterior</button>
          </div>

        </div>
      </div>

      {/* PANEL 2: FILTROS AVANZADOS DE ADMINISTRACIÓN */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "1.5rem", background: "var(--card-bg)", border: "1.5px solid var(--border-color)", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-color)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🔍</span> Filtros de Auditoría
          </span>
          {hasActiveFilters && (
            <button 
              type="button" 
              onClick={handleClearFilters}
              style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              ✕ Limpiar todos los filtros
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          
          {/* Buscador de Texto */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Buscar CTO / Texto</label>
            <input 
              type="text" 
              placeholder="Nº CTO, zona, etc..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
            />
          </div>

          {/* Filtro por Técnico */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Técnico / Auditor</label>
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
            >
              <option value="ALL">Todos los técnicos</option>
              {summaryData.users?.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Estado General</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
            >
              <option value="ALL">Todos los estados</option>
              <option value="CORRECTO">🟢 Correctas</option>
              <option value="FALLO">🔴 Fallos</option>
            </select>
          </div>

          {/* Filtro Categoría */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Categoría</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
            >
              <option value="ALL">Todas las categorías</option>
              <option value="AUDITORIA">Auditoría Normal</option>
              <option value="REPAROS">Reparos (Programadas)</option>
            </select>
          </div>

          {/* Filtro Subestado */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Subestado</label>
            <select
              value={selectedSubStatus}
              onChange={e => setSelectedSubStatus(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
            >
              <option value="ALL">Todos los subestados</option>
              {summaryData.subStatuses?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro Municipio */}
          {uniqueMunicipios.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Municipio</label>
              <select
                value={selectedMunicipio}
                onChange={e => setSelectedMunicipio(e.target.value)}
                className="input-field"
                style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
              >
                <option value="ALL">Todos los municipios</option>
                {uniqueMunicipios.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Zona */}
          {uniqueZonas.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "3px" }}>Zona</label>
              <select
                value={selectedZona}
                onChange={e => setSelectedZona(e.target.value)}
                className="input-field"
                style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", minHeight: "36px", borderRadius: "8px", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)" }}
              >
                <option value="ALL">Todas las zonas</option>
                {uniqueZonas.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* DASHBOARD: TARJETAS DE MÉTRICAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
        
        <div className="glass-panel" style={{ padding: "14px 16px", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Total Filtradas</span>
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--primary-color)", margin: "4px 0 0 0" }}>{totalCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: "14px 16px", background: "#dcfce7", border: "1.5px solid #86efac", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>🟢 Correctas</span>
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "#166534", margin: "4px 0 0 0" }}>{correctasCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: "14px 16px", background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>🔴 Fallos</span>
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "#991b1b", margin: "4px 0 0 0" }}>{fallosCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: "14px 16px", background: "#fef9c3", border: "1.5px solid #fde047", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#854d0e", textTransform: "uppercase" }}>🛠️ Reparos</span>
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "#854d0e", margin: "4px 0 0 0" }}>{reparosCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: "14px 16px", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>% Aprobación</span>
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: approvalRate >= 80 ? "#16a34a" : "#ca8a04", margin: "4px 0 0 0" }}>{approvalRate}%</p>
        </div>

      </div>

      {/* TABLA PRINCIPAL DE AUDITORÍAS */}
      <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "16px", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
            Listado de CTOs Auditadas ({filteredCtos.length})
          </h2>
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Haz clic en cualquier CTO para abrir su ficha completa
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontWeight: 600 }}>
            Cargando informe de auditoría...
          </div>
        ) : filteredCtos.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
            No se encontraron registros de auditoría que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "10px", fontWeight: 800 }}>CTO</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Categoría</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Auditor / Técnico</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Fecha / Hora</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Estado General</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Subestado</th>
                <th style={{ padding: "10px", fontWeight: 800 }}>Zona / Cluster</th>
                <th style={{ padding: "10px", fontWeight: 800, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCtos.map(item => {
                const isCorrecto = item.status === "CORRECTO";
                const isFallo = item.status === "FALLO";

                return (
                  <tr 
                    key={item.id}
                    style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                    className="hover-row"
                  >
                    {/* CTO Código */}
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenCto(item)}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontWeight: 800,
                          color: "var(--primary-color)",
                          cursor: "pointer",
                          fontSize: "0.95rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "underline"
                        }}
                        title="Haz clic para abrir ficha de la CTO"
                      >
                        {item.num}
                      </button>
                      {item.numeroNuevo && (
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b" }}>
                          Nuevo: {item.numeroNuevo}
                        </span>
                      )}
                    </td>

                    {/* Categoría */}
                    <td style={{ padding: "10px" }}>
                      <span style={{ 
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        padding: "2px 8px", 
                        borderRadius: "12px",
                        background: item.category === "PROGRAMADA" ? "#fef3c7" : "#f1f5f9",
                        color: item.category === "PROGRAMADA" ? "#b45309" : "#475569"
                      }}>
                        {item.category === "PROGRAMADA" ? "Reparos" : "Auditoría"}
                      </span>
                    </td>

                    {/* Auditor */}
                    <td style={{ padding: "10px", fontWeight: 600 }}>
                      👤 {item.auditor}
                    </td>

                    {/* Fecha y Hora */}
                    <td style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 600 }}>{item.auditDate}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.auditTime}</div>
                    </td>

                    {/* Estado General */}
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        background: isCorrecto ? "#dcfce7" : isFallo ? "#fee2e2" : "#f3f4f6",
                        color: isCorrecto ? "#166534" : isFallo ? "#991b1b" : "#374151"
                      }}>
                        {item.status}
                      </span>
                    </td>

                    {/* Subestado */}
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        borderLeft: `4px solid ${item.subStatusColor}`,
                        background: "var(--bg-color)"
                      }}>
                        {item.subStatusName}
                      </span>
                    </td>

                    {/* Zona / Cluster */}
                    <td style={{ padding: "10px", fontSize: "0.82rem", color: "#64748b" }}>
                      {item.zona !== "N/A" ? item.zona : (item.cluster !== "N/A" ? item.cluster : "-")}
                    </td>

                    {/* Botones de acción */}
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        {/* Botón Abrir Ficha */}
                        <button
                          type="button"
                          onClick={() => handleOpenCto(item)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", background: "var(--primary-color)", color: "white", fontWeight: 700 }}
                          title="Abrir Ficha de la CTO"
                        >
                          Ficha
                        </button>

                        {/* Botón Abrir en Mapa */}
                        <a
                          href={`/?ctoId=${item.ctoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", background: "var(--border-color)", color: "var(--text-color)" }}
                          title="Ver en el Mapa"
                        >
                          🗺️
                        </a>

                        {/* Botón Google Maps */}
                        {item.lat && item.lng && (
                          <a
                            href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", background: "var(--border-color)", color: "var(--text-color)" }}
                            title="Abrir en Google Maps"
                          >
                            📍
                          </a>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CTO DRAWER INTERACTIVO */}
      {selectedCto && (
        <CtoDrawer
          cto={selectedCto}
          onClose={() => setSelectedCto(null)}
          onUpdate={(updated) => {
            setSelectedCto(updated);
            loadData();
          }}
        />
      )}

    </div>
  );
}
