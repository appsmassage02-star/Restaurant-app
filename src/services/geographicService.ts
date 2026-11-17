import { supabase, isSupabaseConfigured } from './supabase';
import {
  GeoGovernorate,
  GeoCenter,
  GeoArea,
  GeoBoundaryGeometry,
  RestaurantCategory,
} from '../types/database';

export interface GeoServiceResult<T> {
  data: T[];
  error: string | null;
}

export type BoundaryCheckLevel = 'area' | 'center' | 'governorate';

export interface GeoBoundaryValidationResult {
  valid: boolean;
  hasBoundary: boolean;
  checkedLevel: BoundaryCheckLevel | null;
  levelName: string | null;
  message: string | null;
}

const SOHAG_ARABIC_KEYWORD = 'سوهاج';
const SOHAG_ENGLISH_KEYWORD = 'sohag';

/**
 * التحقق مما إذا كانت المحافظة هي محافظة سوهاج (نطاق الإطلاق الحالي المعتمد)
 */
export function isSohagGovernorate(gov: Pick<GeoGovernorate, 'name_ar' | 'name_en' | 'code'>): boolean {
  const nameAr = (gov.name_ar || '').trim();
  const nameEn = (gov.name_en || '').trim().toLowerCase();
  const code = (gov.code || '').trim().toLowerCase();

  return (
    nameAr.includes(SOHAG_ARABIC_KEYWORD) ||
    nameEn.includes(SOHAG_ENGLISH_KEYWORD) ||
    code === 'shg' ||
    code === 'sohag'
  );
}

/**
 * جلب قائمة المحافظات المعتمدة من الجدول المركزي geo_governorates
 * بنطاق الإطلاق الحالي المعتمد: محافظة سوهاج فقط
 */
export async function fetchGovernorates(): Promise<GeoServiceResult<GeoGovernorate>> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: 'لم يتم ضبط إعدادات الاتصال بقاعدة البيانات (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('geo_governorates')
      .select('id, country_name, name_ar, name_en, code, is_active, sort_order, latitude, longitude, centroid, boundary, boundary_source, boundary_updated_at, source_system, source_code')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching geo_governorates:', error);
      return { data: [], error: `تعذر جلب المحافظات: ${error.message}` };
    }

    const allGovs = (data || []) as GeoGovernorate[];
    // حصر نطاق الإطلاق الحالي في محافظة سوهاج فقط دون إضافة إعدادات لباقي المحافظات
    const launchGovs = allGovs.filter(isSohagGovernorate);

    return { data: launchGovs, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب المحافظات.' };
  }
}

/**
 * جلب المراكز التابعة لمحافظة محددة مباشرة من جدول geo_centers
 * العلاقة المباشرة: geo_centers.governorate_id -> geo_governorates.id
 */
export async function fetchCenters(
  governorateId: string
): Promise<GeoServiceResult<GeoCenter>> {
  if (!isSupabaseConfigured || !governorateId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('geo_centers')
      .select('id, governorate_id, name_ar, name_en, is_active, sort_order, source_code, admin_unit_type, classification_status, source_system, latitude, longitude, centroid, boundary, boundary_source, boundary_updated_at')
      .eq('governorate_id', governorateId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching geo_centers:', error);
      return { data: [], error: `تعذر جلب المراكز: ${error.message}` };
    }

    return { data: (data || []) as GeoCenter[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المراكز التابعة للمحافظة.' };
  }
}

/**
 * جلب المناطق التابعة لمركز محدد مباشرة من جدول geo_areas
 * العلاقة المباشرة فقط: geo_areas.center_id -> geo_centers.id (دون parent_area_id)
 */
export async function fetchAreas(
  centerId: string
): Promise<GeoServiceResult<GeoArea>> {
  if (!isSupabaseConfigured || !centerId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('geo_areas')
      .select('id, governorate_id, center_id, name_ar, name_en, is_active, sort_order, admin_unit_type, classification_status, source_system, source_code, latitude, longitude, centroid, boundary, boundary_source, boundary_updated_at')
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching geo_areas:', error);
      return { data: [], error: `تعذر جلب المناطق: ${error.message}` };
    }

    return { data: (data || []) as GeoArea[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المناطق التابعة للمركز.' };
  }
}

/**
 * جلب التصنيفات المعتمدة للمطاعم من جدول restaurant_categories
 */
export async function fetchRestaurantCategories(): Promise<GeoServiceResult<RestaurantCategory>> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: 'لم يتم ضبط إعدادات الاتصال بقاعدة البيانات (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_categories')
      .select('id, name, image_url, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching restaurant_categories:', error);
      return { data: [], error: `تعذر جلب تصنيفات المطاعم: ${error.message}` };
    }

    return { data: (data || []) as RestaurantCategory[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب تصنيفات المطاعم من قاعدة البيانات.' };
  }
}

/**
 * استخراج إحداثيات العرض الجغرافي لتوسيط الخريطة بصرياً فقط (لا تُحفظ أبداً كإحداثيات للمطعم)
 */
export function extractGeoFocusPoint(
  entity?: { latitude?: number | null; longitude?: number | null; centroid?: any } | null
): { lat: number; lng: number } | null {
  if (!entity) return null;

  if (
    typeof entity.latitude === 'number' &&
    typeof entity.longitude === 'number' &&
    !isNaN(entity.latitude) &&
    !isNaN(entity.longitude)
  ) {
    return { lat: entity.latitude, lng: entity.longitude };
  }

  let centroid = entity.centroid;
  if (typeof centroid === 'string') {
    try {
      centroid = JSON.parse(centroid);
    } catch {
      centroid = null;
    }
  }

  if (centroid && typeof centroid === 'object') {
    if (
      centroid.type === 'Point' &&
      Array.isArray(centroid.coordinates) &&
      centroid.coordinates.length >= 2
    ) {
      const [lng, lat] = centroid.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    if (
      typeof centroid.lat === 'number' &&
      typeof centroid.lng === 'number' &&
      !isNaN(centroid.lat) &&
      !isNaN(centroid.lng)
    ) {
      return { lat: centroid.lat, lng: centroid.lng };
    }
  }

  return null;
}

/**
 * تحليل كائن الحدود (GeoJSON Polygon / MultiPolygon / Feature / FeatureCollection)
 */
function parseBoundaryGeometry(rawBoundary: GeoBoundaryGeometry | string | null | undefined): GeoBoundaryGeometry | null {
  if (!rawBoundary) return null;

  let parsed: any = rawBoundary;
  if (typeof rawBoundary === 'string') {
    const trimmed = rawBoundary.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  if (parsed.type === 'Feature' && parsed.geometry) {
    return parseBoundaryGeometry(parsed.geometry);
  }

  if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
    const polygons: any[] = [];
    for (const feat of parsed.features) {
      const geom = parseBoundaryGeometry(feat?.geometry);
      if (!geom) continue;
      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
        polygons.push(geom.coordinates);
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        polygons.push(...geom.coordinates);
      }
    }
    if (polygons.length === 0) return null;
    return { type: 'MultiPolygon', coordinates: polygons };
  }

  if (
    (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') &&
    Array.isArray(parsed.coordinates) &&
    parsed.coordinates.length > 0
  ) {
    return parsed as GeoBoundaryGeometry;
  }

  return null;
}

/**
 * فحص وجود نقطة على قطعة مستقيمة أو داخل حلقة مضلع باستخدام خوارزمية Ray Casting
 * الإحداثيات في GeoJSON تكون بصيغة [lng, lat]
 */
function isPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  eps = 1e-9
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-18) {
    const distSq = (px - ax) * (px - ax) + (py - ay) * (py - ay);
    return distSq <= eps * eps;
  }
  const cross = (py - ay) * dx - (px - ax) * dy;
  if (Math.abs(cross) > eps) return false;
  const dot = (px - ax) * dx + (py - ay) * dy;
  if (dot < -eps) return false;
  if (dot > lenSq + eps) return false;
  return true;
}

function isPointInRing(lng: number, lat: number, ring: any[]): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ptI = ring[i];
    const ptJ = ring[j];
    if (!Array.isArray(ptI) || !Array.isArray(ptJ) || ptI.length < 2 || ptJ.length < 2) {
      continue;
    }

    const xi = Number(ptI[0]);
    const yi = Number(ptI[1]);
    const xj = Number(ptJ[0]);
    const yj = Number(ptJ[1]);

    if ([xi, yi, xj, yj].some((v) => isNaN(v))) continue;

    if (isPointOnSegment(lng, lat, xi, yi, xj, yj)) {
      return true;
    }

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function isPointInPolygonRings(lng: number, lat: number, rings: any[]): boolean {
  if (!Array.isArray(rings) || rings.length === 0) return false;
  // الحلقة الأولى هي الحدود الخارجية، وما يليها فجوات مستثناة
  if (!isPointInRing(lng, lat, rings[0])) return false;

  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lng, lat, rings[i])) {
      return false;
    }
  }
  return true;
}

export function isPointInsideBoundary(
  lat: number,
  lng: number,
  rawBoundary: GeoBoundaryGeometry | string | null | undefined
): boolean | null {
  const geom = parseBoundaryGeometry(rawBoundary);
  if (!geom || !Array.isArray(geom.coordinates)) return null;

  if (geom.type === 'Polygon') {
    return isPointInPolygonRings(lng, lat, geom.coordinates);
  }

  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (isPointInPolygonRings(lng, lat, poly)) {
        return true;
      }
    }
    return false;
  }

  return null;
}

/**
 * التحقق من مطابقة إحداثيات المطعم مع الحدود الجغرافية (boundary) في جداول geo_*:
 * الأولوية: geo_areas.boundary -> geo_centers.boundary -> geo_governorates.boundary
 * إذا كانت boundary غير متوفرة (null) في جميع المستويات، لا يُرفض التسجيل بسبب غياب الحدود.
 */
export function verifyPointInGeoBoundary(
  lat: number | null,
  lng: number | null,
  hierarchy: {
    area?: GeoArea | null;
    center?: GeoCenter | null;
    governorate?: GeoGovernorate | null;
  }
): GeoBoundaryValidationResult {
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return {
      valid: false,
      hasBoundary: false,
      checkedLevel: null,
      levelName: null,
      message: 'يرجى تحديد إحداثيات الموقع أولاً.',
    };
  }

  const levels: Array<{
    level: BoundaryCheckLevel;
    label: string;
    entity?: { name_ar?: string; boundary?: GeoBoundaryGeometry | string | null } | null;
  }> = [
    { level: 'area', label: 'المنطقة / الحي', entity: hierarchy.area },
    { level: 'center', label: 'المركز / المدينة', entity: hierarchy.center },
    { level: 'governorate', label: 'المحافظة', entity: hierarchy.governorate },
  ];

  for (const item of levels) {
    if (!item.entity?.boundary) continue;

    const inside = isPointInsideBoundary(lat, lng, item.entity.boundary);
    if (inside === null) continue; // غير قابل للتحليل أو فارغ -> انتقل للمستوى الأعلى

    const entityName = item.entity.name_ar || item.label;
    if (inside) {
      return {
        valid: true,
        hasBoundary: true,
        checkedLevel: item.level,
        levelName: entityName,
        message: `تم التحقق: الإحداثيات تقع داخل الحدود الجغرافية المعتمدة لـ (${entityName}).`,
      };
    }

    return {
      valid: false,
      hasBoundary: true,
      checkedLevel: item.level,
      levelName: entityName,
      message: `الإحداثيات المختارة تقع خارج الحدود الجغرافية المعتمدة لـ ${item.label} (${entityName}). يرجى ضبط النقطة على الخريطة أو مراجعة اختيار النطاق الجغرافي.`,
    };
  }

  // غياب boundary في جميع المستويات: لا يُرفض التسجيل
  return {
    valid: true,
    hasBoundary: false,
    checkedLevel: null,
    levelName: null,
    message: null,
  };
}
