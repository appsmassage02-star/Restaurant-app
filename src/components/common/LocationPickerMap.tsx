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
  XCircle,
} from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
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
        <div style="background-color: #f59e0b; color: #020617; width: 40px; height: 40px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -3px rgba(0,0,0,0.5); border: 3px solid #ffffff; transition: transform 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div style="width: 12px; height: 12px; background-color: #0f172a; border-radius: 9999px; margin: 2px auto 0; opacity: 0.5; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
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

  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // إذا كانت الإحداثيات محددة مسبقًا نتمركز عليها، وإلا نعرض الخريطة بنطاق جغرافي عام دون وضع دبوس ودون اعتبار ذلك موقعًا مختارًا
      const initialCenter: [number, number] = hasCoordinates
        ? [latitude, longitude]
        : [27.0, 30.5]; // نطاق جمهورية مصر العربية العام

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: hasCoordinates ? 16 : 6,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // إنشاء كائن الدبوس (لا يُضاف للخريطة إلا عند وجود إحداثيات حقيقية)
      const marker = L.marker(initialCenter, {
        icon: createPinIcon(),
        draggable: true,
      });

      if (hasCoordinates) {
        marker.addTo(map);
      }

      // حدث سحب الدبوس: حفظ الإحداثيات الفعلية الجديدة بدقة
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));
        onChange(newLat, newLng);
      });

      // حدث النقر على الخريطة: وضع الدبوس على النقطة المحددة وحفظ الإحداثيات
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const clickedLat = Number(lat.toFixed(6));
        const clickedLng = Number(lng.toFixed(6));

        marker.setLatLng([clickedLat, clickedLng]);
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
        onChange(clickedLat, clickedLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // ضبط أبعاد الخريطة بعد التحميل في DOM
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

  // Sync marker when latitude/longitude props change from outside
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const map = mapInstanceRef.current;
      const marker = markerRef.current;

      if (hasCoordinates) {
        marker.setLatLng([latitude, longitude]);
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
      } else {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      }
    }
  }, [latitude, longitude, hasCoordinates]);

  // Request real device geolocation via navigator.geolocation
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(
        'المتصفح أو الجهاز الحالي لا يدعم واجهة تحديد الموقع الجغرافي (Geolocation). يرجى النقر يدويًا على موقع المطعم في الخريطة.'
      );
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
        setGpsMessage(`تم استخراج موقعك الفعلي بدقة تقريبية (±${accuracy} متر).`);

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

        // لا يتم تعيين أي إحداثيات بديلة أو افتراضية عند الفشل
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsMessage(
              'تم رفض إذن الوصول إلى الموقع في المتصفح. يمكنك تفعيل الإذن من إعدادات المتصفح أو النقر على الخريطة لاختيار موقع المطعم يدويًا.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsMessage(
              'تعذر قراءة إشارات GPS أو معلومات الموقع من جهازك حاليًا. يرجى النقر على الخريطة لتحديد الموقع يدويًا.'
            );
            break;
          case error.TIMEOUT:
            setGpsMessage(
              'انتهت مهلة انتظار إشارة GPS دون استجابة. يرجى إعادة المحاولة أو النقر على الخريطة يدويًا.'
            );
            break;
          default:
            setGpsMessage(
              'تعذر تحديد الموقع الجغرافي تلقائيًا. يرجى النقر على موقع المطعم مباشرة على الخريطة.'
            );
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }, [onChange]);

  // Recenter to current pin
  const handleRecenter = () => {
    if (mapInstanceRef.current && hasCoordinates) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  // Clear chosen location
  const handleClearLocation = () => {
    onChange(null, null);
    if (mapInstanceRef.current && markerRef.current) {
      if (mapInstanceRef.current.hasLayer(markerRef.current)) {
        mapInstanceRef.current.removeLayer(markerRef.current);
      }
    }
    setGpsStatus('idle');
    setGpsMessage('');
    setAccuracyMeters(null);
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
              تحديد الموقع الجغرافي الفعلي للمطعم
            </span>
            <span className="text-[11px] text-slate-500">
              استخدم زر GPS أو انقر على الخريطة لتحديد نقطة المطعم الحقيقية
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
                <span>جاري التحديد عبر GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-slate-950" />
                <span>تحديد موقعي الحالي (GPS)</span>
              </>
            )}
          </button>

          {hasCoordinates && (
            <>
              <button
                type="button"
                onClick={handleRecenter}
                title="توسيط الخريطة على الدبوس"
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClearLocation}
                title="إلغاء التحديد وإعادة الاختيار"
                className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* GPS Status Message Feedback */}
      {gpsStatus === 'error' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">تعذر تحديد الموقع تلقائيًا</p>
            <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{gpsMessage}</p>
          </div>
        </div>
      )}

      {gpsStatus === 'success' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{gpsMessage}</span>
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs z-0">
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full bg-slate-100"
          style={{ minHeight: '260px' }}
        />

        {/* Map Status Overlay Badge */}
        <div className="absolute bottom-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 flex items-center gap-2">
          <MapPin className={`w-3.5 h-3.5 ${hasCoordinates ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>
            {hasCoordinates
              ? 'تم تحديد النقطة الفعلية (يمكنك سحب الدبوس لتعديلها)'
              : 'لم يتم تحديد موقع بعد — انقر على موقع المطعم أو اضغط زر GPS'}
          </span>
        </div>
      </div>

      {/* Location Status & Geographic Context (NO MANUAL INPUT FIELDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Actual Coordinates Status */}
        <div className={`p-3 rounded-xl border text-xs flex flex-col justify-center ${
          hasCoordinates
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/60 border-amber-200 text-amber-900'
        }`}>
          <span className="text-[10px] font-bold block mb-1">
            {hasCoordinates ? 'الإحداثيات الحقيقية المختارة:' : 'حالة تحديد الموقع *'}
          </span>
          {hasCoordinates ? (
            <div className="font-mono font-bold text-xs flex items-center gap-2 dir-ltr text-right">
              <span>خط العرض: {latitude.toFixed(6)}</span>
              <span>|</span>
              <span>خط الطول: {longitude.toFixed(6)}</span>
            </div>
          ) : (
            <p className="text-[11px] font-medium text-amber-800">
              مطلوب: لم يتم تحديد موقع المطعم بعد. يرجى الضغط على زر GPS أو النقر على الخريطة.
            </p>
          )}
        </div>

        {/* Administrative Region Context */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center text-xs">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">
            النطاق الإداري المختار:
          </span>
          <span className="font-bold text-slate-800 truncate">
            {governorateName
              ? `${governorateName}${centerName ? ` - ${centerName}` : ''}${areaName ? ` (${areaName})` : ''}`
              : 'اختر المحافظة والمركز من القوائم أعلاه'}
          </span>
        </div>
      </div>
    </div>
  );
};
