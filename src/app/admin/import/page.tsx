"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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
          body: JSON.stringify({ ctos: parsedData })
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
