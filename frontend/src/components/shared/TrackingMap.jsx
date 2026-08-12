import React, { useRef, useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import zteBtsSites from '../../data/zte_bts_sites.json';

// ─── Google Maps API Key ───
const GOOGLE_MAPS_API_KEY = 'AIzaSyCP9cX0PB6oA2MkereZlEzuYJd98bTrMOM';

setOptions({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

// ─── Kalimantan Center ───
const KALIMANTAN_CENTER = { lat: -1.5, lng: 116.0 };
const DEFAULT_ZOOM = 6;

// Default fallback positions for Kalimantan drivers if GPS is not yet sent
const DRIVER_DEFAULT_LOCATIONS = {
  'Joko Kurir': { lat: -3.3194, lng: 114.5907 }, // Banjarmasin
  'Budi Kurir': { lat: -1.2654, lng: 116.8312 }, // Balikpapan
};

// ─── Status Colors ───
const STATUS_COLORS = {
  active: '#00236f',
  warning: '#f59e0b',
  error: '#ef4444',
  on_route: '#10b981',
  idle: '#6b7280',
};

// ─── SVG Marker Icon Builders ───
function btsSvgIcon(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
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

export default function TrackingMap({ drivers = [], btsSites = [], selectedDO = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkersRef = useRef({});
  const btsMarkersRef = useRef({});
  const infoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    importLibrary('maps').then(({ Map }) => {
      if (!mapRef.current) return;

      const { InfoWindow } = window.google.maps;
      const mapOptions = {
        center: KALIMANTAN_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeId: 'terrain',
        disableDefaultUI: false,
        zoomControl: true,
      };

      const map = new Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;
      infoWindowRef.current = new InfoWindow();
      setMapLoaded(true);
    }).catch(err => {
      console.error("Google Maps failed to load: ", err);
    });
  }, []);

  // Update BTS sites on map dynamically from DB data
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const { Marker, Size, Point } = window.google.maps;
    const activeSites = btsSites.length > 0 ? btsSites : zteBtsSites.slice(0, 100);
    const currentBtsMarkers = btsMarkersRef.current;

    activeSites.forEach((site) => {
      const siteId = site.site_id || site.id;
      const lat = Number(site.lat || site.latitude);
      const lng = Number(site.lng || site.longitude);
      if (!lat || !lng) return;

      if (!currentBtsMarkers[siteId]) {
        const marker = new Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: `${siteId} - ${site.site_name || site.name || 'Site BTS'}`,
          icon: {
            url: btsSvgIcon(STATUS_COLORS[site.status] || STATUS_COLORS.active),
            scaledSize: new Size(32, 32),
            anchor: new Point(16, 32),
          },
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 6px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 700; color: #00236f;">📡 ${site.site_name || site.name || siteId}</h4>
              <p style="margin: 0; font-size: 11px; color: #64748b;">ID: ${siteId} | Cluster: ${site.city || 'Kalimantan'}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #10b981;">STATUS: ACTIVE</p>
            </div>
          `);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        });

        currentBtsMarkers[siteId] = marker;
      }
    });
  }, [btsSites, mapLoaded]);

  // Update Driver Markers on map dynamically in real-time
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const { Marker, Size, Point } = window.google.maps;
    const currentMarkers = driverMarkersRef.current;
    const activeDriverIds = new Set();

    drivers.forEach((driver, idx) => {
      activeDriverIds.add(driver.id);
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
        currentMarkers[driver.id].setPosition(pos);
      } else {
        const marker = new Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: `🚛 ${driver.full_name} (${driver.vehicle_plate || 'Box Truck'})`,
          icon: {
            url: truckSvgIcon(color),
            scaledSize: new Size(32, 32),
            anchor: new Point(16, 16),
          },
          zIndex: 200,
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 6px;">
              <h4 style="margin: 0; font-weight: 700; color: #00236f;">🚛 ${driver.full_name}</h4>
              <p style="margin: 2px 0; font-size: 11px; color: #475569;">Plat: ${driver.vehicle_plate || 'No Plate'} (${driver.vehicle_type || 'Truck'})</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: ${color};">
                ${driver.is_available ? '⚪ AVAILABLE (IDLE)' : '🟢 ON ROUTE / IN TRANSIT'}
              </p>
            </div>
          `);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        });

        currentMarkers[driver.id] = marker;
      }
    });

    Object.keys(currentMarkers).forEach((id) => {
      if (!activeDriverIds.has(id)) {
        currentMarkers[id].setMap(null);
        delete currentMarkers[id];
      }
    });
  }, [drivers, mapLoaded]);

  return <div ref={mapRef} className="w-full h-full" />;
}
