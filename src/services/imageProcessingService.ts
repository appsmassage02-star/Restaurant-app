/**
 * خدمة معالجة وضغط الصور وتحويلها إلى WebP قبل الرفع
 * متوافقة مع المتصفحات وبيئة WebView / Capacitor بدون أي بدائل Base64 أو Data URL للتخزين.
 */

export const ALLOWED_INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_INPUT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const REJECTED_EXTENSIONS = ['.gif', '.svg', '.bmp', '.ico', '.tiff', '.avif'] as const;

export const TARGET_OUTPUT_MIME_TYPE = 'image/webp' as const;
export const MAX_IMAGE_DIMENSION_PX = 1200;
export const MAX_OUTPUT_SIZE_BYTES = 1_048_576; // 1 MiB exact limit
export const MAX_RAW_INPUT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB safeguard before decoding

export interface CompressedWebPResult {
  blob: Blob;
  fileName: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  originalSizeBytes: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  qualityUsed: number;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface CompressWebPOptions {
  maxDimension?: number;
  maxBytes?: number;
}

/**
 * حساب الأبعاد المستهدفة مع الحفاظ على نسبة العرض إلى الارتفاع دون تكبير الصور الأصغر
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION_PX
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('أبعاد الصورة غير صالحة.');
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * استبدال امتداد اسم الملف ليصبح .webp مع تنظيف الأحرف غير الآمنة
 */
export function buildWebPFileName(originalName: string): string {
  const leafName = (originalName || 'image').split(/[\\/]/).pop() || 'image';
  const baseName = leafName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `${baseName || 'image'}.webp`;
}

/**
 * التحقق المبدئي من صلاحية الملف المختار قبل أي معالجة
 * يقبل فقط JPG / JPEG / PNG / WebP ويرفض GIF / SVG وأي صيغ غير مدعومة.
 */
export function validateImageFileForCompression(file: File | null | undefined): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'لم يتم اختيار أي ملف صورة.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'ملف الصورة المختار فارغ أو تالف.' };
  }

  if (file.size > MAX_RAW_INPUT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'حجم الملف الخام كبير جداً للمعالجة (الحد الأقصى قبل الضغط 25 ميجابايت).',
    };
  }

  const mime = (file.type || '').toLowerCase().trim();
  const lowerName = (file.name || '').toLowerCase().trim();

  if (mime === 'image/gif' || mime === 'image/svg+xml' || lowerName.endsWith('.gif') || lowerName.endsWith('.svg')) {
    return {
      valid: false,
      error: 'ملفات GIF المتحركة وملفات SVG غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط.',
    };
  }

  if (mime) {
    const isAllowedMime = (ALLOWED_INPUT_MIME_TYPES as readonly string[]).includes(mime);
    if (!isAllowedMime) {
      return {
        valid: false,
        error: `صيغة الملف (${mime}) غير مدعومة. الصيغ المقبولة هي: JPG، JPEG، PNG، WebP فقط.`,
      };
    }
    return { valid: true };
  }

  // بعض متصفحات الجوال قد تُرجع file.type فارغاً: نتحقق من الامتداد الصريح
  const hasAllowedExt = ALLOWED_INPUT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasRejectedExt = REJECTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt || hasRejectedExt) {
    return {
      valid: false,
      error: 'صيغة الملف غير مدعومة. يرجى اختيار صورة بامتداد JPG أو JPEG أو PNG أو WebP فقط.',
    };
  }

  return { valid: true };
}

function loadHtmlImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof URL === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('بيئة المتصفح لا تدعم معالجة الصور بالـ Canvas.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة أو فك تشفير ملف الصورة المختار.'));
    };

    img.src = objectUrl;
  });
}

function canvasToWebPBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('تعذر تحويل الصورة إلى صيغة WebP على هذا الجهاز.'));
          return;
        }
        if (blob.type !== TARGET_OUTPUT_MIME_TYPE) {
          reject(
            new Error(
              `المتصفح لا يدعم إنشاء صور بصيغة WebP (أنتج ${blob.type || 'صيغة غير معروفة'}). يرجى تحديث المتصفح والمحاولة مجدداً.`
            )
          );
          return;
        }
        resolve(blob);
      },
      TARGET_OUTPUT_MIME_TYPE,
      quality
    );
  });
}

/**
 * ضغط الصورة وتحويلها حصرياً إلى WebP بأقصى ضلع <= 1200px وحجم <= 1 MiB (1,048,576 بايت)
 */
export async function compressImageToWebP(
  file: File,
  options: CompressWebPOptions = {}
): Promise<CompressedWebPResult> {
  const maxDimension = options.maxDimension ?? MAX_IMAGE_DIMENSION_PX;
  const maxBytes = options.maxBytes ?? MAX_OUTPUT_SIZE_BYTES;

  const validation = validateImageFileForCompression(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'ملف الصورة غير صالح.');
  }

  const img = await loadHtmlImageFromFile(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  if (!originalWidth || !originalHeight) {
    throw new Error('تعذر تحديد أبعاد الصورة المختارة.');
  }

  const baseTarget = calculateTargetDimensions(originalWidth, originalHeight, maxDimension);

  const dimensionScales = [1, 0.85, 0.72, 0.6];
  const qualityStepsByScale: number[][] = [
    [0.86, 0.78, 0.7, 0.62, 0.52, 0.42],
    [0.74, 0.62, 0.5],
    [0.68, 0.55, 0.42],
    [0.6, 0.45],
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر تهيئة سياق الرسم (Canvas 2D) لضغط الصورة.');
  }

  let bestBlob: Blob | null = null;
  let bestWidth = baseTarget.width;
  let bestHeight = baseTarget.height;
  let bestQuality = 0.86;

  try {
    for (let sIdx = 0; sIdx < dimensionScales.length; sIdx++) {
      const scale = dimensionScales[sIdx];
      const targetWidth = Math.max(1, Math.round(baseTarget.width * scale));
      const targetHeight = Math.max(1, Math.round(baseTarget.height * scale));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const qualities = qualityStepsByScale[sIdx];
      for (const quality of qualities) {
        const blob = await canvasToWebPBlob(canvas, quality);
        bestBlob = blob;
        bestWidth = targetWidth;
        bestHeight = targetHeight;
        bestQuality = quality;

        if (blob.size <= maxBytes) {
          return {
            blob,
            fileName: buildWebPFileName(file.name),
            mimeType: TARGET_OUTPUT_MIME_TYPE,
            sizeBytes: blob.size,
            originalSizeBytes: file.size,
            width: targetWidth,
            height: targetHeight,
            originalWidth,
            originalHeight,
            qualityUsed: quality,
          };
        }
      }
    }
  } finally {
    // تحرير ذاكرة Canvas مباشرة بعد المعالجة
    canvas.width = 0;
    canvas.height = 0;
  }

  const finalSizeKb = bestBlob ? Math.round(bestBlob.size / 1024) : 0;
  throw new Error(
    `تعذر ضغط الصورة لتصبح أقل من 1 ميجابايت بصيغة WebP (الحجم الناتج ${finalSizeKb} كيلوبايت). يرجى اختيار صورة أقل دقة أو حجماً.`
  );
}
