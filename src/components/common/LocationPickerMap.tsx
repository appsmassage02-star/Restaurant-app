import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  governorateName?: string;
  centerName?: string;
  areaName?: string;
}

type GpsStatus = 'idle' | 'locating' | 'success' | 'error';

// Custom Map Marker using HTML/SVG to avoid Vite asset resolution issues with default leaflet PNGs
const createPinIcon = () =>
  L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="transform: translate(-50%, -100%);">
        <div style="background-color: #f59e0b; color: #020617; width: 38px; height: 38px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px -3px rgba(0,0,0,0.4); border: 3px solid #ffffff; transition: transform 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div style="width: 10px; height: 10px; background-color: #0f172a; border-radius: 9999px; margin: 2px auto 0; opacity: 0.5; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
  });

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onChange,
  governorateName,
  centerName,
  areaName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsMessage, setGpsMessage] = useState<string>('');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  // Default coordinate fallback if null: Cairo / Mansoura / Egypt Center
  const currentLat = latitude ?? 30.0444;
  const currentLng = longitude ?? 31.2357;
  const hasCoordinates = latitude !== null && longitude !== null;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: hasCoordinates ? 15 : 6,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap Tiles (Fast, Free, No API Key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Marker setup
      const marker = L.marker([currentLat, currentLng], {
        icon: createPinIcon(),
        draggable: true,
      });

      if (hasCoordinates) {
        marker.addTo(map);
      }

      // Marker drag event
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      // Map click event: moves marker to clicked spot
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
        onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size to ensure tiles render properly after DOM layout
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Sync marker and map when latitude or longitude props change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      if (latitude !== null && longitude !== null) {
        const marker = markerRef.current;
        const map = mapInstanceRef.current;
        marker.setLatLng([latitude, longitude]);
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
      }
    }
  }, [latitude, longitude]);

  // Request real device geolocation via Geolocation API
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('المتصفح الحالي لا يدعم خاصية تحديد الموقع الجغرافي (Geolocation). يمكنك النقر على الخريطة لتحديد الموقع.');
      return;
    }

    setGpsStatus('locating');
    setGpsMessage('جاري طلب إذن الوصول وتحديد إحداثيات الموقع عبر نظام GPS...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        setAccuracyMeters(accuracy);
        setGpsStatus('success');
        setGpsMessage(`تم تحديد موقعك الحالي بدقة تقريبية (±${accuracy} متر).`);

        onChange(lat, lng);

        if (mapInstanceRef.current && markerRef.current) {
          const map = mapInstanceRef.current;
          const marker = markerRef.current;
          marker.setLatLng([lat, lng]);
          if (!map.hasLayer(marker)) {
            marker.addTo(map);
          }
          map.setView([lat, lng], 16, { animate: true });
        }
      },
      (error) => {
        setGpsStatus('error');
        setAccuracyMeters(null);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsMessage(
              'تم رفض إذن الوصول إلى موقعك في المتصفح. يمكنك تفعيل الإذن من إعدادات المتصفح أو تحريك الدبوس على الخريطة يدويًا.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsMessage(
              'معلومات الموقع غير متاحة حاليًا من جهازك. يرجى النقر على الخريطة لاختيار موقع المطعم يدويًا.'
            );
            break;
          case error.TIMEOUT:
            setGpsMessage(
              'استغرق تحديد الموقع وقتًا طويلاً وانتهت المهلة. يرجى المحاولة مجددًا أو النقر على الخريطة.'
            );
            break;
          default:
            setGpsMessage('تعذر تحديد الموقع الجغرافي تلقائيًا. يمكنك اختيار الموقع يدويًا على الخريطة.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, [onChange]);

  // Recenter to current pin
  const handleRecenter = () => {
    if (mapInstanceRef.current && latitude !== null && longitude !== null) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  return (
    <div className="space-y-3">
      {/* GPS Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              تحديد إحداثيات موقع المطعم على الخريطة
            </span>
            <span className="text-[11px] text-slate-500">
              انقر أو اسحب الدبوس لتحديد نقطة وصول المندوب والعملاء بدقة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={gpsStatus === 'locating'}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {gpsStatus === 'locating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>جاري التحديد...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-slate-950" />
                <span>موقعي الحالي (GPS)</span>
              </>
            )}
          </button>

          {hasCoordinates && (
            <button
              type="button"
              onClick={handleRecenter}
              title="توسيط الخريطة على الدبوس"
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* GPS Status Message Feedback */}
      {gpsStatus === 'error' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">تنبيه تحديد الموقع</p>
            <p className="text-[11px] text-rose-700 mt-0.5">{gpsMessage}</p>
          </div>
        </div>
      )}

      {gpsStatus === 'success' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{gpsMessage}</span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs z-0">
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full bg-slate-100"
          style={{ minHeight: '260px' }}
        />

        {/* Map Overlay Badge */}
        <div className="absolute bottom-2.5 right-2.5 z-[400] bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {hasCoordinates
              ? 'تم تحديد النقطة على الخريطة بنجاح'
              : 'انقر على الخريطة أو زر GPS لتحديد النقطة'}
          </span>
        </div>
      </div>

      {/* Geographic Context & Coordinate Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Latitude Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            دائرة العرض (Latitude) *
          </label>
          <input
            type="number"
            step="any"
            required
            value={latitude ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value);
              if (val !== null && !isNaN(val)) {
                onChange(val, longitude ?? 31.2357);
              }
            }}
            placeholder="مثال: 30.0444"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Longitude Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            خط الطول (Longitude) *
          </label>
          <input
            type="number"
            step="any"
            required
            value={longitude ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value);
              if (val !== null && !isNaN(val)) {
                onChange(latitude ?? 30.0444, val);
              }
            }}
            placeholder="مثال: 31.2357"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Region context display */}
        <div className="sm:col-span-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 block">
            النطاق الإداري المحدد:
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">
            {governorateName
              ? `${governorateName}${centerName ? ` - ${centerName}` : ''}${areaName ? ` (${areaName})` : ''}`
              : 'اختر المحافظة والمركز من القائمة'}
          </span>
        </div>
      </div>
    </div>
  );
};
