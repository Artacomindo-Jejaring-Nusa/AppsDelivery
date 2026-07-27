import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// ─── Google Maps API Key ───
const GOOGLE_MAPS_API_KEY = 'AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao';

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

// ─── Simulated Active Fleet ───
const FLEET_VEHICLES = [
  { id: 'v1', driver: 'Anton D.', plate: 'B 1234 ABC', lat: -1.28, lng: 116.85, status: 'on_route' },
  { id: 'v2', driver: 'Rina S.', plate: 'D 5678 XYZ', lat: -3.32, lng: 114.60, status: 'idle' },
  { id: 'v3', driver: 'Budi M.', plate: 'L 9012 DEF', lat: -0.50, lng: 117.16, status: 'on_route' },
  { id: 'v4', driver: 'Kevin P.', plate: 'BK 4455 GH', lat: -2.21, lng: 113.92, status: 'on_route' },
  { id: 'v5', driver: 'Made A.', plate: 'DK 3321 OP', lat: 0.91, lng: 109.00, status: 'idle' },
];

// ─── Status Colors ───
const STATUS_COLORS = {
  active: '#1e3a8a',
  warning: '#d97706',
  error: '#ba1a1a',
  on_route: '#059669',
  idle: '#6b7280',
};

// ─── SVG Marker Icon Builders ───
function btsSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2.5"/>
    </svg>
  `)}`;
}

function truckSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="2" y="2" width="28" height="28" rx="6" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="16" y="22" text-anchor="middle" font-family="Material Symbols Outlined" font-size="16" fill="white">🚛</text>
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

function vehicleInfoHtml(vehicle) {
  const color = STATUS_COLORS[vehicle.status] || STATUS_COLORS.idle;
  const statusLabel = vehicle.status === 'on_route' ? '🟢 On Route' : '⚪ Idle';
  return `
    <div style="font-family: Inter, sans-serif; min-width: 160px; padding: 4px 0;">
      <div style="font-size: 14px; font-weight: 700; color: #191c1e;">
        🚛 ${vehicle.driver}
      </div>
      <div style="font-size: 12px; color: #757682; margin-top: 4px;">
        ${vehicle.plate}
      </div>
      <div style="font-size: 12px; color: ${color}; font-weight: 600; margin-top: 6px;">
        ${statusLabel}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════
// ─── FleetMap Component ──────────────
// ═══════════════════════════════════════
export default function FleetMap({ height = '320px', className = '' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

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
            position: 3, // ControlPosition.TOP_RIGHT
            style: 1,    // MapTypeControlStyle.DROPDOWN_MENU
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: 6, // ControlPosition.RIGHT_CENTER
          },
          styles: [
            // Subtle styling to match enterprise dashboard feel
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

        // Shared InfoWindow (only one open at a time)
        const infoWindow = new InfoWindow();

        // ─── Add BTS Site Markers ───
        BTS_SITES.forEach((site) => {
          const color = STATUS_COLORS[site.status] || STATUS_COLORS.active;
          const marker = new Marker({
            position: { lat: site.lat, lng: site.lng },
            map,
            title: `${site.id} — ${site.name}`,
            icon: {
              url: btsSvgIcon(color),
              scaledSize: new Size(18, 18),
              anchor: new Point(9, 9),
            },
            optimized: true,
          });

          marker.addListener('click', () => {
            infoWindow.setContent(btsInfoHtml(site));
            infoWindow.open(map, marker);
          });

          // Hover effect
          marker.addListener('mouseover', () => {
            marker.setIcon({
              url: btsSvgIcon(color),
              scaledSize: new Size(24, 24),
              anchor: new Point(12, 12),
            });
          });
          marker.addListener('mouseout', () => {
            marker.setIcon({
              url: btsSvgIcon(color),
              scaledSize: new Size(18, 18),
              anchor: new Point(9, 9),
            });
          });
        });

        // ─── Add Fleet Vehicle Markers ───
        FLEET_VEHICLES.forEach((vehicle) => {
          const color = STATUS_COLORS[vehicle.status] || STATUS_COLORS.idle;
          const marker = new Marker({
            position: { lat: vehicle.lat, lng: vehicle.lng },
            map,
            title: `${vehicle.driver} — ${vehicle.plate}`,
            icon: {
              url: truckSvgIcon(color),
              scaledSize: new Size(30, 30),
              anchor: new Point(15, 15),
            },
            optimized: true,
            zIndex: 100,
          });

          marker.addListener('click', () => {
            infoWindow.setContent(vehicleInfoHtml(vehicle));
            infoWindow.open(map, marker);
          });

          marker.addListener('mouseover', () => {
            marker.setIcon({
              url: truckSvgIcon(color),
              scaledSize: new Size(36, 36),
              anchor: new Point(18, 18),
            });
          });
          marker.addListener('mouseout', () => {
            marker.setIcon({
              url: truckSvgIcon(color),
              scaledSize: new Size(30, 30),
              anchor: new Point(15, 15),
            });
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

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ height }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Overlay Badge */}
      <div className="absolute top-md left-md z-10 flex flex-col gap-xs pointer-events-none">
        <div className="bg-surface-container-lowest/90 backdrop-blur shadow p-xs px-md rounded flex items-center gap-sm">
          <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-on-surface">
            Live Fleet Location
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-md z-10 bg-surface-container-lowest/90 backdrop-blur shadow rounded px-md py-sm pointer-events-none">
        <div className="flex items-center gap-md text-[11px]">
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
            <span className="text-on-surface-variant">BTS Active</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
            <span className="text-on-surface-variant">Warning</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
            <span className="text-on-surface-variant">Error</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="w-2.5 h-2.5 rounded bg-[#059669]"></span>
            <span className="text-on-surface-variant">Fleet</span>
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
              Loading Google Maps...
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
