import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet";
import { useState, useEffect } from "react";

function LocationButton() {
  const map = useMap();
  const locateUser = () => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, 16);
    });
  };

  return (
    <button 
      onClick={locateUser}
      style={{
        position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
        background: 'white', border: 'none', padding: '10px', borderRadius: '50%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)', cursor: 'pointer', width: '50px', height: '50px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
      }}
    >
      📍
    </button>
  );
}

function CtoMarkers({ ctos, onCtoClick }: { ctos: any[], onCtoClick: (cto: any) => void }) {
  const map = useMap();
  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState<number>(map.getZoom());
  
  useEffect(() => {
    setBounds(map.getBounds());
  }, [map]);

  useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
    },
    zoomend: () => {
      setZoom(map.getZoom());
    }
  });

  // Límite de zoom configurable desde ajustes, por ahora fijo en 13
  const ZOOM_THRESHOLD = 13; 
  
  if (zoom < ZOOM_THRESHOLD) {
    return (
      <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        Acércate para ver las CTOs
      </div>
    );
  }

  const visibleCtos = ctos.filter(cto => {
    if (!bounds) return true; 
    return bounds.contains([cto.lat, cto.lng]);
  });

  return (
    <>
      {visibleCtos.map(cto => (
        <CircleMarker 
          key={cto.id}
          center={[cto.lat, cto.lng]}
          radius={8}
          pathOptions={{ 
            color: cto.subStatus?.color || (cto.status === 'PENDIENTE' ? '#808080' : cto.status === 'CORRECTO' ? '#10b981' : '#ef4444'), 
            fillColor: cto.assignedTo?.color || '#ffffff', 
            fillOpacity: 1,
            weight: 3
          }}
          eventHandlers={{
            click: () => onCtoClick(cto)
          }}
        />
      ))}
    </>
  );
}

export default function Map({ ctos, onCtoClick }: { ctos: any[], onCtoClick: (cto: any) => void }) {
  const [tileUrl, setTileUrl] = useState("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");

  return (
    <MapContainer center={[36.425, -5.144]} zoom={14} className="map-container" zoomControl={false}>
      <TileLayer url={tileUrl} />
      
      <div style={{ position: 'absolute', top: '80px', right: '10px', zIndex: 1000, background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <select onChange={(e) => setTileUrl(e.target.value)} style={{border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, color: '#111827', fontSize: '1rem'}}>
          <option value="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png">Mapa Normal</option>
          <option value="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}">Satélite</option>
        </select>
      </div>

      <CtoMarkers ctos={ctos} onCtoClick={onCtoClick} />
      <LocationButton />
    </MapContainer>
  );
}
