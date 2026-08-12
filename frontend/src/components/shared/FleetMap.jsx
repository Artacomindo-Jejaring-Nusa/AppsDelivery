import React, { useRef, useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// ─── Google Maps API Key ───
const GOOGLE_MAPS_API_KEY = 'AIzaSyCP9cX0PB6oA2MkereZlEzuYJd98bTrMOM';

setOptions({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

// ─── Kalimantan Center ───
const KALIMANTAN_CENTER = { lat: -1.5, lng: 116.0 };
const DEFAULT_ZOOM = 6;

// ─── BTS Site Data (10 Kalimantan sites from DB seed) ───
const BTS_SITES = [
  { id: 'KAL-BTS-0001', name: 'BTS Banjarmasin Utara', lat: -3.3194, lng: 114.5907, status: 'active' },
  { id: 'KAL-BTS-0002', name: 'BTS Balikpapan Tengah', lat: -1.2654, lng: 116.8312, status: 'active' },
  { id: 'KAL-BTS-0003', name: 'BTS Samarinda Seberang', lat: -0.5022, lng: 117.1536, status: 'warning' },
  { id: 'KAL-BTS-0004', name: 'BTS Pontianak Kota', lat: -0.0263, lng: 109.3425, status: 'active' },
  { id: 'KAL-BTS-0005', name: 'BTS Palangkaraya Pahandut', lat: -2.2088, lng: 113.916, status: 'active' },
  { id: 'KAL-BTS-0006', name: 'BTS Banjarbaru Selatan', lat: -3.4402, lng: 114.8304, status: 'active' },
  { id: 'KAL-BTS-0007', name: 'BTS Tarakan Barat', lat: 3.3065, lng: 117.5925, status: 'error' },
  { id: 'KAL-BTS-0008', name: 'BTS Singkawang Barat', lat: 0.9071, lng: 108.986, status: 'active' },
  { id: 'KAL-BTS-0009', name: 'BTS Tenggarong Seberang', lat: -0.4189, lng: 117.0012, status: 'warning' },
  { id: 'KAL-BTS-0010', name: 'BTS Sampit Baamang', lat: -2.5367, lng: 112.952, status: 'active' },
];

// ─── Status Colors ───
const STATUS_COLORS = {
  active: '#1e3a8a',
  warning: '#d97706',
  error: '#ba1a1a',
  on_route: '#059669',
  idle: '#6b7280',
};

// Default fallback positions for Kalimantan drivers
const DRIVER_DEFAULT_LOCATIONS = {
  'Joko Kurir': { lat: -3.3194, lng: 114.5907 }, // Banjarmasin
  'Budi Kurir': { lat: -1.2654, lng: 116.8312 }, // Balikpapan
};

// ─── SVG Marker Icon Builders ───
function btsSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
    </svg>
  `)}`;
}

function truckSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="2" width="28" height="28" rx="6" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="16" y="22" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white">🚛</text>
    </svg>
  `)}`;
}

// ─── InfoWindow HTML builders ───
function btsInfoHtml(site) {
  const color = STATUS_COLORS[site.status] || STATUS_COLORS.active;
  return `
    <div style="font-family: Inter, sans-serif; min-width: 180px; padding: 4px 0;">
      <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
        ${site.id}
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #191c1e;">
        ${site.name}
      </div>
      <div style="font-size: 11px; color: #757682; margin-top: 6px;">
        Status: <span style="color: ${color}; font-weight: 600;">${site.status.toUpperCase()}</span>
      </div>
      <div style="font-size: 11px; color: #757682; margin-top: 2px;">
        📍 ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}
      </div>
    </div>
  `;
}

function vehicleInfoHtml(driver) {
  const statusKey = driver.is_available ? 'idle' : 'on_route';
  const color = STATUS_COLORS[statusKey];
  const statusLabel = driver.is_available ? '⚪ Available (Idle)' : '🟢 On Route / In Transit';
  return `
    <div style="font-family: Inter, sans-serif; min-width: 170px; padding: 4px 0;">
      <div style="font-size: 14px; font-weight: 700; color: #191c1e;">
        🚛 ${driver.full_name}
      </div>
      <div style="font-size: 12px; font-weight: 600; color: #1e3a8a; margin-top: 2px;">
        Plat: ${driver.vehicle_plate || 'No Plate'} (${driver.vehicle_type || 'Truck'})
      </div>
      <div style="font-size: 11px; color: #757682; margin-top: 2px;">
        📱 ${driver.phone || '-'}
      </div>
      <div style="font-size: 12px; color: ${color}; font-weight: 600; margin-top: 6px;">
        ${statusLabel}
      </div>
      <div style="font-size: 10px; color: #059669; font-weight: 700; margin-top: 4px;">
        ● REALTIME GPS ACTIVE
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════
// ─── FleetMap Component ──────────────
// ═══════════════════════════════════════
export default function FleetMap({ drivers = [], height = '450px', className = '' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const infoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Initialize Map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    importLibrary('maps')
      .then(({ Map }) => {
        const { InfoWindow, Marker, Size, Point } = google.maps;
        const map = new Map(mapContainerRef.current, {
          center: KALIMANTAN_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: 3,
            style: 1,
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: 6,
          },
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry.fill',
              stylers: [{ color: '#c8d7e8' }],
            },
            {
              featureType: 'landscape',
              elementType: 'geometry.fill',
              stylers: [{ color: '#f2f4f6' }],
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.fill',
              stylers: [{ color: '#ffd29e' }],
            },
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapRef.current = map;
        infoWindowRef.current = new InfoWindow();

        // Add BTS Site Markers
        BTS_SITES.forEach((site) => {
          const color = STATUS_COLORS[site.status] || STATUS_COLORS.active;
          const marker = new Marker({
            position: { lat: site.lat, lng: site.lng },
            map,
            title: `${site.id} — ${site.name}`,
            icon: {
              url: btsSvgIcon(color),
              scaledSize: new Size(36, 36),
              anchor: new Point(18, 36),
            },
            optimized: true,
          });

          marker.addListener('click', () => {
            infoWindowRef.current.setContent(btsInfoHtml(site));
            infoWindowRef.current.open(map, marker);
          });
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setMapError('Failed to load Google Maps. Check API key or network.');
      });

    return () => {
      mapRef.current = null;
    };
  }, []);

  // Update real-time driver markers whenever drivers list updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !google.maps) return;

    const { Marker, Size, Point } = google.maps;
    const currentMarkers = markersRef.current;
    const activeDriverIds = new Set();

    drivers.forEach((driver, idx) => {
      activeDriverIds.add(driver.id);

      // Determine position (from backend GPS or default Kalimantan city coords)
      let lat = driver.current_lat || driver.latitude;
      let lng = driver.current_lng || driver.longitude;

      if (!lat || !lng) {
        const defaultLoc = DRIVER_DEFAULT_LOCATIONS[driver.full_name] || {
          lat: -1.5 + (idx * 0.4),
          lng: 114.5 + (idx * 0.8),
        };
        lat = defaultLoc.lat;
        lng = defaultLoc.lng;
      }

      const statusKey = driver.is_available ? 'idle' : 'on_route';
      const color = STATUS_COLORS[statusKey];
      const pos = { lat: Number(lat), lng: Number(lng) };

      if (currentMarkers[driver.id]) {
        // Update existing marker position in real-time
        currentMarkers[driver.id].setPosition(pos);
        currentMarkers[driver.id].setIcon({
          url: truckSvgIcon(color),
          scaledSize: new Size(32, 32),
          anchor: new Point(16, 16),
        });
      } else {
        // Create new driver marker
        const marker = new Marker({
          position: pos,
          map: mapRef.current,
          title: `${driver.full_name} — ${driver.vehicle_plate || 'Armada'}`,
          icon: {
            url: truckSvgIcon(color),
            scaledSize: new Size(32, 32),
            anchor: new Point(16, 16),
          },
          optimized: true,
          zIndex: 200,
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(vehicleInfoHtml(driver));
          infoWindowRef.current.open(mapRef.current, marker);
        });

        currentMarkers[driver.id] = marker;
      }
    });

    // Clean up removed drivers
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeDriverIds.has(id)) {
        currentMarkers[id].setMap(null);
        delete currentMarkers[id];
      }
    });

    setLastSyncTime(new Date());
  }, [drivers, mapLoaded]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ height }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Overlay Badge */}
      <div className="absolute top-md left-md z-10 flex flex-col gap-xs pointer-events-none">
        <div className="bg-surface-container-lowest/95 backdrop-blur shadow-md p-xs px-md rounded-lg flex items-center gap-sm border border-emerald-300">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-label-sm text-label-sm text-emerald-900 font-bold">
            🔴 REALTIME MAPS TRACKING (Auto-Sync 5s)
          </span>
          <span className="text-[10px] text-gray-500 ml-1 font-mono">
            {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-md z-10 bg-surface-container-lowest/90 backdrop-blur shadow rounded px-md py-sm pointer-events-none">
        <div className="flex items-center gap-md text-[11px]">
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
            <span className="text-on-surface-variant font-medium">BTS Active</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
            <span className="text-on-surface-variant font-medium">Warning</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
            <span className="text-on-surface-variant font-medium">Error</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-3 h-3 rounded bg-[#059669] flex items-center justify-center text-[9px] text-white">🚛</span>
            <span className="text-on-surface-variant font-bold">Driver Realtime</span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-surface-variant flex items-center justify-center z-20">
          <div className="text-center">
            <span className="material-symbols-outlined text-[40px] text-primary/40 animate-spin">
              progress_activity
            </span>
            <p className="font-label-md text-label-md text-on-surface-variant mt-sm">
              Loading Realtime Google Maps...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="absolute inset-0 bg-surface-variant flex items-center justify-center z-20">
          <div className="text-center px-lg">
            <span className="material-symbols-outlined text-[40px] text-error/50">
              error
            </span>
            <p className="font-label-md text-label-md text-on-surface-variant mt-sm">
              {mapError}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
