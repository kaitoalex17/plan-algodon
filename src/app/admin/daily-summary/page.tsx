"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CtoReport {
  id: string;
  num: string;
  cluster: string;
  zona: string;
  status: string;
  subStatusName: string;
  auditor: string;
  auditTime: string;
}

export default function DailySummaryPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ date: string; count: number; ctos: CtoReport[] }>({
    date: "",
    count: 0,
    ctos: []
  });

  // SMTP Settings form
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailScheduleHour, setEmailScheduleHour] = useState("20");
  const [emailScheduleEnabled, setEmailScheduleEnabled] = useState(false);
  const [publicReportPassword, setPublicReportPassword] = useState("netdata");
  const [emailFooter, setEmailFooter] = useState("");
  const [emailMethod, setEmailMethod] = useState("smtp");

  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  async function loadData() {
    try {
      const [resSummary, resSettings] = await Promise.all([
        fetch(`/api/admin/daily-summary?date=${selectedDate}`),
        fetch("/api/admin/email-settings")
      ]);

      if (resSummary.ok) {
        setSummary(await resSummary.json());
      }
      if (resSettings.ok) {
        const settings = await resSettings.json();
        setSmtpHost(settings.smtpHost || "");
        setSmtpPort(settings.smtpPort || "587");
        setSmtpSecure(settings.smtpSecure || false);
        setSmtpUser(settings.smtpUser || "");
        setSmtpPass(settings.smtpPass || "");
        setEmailRecipients(settings.emailRecipients || "");
        setEmailScheduleHour(settings.emailScheduleHour || "20");
        setEmailScheduleEnabled(settings.emailScheduleEnabled || false);
        setPublicReportPassword(settings.publicReportPassword || "netdata");
        setEmailFooter(settings.emailFooter || "");
        setEmailMethod(settings.emailMethod || "smtp");
      }
    } catch (err) {
      console.error("Error cargando resumen diario:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpSecure,
          smtpUser,
          smtpPass,
          emailRecipients,
          emailScheduleHour: parseInt(emailScheduleHour),
          emailScheduleEnabled,
          publicReportPassword,
          emailFooter,
          emailMethod
        })
      });
      if (res.ok) {
        alert("Configuración de envío y planificación guardados correctamente.");
        loadData();
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al guardar.");
    } finally {
      setSavingSettings(false);
    }
  };

  const [sendingManual, setSendingManual] = useState(false);

  const handleSendTestEmail = async () => {
    if (!emailRecipients) {
      alert("Por favor introduce los destinatarios del correo.");
      return;
    }
    if (emailMethod === "smtp" && (!smtpHost || !smtpUser || !smtpPass)) {
      alert("Por favor rellena primero la configuración SMTP.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/daily-summary/export", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, isTest: true })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Correo de prueba enviado con éxito.");
      } else {
        alert(data.error || "Error al enviar el correo de prueba.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al realizar el envío de prueba.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendDailyReportManual = async () => {
    if (!emailRecipients) {
      alert("Por favor introduce los destinatarios del correo.");
      return;
    }
    if (emailMethod === "smtp" && (!smtpHost || !smtpUser || !smtpPass)) {
      alert("Por favor rellena primero la configuración SMTP.");
      return;
    }
    setSendingManual(true);
    try {
      const res = await fetch("/api/admin/daily-summary/export", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, isTest: false })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Reporte diario enviado correctamente.");
      } else {
        alert(data.error || "Error al enviar el reporte.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en el servidor al enviar el reporte.");
    } finally {
      setSendingManual(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
        Cargando Resumen Diario...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", color: "var(--text-color)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Resumen de Auditoría</h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: "4px 0 0 0" }}>Fecha reportada: <strong>{summary.date}</strong></p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Elegir Día:</span>
            <input 
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input-field"
              style={{
                padding: "6px 12px",
                minHeight: "36px",
                background: "var(--bg-color)",
                color: "var(--text-color)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px"
              }}
            />
          </div>
          <Link href="/admin" className="btn btn-primary">Volver al Panel</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* Listado de Auditorías de Hoy */}
        <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              CTOs Auditadas ({summary.count})
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <a href={`/api/admin/daily-summary/export?type=excel&date=${selectedDate}`} className="btn" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "6px 12px", fontSize: "0.85rem", gap: "6px" }}>
                📊 Descargar Excel
              </a>
              <a href={`/api/admin/daily-summary/export?type=pdf&date=${selectedDate}`} className="btn" style={{ background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", padding: "6px 12px", fontSize: "0.85rem", gap: "6px" }}>
                📄 Descargar PDF
              </a>
            </div>
          </div>

          {summary.ctos.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b", fontStyle: "italic", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
              Ningún técnico ha finalizado auditorías en el día de hoy todavía.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-color)", color: "#64748b" }}>
                    <th style={{ padding: "8px" }}>Hora</th>
                    <th style={{ padding: "8px" }}>Técnico</th>
                    <th style={{ padding: "8px" }}>Código CTO</th>
                    <th style={{ padding: "8px" }}>Zona/Cluster</th>
                    <th style={{ padding: "8px" }}>Estado</th>
                    <th style={{ padding: "8px" }}>Subestado</th>
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
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cto.subStatusColor }} />
                          {cto.subStatusName}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ajustes de Correo y Planificación */}
        <div className="glass-panel" style={{ padding: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1.25rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            Ajustes SMTP y Envío Automático
          </h2>

          <form onSubmit={handleSaveSettings} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Método de Envío</label>
              <select 
                value={emailMethod} 
                onChange={e => setEmailMethod(e.target.value)} 
                className="input-field" 
                style={{ padding: "8px 12px", minHeight: "38px" }}
              >
                <option value="smtp">SMTP Personalizado (Servidor de correo externo)</option>
                <option value="sendmail">Sendmail del Servidor Local (Sin credenciales, recomendado si falla SMTP)</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 2", opacity: emailMethod === "sendmail" ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Servidor SMTP (Host)</label>
              <input 
                type="text" 
                value={smtpHost} 
                onChange={e => setSmtpHost(e.target.value)} 
                className="input-field" 
                placeholder="smtp.example.com"
                disabled={emailMethod === "sendmail"}
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ opacity: emailMethod === "sendmail" ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Puerto SMTP</label>
              <input 
                type="text" 
                value={smtpPort} 
                onChange={e => setSmtpPort(e.target.value)} 
                className="input-field" 
                placeholder="587"
                disabled={emailMethod === "sendmail"}
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: emailMethod === "sendmail" ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <input 
                type="checkbox" 
                id="smtpSecure"
                checked={smtpSecure} 
                onChange={e => setSmtpSecure(e.target.checked)} 
                disabled={emailMethod === "sendmail"}
                style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)", cursor: emailMethod === "sendmail" ? "default" : "pointer" }}
              />
              <label htmlFor="smtpSecure" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: emailMethod === "sendmail" ? "default" : "pointer" }}>Conexión Segura (SSL/TLS)</label>
            </div>

            <div style={{ opacity: emailMethod === "sendmail" ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Usuario SMTP (Email)</label>
              <input 
                type="text" 
                value={smtpUser} 
                onChange={e => setSmtpUser(e.target.value)} 
                className="input-field" 
                placeholder="noreply@example.com"
                disabled={emailMethod === "sendmail"}
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ opacity: emailMethod === "sendmail" ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Contraseña SMTP</label>
              <input 
                type="password" 
                value={smtpPass} 
                onChange={e => setSmtpPass(e.target.value)} 
                className="input-field" 
                placeholder="••••••••••••"
                disabled={emailMethod === "sendmail"}
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Destinatarios (Separados por comas)</label>
              <input 
                type="text" 
                value={emailRecipients} 
                onChange={e => setEmailRecipients(e.target.value)} 
                className="input-field" 
                placeholder="jefe@example.com, auditor@example.com"
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ borderTop: "1px dashed var(--border-color)", gridColumn: "span 2", paddingTop: "1rem" }} />

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Hora de Envío Diario (Horario Madrid)</label>
              <select
                value={emailScheduleHour}
                onChange={e => setEmailScheduleHour(e.target.value)}
                className="input-field"
                style={{ padding: "8px 12px", minHeight: "38px" }}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input 
                type="checkbox" 
                id="emailScheduleEnabled"
                checked={emailScheduleEnabled} 
                onChange={e => setEmailScheduleEnabled(e.target.checked)} 
                style={{ width: "18px", height: "18px", accentColor: "var(--primary-color)", cursor: "pointer" }}
              />
              <label htmlFor="emailScheduleEnabled" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Activar Envío Diario Automático</label>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Contraseña para Reporte Público (Predeterminada: netdata)</label>
              <input 
                type="text" 
                value={publicReportPassword} 
                onChange={e => setPublicReportPassword(e.target.value)} 
                className="input-field" 
                placeholder="netdata"
                style={{ padding: "8px 12px", minHeight: "38px" }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: 600 }}>Pie de Página del Correo (Soporta formato HTML: enlaces &lt;a&gt;, imágenes, etc.)</label>
              <textarea
                value={emailFooter}
                onChange={e => setEmailFooter(e.target.value)}
                className="input-field"
                placeholder='Ejemplo: <p style="text-align: center;"><a href="https://example.com"><img src="https://example.com/logo.png" alt="Logo" width="120" /></a></p>'
                rows={3}
                style={{ padding: "8px 12px", minHeight: "80px", fontFamily: "monospace", width: "100%", background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)", borderRadius: "6px" }}
              />
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  className="btn"
                  disabled={sendingTest || sendingManual || savingSettings}
                  style={{ flex: 1, background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)", fontWeight: 700, minHeight: "44px" }}
                >
                  {sendingTest ? "Enviando Prueba..." : "📧 Enviar Correo de Prueba"}
                </button>

                <button
                  type="button"
                  onClick={handleSendDailyReportManual}
                  className="btn"
                  disabled={sendingTest || sendingManual || savingSettings}
                  style={{ flex: 1.5, background: "var(--bg-color)", color: "var(--text-color)", border: "1px solid var(--border-color)", fontWeight: 700, minHeight: "44px" }}
                >
                  {sendingManual ? "Enviando Reporte..." : "✉️ Enviar Reporte del Día (Manual)"}
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingTest || sendingManual || savingSettings}
                style={{ width: "100%", fontWeight: 700, minHeight: "44px", justifyContent: "center" }}
              >
                {savingSettings ? "Guardando..." : "💾 Guardar Configuración"}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
