"use client";

import { useState } from "react";

export default function CtoDrawer({ cto, onClose, onUpdate }: { cto: any, onClose: () => void, onUpdate?: () => void }) {
  if (!cto) return null;

  const openGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${cto.lat},${cto.lng}`, '_blank');
  };

  const openCtoTracker = () => {
    window.open(`https://cto-tracker.olin.es/cto/${cto.num}`, '_blank');
  };

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} 
        onClick={onClose}
      />
      <div className="cto-drawer open">
        <div className="drawer-handle" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>CTO: {cto.num}</h2>
          <span style={{ padding: '4px 12px', background: '#e2e8f0', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
            {cto.status}
          </span>
        </div>

        <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: '#475569' }}>
          <p><strong>Municipio:</strong> {cto.municipio || 'N/A'}</p>
          <p><strong>Colocación:</strong> {cto.colocacion || 'N/A'}</p>
          <p><strong>Notas:</strong> {cto.notas || 'Sin notas'}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <button onClick={openGoogleMaps} className="btn btn-primary" style={{ flex: 1, fontSize: '0.9rem' }}>
            Abrir en Google Maps
          </button>
          <button onClick={openCtoTracker} className="btn" style={{ flex: 1, background: '#111827', color: 'white', fontSize: '0.9rem' }}>
            Ver en CTO Tracker
          </button>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Actualizar Estado y Adjuntos</h3>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <label className="btn" style={{ flex: 1, background: '#e2e8f0', color: '#111827', cursor: 'pointer', textAlign: 'center' }}>
              Subir Imágenes
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  const formData = new FormData();
                  for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                  }
                  formData.append('ctoId', cto.id);
                  await fetch('/api/upload', { method: 'POST', body: formData });
                  alert(`Se han subido ${files.length} imágenes correctamente`);
                  if (onUpdate) onUpdate();
                }
              }} />
            </label>
          </div>

          <textarea 
            className="input-field" 
            placeholder="Añadir un comentario o nota sobre el estado..." 
            style={{ minHeight: '80px', marginBottom: '1rem', resize: 'vertical' }}
          />
          <button className="btn btn-primary" style={{ width: '100%' }}>Guardar Cambios</button>
        </div>
      </div>
    </>
  );
}
