"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function ImportPage() {
  // Estados para importación de CTOs
  const [fileCtos, setFileCtos] = useState<File | null>(null);
  const [loadingCtos, setLoadingCtos] = useState(false);
  const [resultCtos, setResultCtos] = useState<any>(null);
  const [clearCtos, setClearCtos] = useState(false);
  const [categoryCtos, setCategoryCtos] = useState<"AUDITORIA" | "PROGRAMADA">("AUDITORIA");

  // Estados para importación de Subestados
  const [fileSub, setFileSub] = useState<File | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [resultSub, setResultSub] = useState<any>(null);
  const [clearSub, setClearSub] = useState(false);
  const [categorySub, setCategorySub] = useState<"AUDITORIA" | "PROGRAMADA">("AUDITORIA");

  // Estados para importación de UserSide URLs
  const [fileUserSide, setFileUserSide] = useState<File | null>(null);
  const [loadingUserSide, setLoadingUserSide] = useState(false);
  const [previewUserSide, setPreviewUserSide] = useState<any>(null);
  const [resultUserSide, setResultUserSide] = useState<any>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  const handleSelectUserSideFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileUserSide(file);
    setPreviewUserSide(null);
    setResultUserSide(null);
    setParsedRows([]);
    if (!file) return;

    setLoadingUserSide(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Usamos raw: true y header: 1 para tener un array de arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) {
          throw new Error("El archivo está vacío o no contiene suficientes filas.");
        }

        const rawHeaders = rows[0] || [];
        const headers = Array.from(rawHeaders).map(h => (h !== undefined && h !== null) ? String(h).trim().toLowerCase() : "");
        
        // Buscar columnas por cabecera con validación de existencia
        let ctoColIdx = headers.findIndex(h => typeof h === "string" && h.length > 0 && (h.includes("cto") || h === "numero" || h === "codigo"));
        let urlColIdx = headers.findIndex(h => typeof h === "string" && h.length > 0 && (h.includes("url_ficha") || h.includes("ficha") || h.includes("userside") || h.includes("url")));

        // Si no se encuentran por cabecera, usar índices predeterminados: A (0) y O (14)
        if (ctoColIdx === -1) ctoColIdx = 0;
        if (urlColIdx === -1) urlColIdx = 14;

        const list: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const ctoNum = row[ctoColIdx] ? String(row[ctoColIdx]).trim() : "";
          const urlFicha = row[urlColIdx] ? String(row[urlColIdx]).trim() : "";
          
          if (ctoNum) {
            list.push({ ctoNum, urlFicha });
          }
        }

        setParsedRows(list);

        // Hacer la llamada dryRun
        const res = await fetch("/api/admin/ctos/import-userside", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ctos: list, dryRun: true })
        });
        const json = await res.json();
        setPreviewUserSide(json);
      } catch (err: any) {
        setResultUserSide({ error: err.message });
      } finally {
        setLoadingUserSide(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmUserSideImport = async () => {
    if (parsedRows.length === 0) return;
    setLoadingUserSide(true);
    setResultUserSide(null);
    try {
      const res = await fetch("/api/admin/ctos/import-userside", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctos: parsedRows, dryRun: false })
      });
      const json = await res.json();
      setResultUserSide(json);
      setPreviewUserSide(null); // Limpiar preview tras guardar
    } catch (err: any) {
      setResultUserSide({ error: err.message });
    } finally {
      setLoadingUserSide(false);
    }
  };

  const handleImportCtos = async () => {
    if (!fileCtos) return;
    setLoadingCtos(true);
    setResultCtos(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);
        
        const res = await fetch("/api/ctos/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ctos: parsedData, clearExisting: clearCtos, category: categoryCtos })
        });
        
        const json = await res.json();
        setResultCtos(json);
      } catch (err: any) {
        setResultCtos({ error: err.message });
      } finally {
        setLoadingCtos(false);
      }
    };
    reader.readAsBinaryString(fileCtos);
  };

  const handleImportSubstates = async () => {
    if (!fileSub) return;
    setLoadingSub(true);
    setResultSub(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);
        
        const res = await fetch("/api/status/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ substatuses: parsedData, clearExisting: clearSub, category: categorySub })
        });
        
        const json = await res.json();
        setResultSub(json);
      } catch (err: any) {
        setResultSub({ error: err.message });
      } finally {
        setLoadingSub(false);
      }
    };
    reader.readAsBinaryString(fileSub);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Importar Datos (Excel)</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Carga de forma masiva catálogos de CTOs o subestados personalizados</p>
        </div>
        <Link href="/admin" className="btn" style={{ background: '#e2e8f0', color: '#333', fontWeight: 700 }}>Volver al Panel</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* Panel 1: Importar CTOs */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            1. Catálogo de CTOs
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#475569', lineHeight: 1.5, fontSize: '0.85rem' }}>
            Sube un Excel con columnas como: <strong>Número, NumeroNuevo, Coordenadas, Municipio, Colocación, Notas, Zona, Cluster, Estado</strong> (subestado asociado).
          </p>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={(e) => setFileCtos(e.target.files?.[0] || null)}
            style={{ marginBottom: '1.5rem', width: '100%', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />

          {/* Categoría */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
              Categoría de importación *
            </label>
            <div style={{ display: "flex", gap: "10px", background: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
              <button 
                type="button" 
                onClick={() => setCategoryCtos("AUDITORIA")}
                style={{
                  flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                  background: categoryCtos === "AUDITORIA" ? "#FF7900" : "transparent",
                  color: categoryCtos === "AUDITORIA" ? "white" : "#475569",
                  fontSize: "0.8rem"
                }}
              >
                Auditoría
              </button>
              <button 
                type="button" 
                onClick={() => setCategoryCtos("PROGRAMADA")}
                style={{
                  flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                  background: categoryCtos === "PROGRAMADA" ? "#FF7900" : "transparent",
                  color: categoryCtos === "PROGRAMADA" ? "white" : "#475569",
                  fontSize: "0.8rem"
                }}
              >
                Reparos
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="clearCtos"
              checked={clearCtos}
              onChange={(e) => setClearCtos(e.target.checked)}
              style={{ transform: "scale(1.2)", cursor: "pointer" }}
            />
            <label htmlFor="clearCtos" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Vaciar CTOs de esta categoría antes de importar
            </label>
          </div>

          <button 
            onClick={handleImportCtos} 
            disabled={!fileCtos || loadingCtos}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '44px', opacity: (!fileCtos || loadingCtos) ? 0.7 : 1 }}
          >
            {loadingCtos ? "Procesando CTOs..." : "Subir e Importar CTOs"}
          </button>

          {resultCtos && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: resultCtos.error ? '#fee2e2' : '#dcfce3', borderRadius: '8px', border: '1px solid ' + (resultCtos.error ? '#fca5a5' : '#bbf7d0') }}>
              {resultCtos.error ? (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Error: {resultCtos.error}</p>
              ) : (
                <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>¡Éxito! Se importaron {resultCtos.count} CTOs correctamente.</p>
              )}
            </div>
          )}
        </div>

        {/* Panel 2: Importar Estados / Subestados */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            2. Estados / Subestados y Colores
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#475569', lineHeight: 1.5, fontSize: '0.85rem' }}>
            Sube un Excel independiente con columnas: <strong>Nombre</strong> (del subestado) y <strong>Color</strong> (en formato hexadecimal, ej. #FF0000).
          </p>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={(e) => setFileSub(e.target.files?.[0] || null)}
            style={{ marginBottom: '1.5rem', width: '100%', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />

          {/* Categoría */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
              Categoría de subestados *
            </label>
            <div style={{ display: "flex", gap: "10px", background: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
              <button 
                type="button" 
                onClick={() => setCategorySub("AUDITORIA")}
                style={{
                  flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                  background: categorySub === "AUDITORIA" ? "#FF7900" : "transparent",
                  color: categorySub === "AUDITORIA" ? "white" : "#475569",
                  fontSize: "0.8rem"
                }}
              >
                Auditoría
              </button>
              <button 
                type="button" 
                onClick={() => setCategorySub("PROGRAMADA")}
                style={{
                  flex: 1, padding: "8px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                  background: categorySub === "PROGRAMADA" ? "#FF7900" : "transparent",
                  color: categorySub === "PROGRAMADA" ? "white" : "#475569",
                  fontSize: "0.8rem"
                }}
              >
                Reparos
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="clearSub"
              checked={clearSub}
              onChange={(e) => setClearSub(e.target.checked)}
              style={{ transform: "scale(1.2)", cursor: "pointer" }}
            />
            <label htmlFor="clearSub" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Vaciar subestados de esta categoría antes de importar
            </label>
          </div>

          <button 
            onClick={handleImportSubstates} 
            disabled={!fileSub || loadingSub}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '44px', opacity: (!fileSub || loadingSub) ? 0.7 : 1 }}
          >
            {loadingSub ? "Procesando Subestados..." : "Subir e Importar Subestados"}
          </button>

          {resultSub && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: resultSub.error ? '#fee2e2' : '#dcfce3', borderRadius: '8px', border: '1px solid ' + (resultSub.error ? '#fca5a5' : '#bbf7d0') }}>
              {resultSub.error ? (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Error: {resultSub.error}</p>
              ) : (
                <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>¡Éxito! Se crearon/actualizaron {resultSub.count} subestados correctamente.</p>
              )}
            </div>
          )}
        </div>

        {/* Panel 3: Importar URLs de UserSide */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            3. Enlaces Ficha UserSide
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#475569', lineHeight: 1.5, fontSize: '0.85rem' }}>
            Sube un Excel con enlaces a UserSide. Se usará la columna <strong>A (CTO)</strong> para identificar la caja y la columna <strong>O (URL_Ficha)</strong> para el enlace.
          </p>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleSelectUserSideFile}
            style={{ marginBottom: '1.5rem', width: '100%', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />

          {previewUserSide && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 121, 0, 0.05)', borderRadius: '8px', border: '1.5px solid var(--primary-color)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>Vista Previa de Importación:</h3>
              <p style={{ fontSize: '0.8rem', margin: '4px 0' }}>• Filas detectadas en Excel: <strong>{previewUserSide.total}</strong></p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0', color: '#16a34a' }}>• Coinciden con CTOs en BD: <strong>{previewUserSide.matched}</strong></p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0', color: '#dc2626' }}>• CTOs no encontradas en BD: <strong>{previewUserSide.unmatched}</strong></p>
              
              {previewUserSide.unmatched > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <details style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ver CTOs no encontradas ({previewUserSide.unmatched})</summary>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}>
                      {previewUserSide.unmatchedList.join(', ')}
                    </div>
                  </details>
                </div>
              )}

              <button
                onClick={handleConfirmUserSideImport}
                disabled={previewUserSide.matched === 0 || loadingUserSide}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', minHeight: '38px', fontWeight: 700 }}
              >
                {loadingUserSide ? "Guardando..." : `Confirmar e Importar ${previewUserSide.matched} Enlaces`}
              </button>
            </div>
          )}

          {resultUserSide && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: resultUserSide.error ? '#fee2e2' : '#dcfce3', borderRadius: '8px', border: '1px solid ' + (resultUserSide.error ? '#fca5a5' : '#bbf7d0') }}>
              {resultUserSide.error ? (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Error: {resultUserSide.error}</p>
              ) : (
                <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>¡Éxito! Se actualizaron {resultUserSide.count} enlaces de UserSide correctamente.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
