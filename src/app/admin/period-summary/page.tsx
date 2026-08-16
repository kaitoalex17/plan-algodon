"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface CtoPeriodReport {
  id: string;
  ctoId: string;
  num: string;
  cluster: string;
  zona: string;
  status: string;
  subStatusName: string;
  subStatusColor: string;
  auditor: string;
  auditTime: string;
  auditDate: string;
  rawDate: string;
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

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ startDate: string; endDate: string; count: number; ctos: CtoPeriodReport[] }>({
    startDate: "",
    endDate: "",
    count: 0,
    ctos: []
  });

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
        setSummary(await res.json());
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

  const correctasCount = summary.ctos.filter(c => c.status === "CORRECTO").length;
  const fallosCount = summary.ctos.filter(c => c.status === "FALLO").length;

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto", color: "var(--text-color)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Informe de Auditoría por Período</h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: "4px 0 0 0" }}>
            Período: <strong>{startDate}</strong> hasta <strong>{endDate}</strong>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Desde:</span>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input-field"
              style={{
                padding: "6px 10px",
                minHeight: "36px",
                background: "var(--bg-color)",
                color: "var(--text-color)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "0.85rem"
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Hasta:</span>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input-field"
              style={{
                padding: "6px 10px",
                minHeight: "36px",
                background: "var(--bg-color)",
                color: "var(--text-color)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "0.85rem"
              }}
            />
          </div>
          <Link 
            href={session?.user && (session.user as any).role === "GESTOR" ? "/gestion" : "/admin"} 
            className="btn btn-primary"
          >
            Volver al Panel
          </Link>
        </div>
      </div>

      {/* Tarjetas de métricas del período */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.2rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Total CTOs Auditadas</span>
          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary-color)" }}>{summary.count}</span>
        </div>
        <div className="glass-panel" style={{ padding: "1.2rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Correctas</span>
          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981" }}>{correctasCount}</span>
        </div>
        <div className="glass-panel" style={{ padding: "1.2rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Con Fallos</span>
          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ef4444" }}>{fallosCount}</span>
        </div>
      </div>

      {/* Tabla de Auditorías del Período */}
      <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Listado de CTOs en el Período ({summary.count})
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <a 
              href={`/api/admin/period-summary/export?type=excel&startDate=${startDate}&endDate=${endDate}`} 
              className="btn" 
              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "6px 14px", fontSize: "0.85rem", gap: "6px", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center" }}
            >
              📊 Descargar Excel
            </a>
            <a 
              href={`/api/admin/period-summary/export?type=pdf&startDate=${startDate}&endDate=${endDate}`} 
              className="btn" 
              style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", padding: "6px 14px", fontSize: "0.85rem", gap: "6px", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center" }}
            >
              📄 Descargar PDF
            </a>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
            Cargando datos del período...
          </div>
        ) : summary.ctos.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b", fontStyle: "italic", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
            No se encontraron auditorías registradas en el rango de fechas seleccionado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", color: "#64748b" }}>
                  <th style={{ padding: "10px 8px" }}>Hora</th>
                  <th style={{ padding: "10px 8px" }}>Técnico</th>
                  <th style={{ padding: "10px 8px" }}>Código CTO</th>
                  <th style={{ padding: "10px 8px" }}>Zona/Cluster</th>
                  <th style={{ padding: "10px 8px" }}>Estado</th>
                  <th style={{ padding: "10px 8px" }}>Subestado</th>
                  <th style={{ padding: "10px 8px" }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {summary.ctos.map((cto) => (
                  <tr key={cto.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{cto.auditTime}</td>
                    <td style={{ padding: "8px" }}>{cto.auditor}</td>
                    <td style={{ padding: "8px", fontWeight: 700 }}>{cto.num}</td>
                    <td style={{ padding: "8px" }}>{cto.zona} / {cto.cluster}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ 
                        fontSize: "0.75rem", 
                        background: cto.status === "CORRECTO" ? "#dcfce7" : "#fee2e2", 
                        color: cto.status === "CORRECTO" ? "#166534" : "#991b1b",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700
                      }}>
                        {cto.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cto.subStatusColor, flexShrink: 0 }} />
                        {cto.subStatusName}
                      </div>
                    </td>
                    <td style={{ padding: "8px", fontWeight: 600, color: "var(--primary-color)" }}>{cto.auditDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
