"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic import del CtoDrawer para abrir la ficha de cualquier CTO directamente
const CtoDrawer = dynamic(() => import("@/components/CtoDrawer"), { ssr: false });

interface CrossRecord {
  id: string;
  ctoId: string;
  ctoNum: string;
  numeroNuevo?: string | null;
  municipio: string;
  colocacion: string;
  zona: string;
  cluster: string;
  category: string;
  status: string;
  subStatus: string;
  subStatusColor: string;
  assignedTo: { id?: string; name: string; email?: string; color?: string };
  closedBy: { id?: string; name: string; email?: string; color?: string };
  closedAt: string;
  action: string;
  location?: string | null;
  ctoRaw: any;
}

export default function CrossAuditsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // Fechas por defecto en zona horaria Madrid
  const today = new Date();
  const todayStr = today.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [activePreset, setActivePreset] = useState<string>("today");

  // Filtros
  const [assignedToId, setAssignedToId] = useState<string>("all");
  const [closedById, setClosedById] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Datos
  const [records, setRecords] = useState<CrossRecord[]>([]);
  const [stats, setStats] = useState({ totalCross: 0, correctas: 0, fallos: 0, reparos: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [subStatuses, setSubStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // CTO seleccionada para abrir Drawer
  const [selectedCto, setSelectedCto] = useState<any | null>(null);

  // Control de acceso
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Presets de Fechas
  const applyDatePreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();

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
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(todayStr);
    } else if (preset === "lastMonth") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayLastMonth.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
      setEndDate(lastDayLastMonth.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
    }
  };

  // Carga de datos
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (assignedToId !== "all") params.set("assignedToId", assignedToId);
      if (closedById !== "all") params.set("closedById", closedById);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/cross-audits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setStats(data.stats || { totalCross: 0, correctas: 0, fallos: 0, reparos: 0 });
        if (data.users) setUsers(data.users);
        if (data.subStatuses) setSubStatuses(data.subStatuses);
      }
    } catch (err) {
      console.error("Error cargando control de cierres cruzados:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, assignedToId, closedById, statusFilter, categoryFilter]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadData();
    }
  }, [loadData, authStatus]);

  // Filtrar en memoria por término de búsqueda
  const filteredRecords = records.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.ctoNum?.toLowerCase().includes(term) ||
      (r.numeroNuevo && r.numeroNuevo.toLowerCase().includes(term)) ||
      r.municipio?.toLowerCase().includes(term) ||
      r.colocacion?.toLowerCase().includes(term) ||
      r.assignedTo?.name?.toLowerCase().includes(term) ||
      r.closedBy?.name?.toLowerCase().includes(term) ||
      r.action?.toLowerCase().includes(term)
    );
  });

  // Exportar Excel / PDF
  const handleExport = (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (assignedToId !== "all") params.set("assignedToId", assignedToId);
    if (closedById !== "all") params.set("closedById", closedById);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);

    window.open(`/api/admin/cross-audits/export?${params.toString()}`, "_blank");
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1500px", margin: "0 auto", color: "var(--text-color)" }}>
      
      {/* 1. Header & Acciones */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.6rem" }}>🔄</span>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: 0 }}>
              Control de Cierres Cruzados y Reasignaciones
            </h1>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 0 0" }}>
            Auditoría de CTOs cerradas o reparadas por un técnico diferente al que estaban asignadas originalmente
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            className="btn"
            style={{ background: "#107c41", color: "white", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📊 Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="btn"
            style={{ background: "#dc2626", color: "white", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            📄 Exportar PDF
          </button>
          <Link href="/admin" className="btn" style={{ background: "var(--card-bg)", color: "var(--text-color)", border: "1px solid var(--border-color)", fontWeight: 700, fontSize: "0.85rem" }}>
            Admin Panel
          </Link>
          <Link href="/" className="btn btn-primary" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            🗺️ Ver Mapa
          </Link>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Total Cierres Cruzados</span>
          <strong style={{ fontSize: "1.8rem", color: "var(--primary-color)", display: "block", marginTop: "4px" }}>{stats.totalCross}</strong>
        </div>
        <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1.5px solid #86efac", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>🟢 Correctas / Revisadas</span>
          <strong style={{ fontSize: "1.8rem", color: "#16a34a", display: "block", marginTop: "4px" }}>{stats.correctas}</strong>
        </div>
        <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1.5px solid #fca5a5", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>🔴 Con Fallos</span>
          <strong style={{ fontSize: "1.8rem", color: "#dc2626", display: "block", marginTop: "4px" }}>{stats.fallos}</strong>
        </div>
        <div style={{ background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1.5px solid #c4b5fd", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#5b21b6", textTransform: "uppercase" }}>🛠️ Reparos / Reparadas</span>
          <strong style={{ fontSize: "1.8rem", color: "#7c3aed", display: "block", marginTop: "4px" }}>{stats.reparos}</strong>
        </div>
      </div>

      {/* 3. Panel de Filtros y Presets de Fecha */}
      <div style={{ background: "var(--card-bg)", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--border-color)", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Presets Rápidos de Fechas */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginRight: "6px" }}>
            📅 Período Rápido:
          </span>
          {[
            { id: "today", label: "Hoy" },
            { id: "yesterday", label: "Ayer" },
            { id: "last7", label: "Últimos 7 días" },
            { id: "last30", label: "Últimos 30 días" },
            { id: "thisMonth", label: "Este Mes" },
            { id: "lastMonth", label: "Mes Anterior" }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyDatePreset(p.id)}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                border: activePreset === p.id ? "1.5px solid var(--primary-color)" : "1px solid var(--border-color)",
                background: activePreset === p.id ? "var(--primary-color)" : "var(--bg-color)",
                color: activePreset === p.id ? "white" : "var(--text-color)",
                transition: "all 0.15s"
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Controles de Filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          
          {/* Desde */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              Desde:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setActivePreset("custom"); }}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            />
          </div>

          {/* Hasta */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              Hasta:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setActivePreset("custom"); }}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            />
          </div>

          {/* Técnico Asignado Original */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              👤 Asignado Original:
            </label>
            <select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            >
              <option value="all">Todos los técnicos asignados</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Técnico que Cerró / Auditó */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              👤 Cerrado / Auditado por:
            </label>
            <select
              value={closedById}
              onChange={e => setClosedById(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            >
              <option value="all">Todos los técnicos que cerraron</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              Estado:
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            >
              <option value="all">Todos los estados</option>
              <option value="CORRECTO">🟢 CORRECTO</option>
              <option value="REVISADO">🔵 REVISADO</option>
              <option value="FALLO">🔴 FALLO</option>
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "4px", color: "#64748b", textTransform: "uppercase" }}>
              Categoría:
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.85rem", fontWeight: 700 }}
            >
              <option value="all">Todas las categorías</option>
              <option value="AUDITORIA">Auditoría Normal</option>
              <option value="PROGRAMADA">Reparos (Programada)</option>
            </select>
          </div>

        </div>

        {/* Buscador en tiempo real */}
        <div>
          <input
            type="text"
            placeholder="🔍 Buscar por Nº CTO, número nuevo, municipio, técnico o detalle..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "0.9rem", fontWeight: 600 }}
          />
        </div>

      </div>

      {/* 4. Tabla de Cierres Cruzados */}
      <div style={{ background: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--border-color)", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
        
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "0.95rem" }}>
            Listado de CTOs Cruzadas ({filteredRecords.length} encontradas)
          </strong>
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Haz clic en el número de cualquier CTO para abrir su ficha completa
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            Cargando registros de control cruzado...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>✅</span>
            No se encontraron CTOs con cierres cruzados en el período seleccionado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--bg-color)", borderBottom: "1.5px solid var(--border-color)", color: "#64748b", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px" }}>Nº CTO</th>
                  <th style={{ padding: "12px 16px" }}>Ubicación / Municipio</th>
                  <th style={{ padding: "12px 16px" }}>👤 Asignado Original</th>
                  <th style={{ padding: "12px 16px" }}>👤 Cerrado / Auditado Por</th>
                  <th style={{ padding: "12px 16px" }}>Fecha / Hora Cierre</th>
                  <th style={{ padding: "12px 16px" }}>Estado Final</th>
                  <th style={{ padding: "12px 16px" }}>Acción / Historial</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const isCorrect = r.status === "CORRECTO" || r.status === "REVISADO";
                  const isFallo = r.status === "FALLO";

                  return (
                    <tr 
                      key={r.id}
                      style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Nº CTO con botón directo para abrir Drawer */}
                      <td style={{ padding: "12px 16px", fontWeight: 800 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCto(r.ctoRaw)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "var(--primary-color)",
                            fontSize: "0.95rem",
                            fontWeight: 900,
                            cursor: "pointer",
                            textDecoration: "underline",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start"
                          }}
                        >
                          {r.ctoNum}
                          {r.numeroNuevo && (
                            <span style={{ fontSize: "0.72rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
                              Nº N: {r.numeroNuevo}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Municipio y Zona */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, display: "block" }}>{r.municipio}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.colocacion}</span>
                      </td>

                      {/* Técnico Asignado Original */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "var(--bg-color)",
                          border: `1.5px solid ${r.assignedTo?.color || "#64748b"}`,
                          color: "var(--text-color)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px"
                        }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.assignedTo?.color || "#64748b" }} />
                          {r.assignedTo?.name || "Sin asignar previo"}
                        </span>
                      </td>

                      {/* Técnico que realmente la cerró / auditó */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background: "rgba(37, 99, 235, 0.1)",
                          border: `1.5px solid ${r.closedBy?.color || "#3b82f6"}`,
                          color: "var(--text-color)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px"
                        }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.closedBy?.color || "#3b82f6" }} />
                          {r.closedBy?.name || "Técnico"}
                        </span>
                      </td>

                      {/* Fecha y Hora del Cierre */}
                      <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "var(--text-color)", whiteSpace: "nowrap" }}>
                        {new Date(r.closedAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                      </td>

                      {/* Estado y Subestado */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background: isCorrect ? "#dcfce7" : isFallo ? "#fee2e2" : "#f1f5f9",
                          color: isCorrect ? "#166534" : isFallo ? "#991b1b" : "#334155"
                        }}>
                          {r.status}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                          {r.subStatus}
                        </span>
                      </td>

                      {/* Acción / Log */}
                      <td style={{ padding: "12px 16px", fontSize: "0.78rem", maxWidth: "220px", color: "var(--text-color)", opacity: 0.9 }}>
                        {r.action}
                      </td>

                      {/* Acciones Rápidas */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCto(r.ctoRaw)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-color)",
                              color: "var(--text-color)",
                              cursor: "pointer"
                            }}
                            title="Abrir Ficha de la CTO"
                          >
                            Ficha
                          </button>
                          <a
                            href={`/?ctoId=${r.ctoId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-color)",
                              color: "var(--text-color)",
                              textDecoration: "none"
                            }}
                            title="Ver en el Mapa General"
                          >
                            🗺️
                          </a>
                          <a
                            href={`https://maps.google.com/?q=${r.ctoRaw?.lat},${r.ctoRaw?.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-color)",
                              color: "var(--text-color)",
                              textDecoration: "none"
                            }}
                            title="Abrir en Google Maps"
                          >
                            📍
                          </a>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 5. CtoDrawer para abrir directamente cualquier CTO */}
      {selectedCto && (
        <CtoDrawer
          cto={selectedCto}
          users={users}
          subStatuses={subStatuses}
          onClose={() => setSelectedCto(null)}
          onUpdate={() => {
            loadData();
            setSelectedCto(null);
          }}
        />
      )}

    </div>
  );
}
