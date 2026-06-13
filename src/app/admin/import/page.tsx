"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [category, setCategory] = useState<"AUDITORIA" | "PROGRAMADA">("AUDITORIA");

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

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
          body: JSON.stringify({ ctos: parsedData, clearExisting, category })
        });
        
        const json = await res.json();
        setResult(json);
      } catch (err: any) {
        setResult({ error: err.message });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Importar CTOs</h2>
        <Link href="/admin" className="btn" style={{ background: '#e2e8f0', color: '#333' }}>Volver</Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <p style={{ marginBottom: '1.5rem', color: '#475569', lineHeight: 1.6 }}>
          Selecciona un archivo Excel (.xlsx) que contenga las columnas:<br/>
          <strong>Número, NumeroNuevo, Coordenadas, Municipio, Colocación, Fecha de agregación, Notas.</strong>
        </p>
        
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: '1.5rem', width: '100%', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}
        />

        {/* Selector de Categoría */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
            Categoría de importación *
          </label>
          <div style={{ display: "flex", gap: "10px", background: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
            <button 
              type="button" 
              onClick={() => setCategory("AUDITORIA")}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                background: category === "AUDITORIA" ? "#FF7900" : "transparent",
                color: category === "AUDITORIA" ? "white" : "#475569",
                transition: "all 0.15s", fontSize: "0.85rem"
              }}
            >
              Auditoría (Caja Normal)
            </button>
            <button 
              type="button" 
              onClick={() => setCategory("PROGRAMADA")}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer",
                background: category === "PROGRAMADA" ? "#FF7900" : "transparent",
                color: category === "PROGRAMADA" ? "white" : "#475569",
                transition: "all 0.15s", fontSize: "0.85rem"
              }}
            >
              Programadas (Pendientes)
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="clearExisting"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            style={{ transform: "scale(1.2)", cursor: "pointer" }}
          />
          <label htmlFor="clearExisting" style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
            Vaciar catálogo de esta categoría en la base de datos antes de importar
          </label>
        </div>

        <button 
          onClick={handleImport} 
          disabled={!file || loading}
          className="btn btn-primary"
          style={{ width: '100%', opacity: (!file || loading) ? 0.7 : 1 }}
        >
          {loading ? "Procesando..." : "Subir e Importar"}
        </button>

        {result && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: result.error ? '#fee2e2' : '#dcfce3', borderRadius: '8px' }}>
            {result.error ? (
              <p style={{ color: '#ef4444' }}>Error: {result.error}</p>
            ) : (
              <p style={{ color: '#16a34a', fontWeight: 600 }}>¡Éxito! Se importaron {result.count} CTOs correctamente.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
