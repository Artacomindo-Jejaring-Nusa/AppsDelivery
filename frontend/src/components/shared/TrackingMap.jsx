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

function truckSvgIcon(color, isOnline = true) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="18" y="23" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white">🚛</text>
      ${isOnline ? '<circle cx="28" cy="8" r="4" fill="#10b981" stroke="white" stroke-width="1.5"/>' : ''}
    </svg>
  `)}`;
}

export default function TrackingMap({ drivers = [], btsSites = [], selectedDO = null, driverLat, driverLng, driverName }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkersRef = useRef({});
  const btsMarkersRef = useRef({});
  const infoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Compute effective driver list
  const effectiveDrivers = React.useMemo(() => {
    if (drivers && drivers.length > 0) return drivers;
    if (driverLat != null && driverLng != null) {
      return [{
        id: 'single_driver',
        full_name: driverName || 'Driver Courier',
        latitude: driverLat,
        longitude: driverLng,
        is_online: true,
        is_available: false,
      }];
    }
    return [];
  }, [drivers, driverLat, driverLng, driverName]);

  useEffect(() => {
    importLibrary('maps').then(({ Map }) => {
      if (!mapRef.current) return;

      const { InfoWindow } = window.google.maps;
      const mapOptions = {
        center: KALIMANTAN_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 5,
        maxZoom: 18,
        restriction: {
          latLngBounds: {
            north: 8.5,
            south: -12.0,
            west: 95.0,
            east: 141.5,
          },
          strictBounds: false,
        },
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
      let lat = Number(site.lat || site.latitude);
      let lng = Number(site.lng || site.longitude);
      if (!lat || !lng) return;

      // Ensure valid Indonesia coordinates
      if (lat > 8.0 || lat < -12.0 || lng < 94.0 || lng > 142.0) {
        return;
      }

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

    effectiveDrivers.forEach((driver, idx) => {
      activeDriverIds.add(driver.id);
      let lat = Number(driver.latitude || driver.current_lat);
      let lng = Number(driver.longitude || driver.current_lng);

      // If coordinate is missing, invalid, or outside Indonesia (e.g. Mountain View 37.4220), normalize to Kalimantan
      if (!lat || !lng || lat > 8.0 || lat < -12.0 || lng < 94.0 || lng > 142.0) {
        const defaultLoc = DRIVER_DEFAULT_LOCATIONS[driver.full_name] || {
          lat: -1.5 + (idx * 0.4),
          lng: 114.5 + (idx * 0.8),
        };
        lat = defaultLoc.lat;
        lng = defaultLoc.lng;
      }

      const isOnline = driver.is_online || Boolean(driver.latitude || driver.current_lat);
      const statusKey = !driver.is_available ? 'on_route' : isOnline ? 'online' : 'idle';
      const color = STATUS_COLORS[statusKey] || STATUS_COLORS.active;
      const pos = { lat: Number(lat), lng: Number(lng) };

      if (currentMarkers[driver.id]) {
        currentMarkers[driver.id].setPosition(pos);
        currentMarkers[driver.id].setIcon({
          url: truckSvgIcon(color, isOnline),
          scaledSize: new Size(36, 36),
          anchor: new Point(18, 18),
        });
      } else {
        const marker = new Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: `🚛 ${driver.full_name} (${driver.vehicle_plate || 'Box Truck'})`,
          icon: {
            url: truckSvgIcon(color, isOnline),
            scaledSize: new Size(36, 36),
            anchor: new Point(18, 18),
          },
          zIndex: 200,
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="font-family: 'Inter', sans-serif; padding: 6px;">
              <h4 style="margin: 0; font-weight: 700; color: #00236f;">🚛 ${driver.full_name}</h4>
              <p style="margin: 2px 0; font-size: 11px; color: #475569;">Plat: ${driver.vehicle_plate || 'No Plate'} (${driver.vehicle_type || 'Truck'})</p>
              <p style="margin: 2px 0; font-size: 11px; color: #64748b; font-family: monospace;">📍 ${lat ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'Kalimantan'}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: ${color};">
                ${!driver.is_available ? '🟢 ON ROUTE / IN TRANSIT' : isOnline ? '🔵 ONLINE (SIAP JALAN)' : '⚪ STANDBY (IDLE)'}
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
  }, [effectiveDrivers, mapLoaded]);

  return <div ref={mapRef} className="w-full h-full" />;
}
