import { supabase, isSupabaseConfigured } from './supabase';
import {
  foodStorageSupabase,
  isFoodStorageConfigured,
  FOOD_STORAGE_BUCKET,
  getFoodStorageConfig,
} from './foodStorageSupabase';
import {
  compressImageToWebP,
  CompressedWebPResult,
  MAX_OUTPUT_SIZE_BYTES,
  TARGET_OUTPUT_MIME_TYPE,
} from './imageProcessingService';

export type RestaurantImageFolder = 'menu-items' | 'offers' | 'restaurant-media';

export interface ImageUploadResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  compressedInfo?: Omit<CompressedWebPResult, 'blob'>;
  error?: string;
}

interface SignedUploadTicketResponse {
  signedUrl: string;
  token: string;
  path: string;
  publicUrl?: string;
  error?: string;
}

/**
 * ضغط الصورة إلى WebP (<= 1200px و <= 1 MiB) ثم طلب رابط رفع موقع مؤقتاً
 * من دالة Edge Function في مشروع الكتالوج المستقل (Talabaty Food Storage)
 * ورفع الملف مباشرة إلى Bucket: restaurant-product-images.
 */
export async function uploadRestaurantImage(
  file: File,
  restaurantId: string,
  folder: RestaurantImageFolder = 'menu-items'
): Promise<ImageUploadResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'إعدادات الاتصال بقاعدة البيانات الأساسية غير مهيأة.' };
  }

  if (!isFoodStorageConfigured) {
    return {
      success: false,
      error: 'إعدادات مشروع التخزين المستقل (VITE_FOOD_STORAGE_URL / VITE_FOOD_STORAGE_ANON_KEY) غير مهيأة.',
    };
  }

  if (!restaurantId || !restaurantId.trim()) {
    return {
      success: false,
      error: 'معرف المطعم غير متوفر؛ لا يمكن طلب تصريح رفع الصورة قبل تحميل بيانات المطعم.',
    };
  }

  // 1. التأكد من وجود جلسة مصادقة نشطة في المشروع الأساسي
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionErr || !accessToken) {
    return {
      success: false,
      error: 'انتهت جلسة تسجيل الدخول أو غير صالحة. يرجى تسجيل الدخول مجدداً قبل رفع الصور.',
    };
  }

  // 2. ضغط الصورة وتحويلها إلى WebP قبل أي طلب للشبكة
  let compressed: CompressedWebPResult;
  try {
    compressed = await compressImageToWebP(file);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'فشل ضغط الصورة وتحويلها إلى WebP.',
    };
  }

  if (
    compressed.blob.type !== TARGET_OUTPUT_MIME_TYPE ||
    compressed.sizeBytes > MAX_OUTPUT_SIZE_BYTES
  ) {
    return {
      success: false,
      error: 'الصورة المعالجة لم تحقق شرط WebP بحد أقصى 1 ميجابايت.',
    };
  }

  // 3. طلب Signed Upload URL من دالة Edge Function في مشروع التخزين المستقل
  const storageConfig = getFoodStorageConfig();
  const edgeFnUrl = `${storageConfig.url}/functions/v1/${storageConfig.edgeFunctionName}`;

  let ticket: SignedUploadTicketResponse;
  try {
    const response = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: storageConfig.anonKey || '',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantId: restaurantId.trim(),
        folder,
        mimeType: compressed.mimeType,
        fileSize: compressed.sizeBytes,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error:
            'دالة إصدار رابط الرفع الآمن (issue-restaurant-image-upload-url) غير منشورة بعد على مشروع Talabaty Food Storage. يرجى نشر Edge Function وضبط أسرارها أولاً.',
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error:
            payload?.error ||
            'غير مصرح برفع الصور لهذا المطعم. تأكد من ملكيتك للمطعم وتفعيل حسابه.',
        };
      }
      return {
        success: false,
        error:
          payload?.error ||
          payload?.message ||
          `رفضت خدمة إصدار رابط الرفع الطلب (رمز ${response.status}).`,
      };
    }

    ticket = payload as SignedUploadTicketResponse;
    if (!ticket?.path || !ticket?.token) {
      return {
        success: false,
        error: 'استجابة خدمة إصدار رابط الرفع غير مكتملة (ينقصها path أو token).',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `تعذر الاتصال بخدمة إصدار رابط الرفع الآمن: ${err?.message || 'خطأ شبكة'}.`,
    };
  }

  // 4. الرفع المباشر إلى Signed URL في Bucket restaurant-product-images بمشروع الكتالوج المستقل
  try {
    const { error: uploadError } = await foodStorageSupabase.storage
      .from(FOOD_STORAGE_BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, compressed.blob, {
        contentType: TARGET_OUTPUT_MIME_TYPE,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `فشل رفع الصورة المضغوطة إلى مشروع التخزين المستقل: ${uploadError.message}`,
      };
    }

    const { data: pubData } = foodStorageSupabase.storage
      .from(FOOD_STORAGE_BUCKET)
      .getPublicUrl(ticket.path);

    const finalPublicUrl = ticket.publicUrl || pubData?.publicUrl;
    if (!finalPublicUrl) {
      return {
        success: false,
        error: 'تم رفع الصورة ولكن تعذر استخراج الرابط العام لها.',
      };
    }

    const { blob: _ignoredBlob, ...compressedMeta } = compressed;
    return {
      success: true,
      publicUrl: finalPublicUrl,
      path: ticket.path,
      compressedInfo: compressedMeta,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `حدث خطأ أثناء رفع الصورة إلى مشروع التخزين المستقل: ${err?.message || 'خطأ غير متوقع'}`,
    };
  }
}
