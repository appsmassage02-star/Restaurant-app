// Edge Function: issue-restaurant-image-upload-url
// Target Supabase Project: Talabaty Food Storage (qjmcbaxyutatamzvudqp)
//
// Purpose:
// 1. Validates caller JWT against Primary Supabase Auth (itbfqpjwgjvvybffunkm).
// 2. Verifies caller is owner of an active restaurant (owner_user_id = user.id AND is_active = true).
// 3. Enforces mimeType = "image/webp", fileSize <= 1048576 (1 MiB), valid UUID restaurantId, allowlisted folder.
// 4. Scopes storage object path strictly to: restaurants/{restaurantId}/{folder}/{uuid}.webp
// 5. Issues a short-lived signed upload URL on bucket "restaurant-product-images" using Storage service_role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const BUCKET_NAME = 'restaurant-product-images';
const MAX_FILE_SIZE_BYTES = 1_048_576; // 1 MiB
const ALLOWED_MIME_TYPE = 'image/webp';
const ALLOWED_FOLDERS = new Set(['menu-items', 'offers', 'restaurant-media']);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    // Primary project secrets (for verifying user JWT and restaurant ownership)
    const primaryUrl = Deno.env.get('PRIMARY_SUPABASE_URL')?.trim();
    const primaryServiceRoleKey = Deno.env.get('PRIMARY_SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const primaryAnonKey = Deno.env.get('PRIMARY_SUPABASE_ANON_KEY')?.trim();

    // Storage project secrets (automatically injected as SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY on storage project,
    // or explicitly provided via STORAGE_SUPABASE_URL / STORAGE_SUPABASE_SERVICE_ROLE_KEY)
    const storageUrl =
      Deno.env.get('STORAGE_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim();
    const storageServiceRoleKey =
      Deno.env.get('STORAGE_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!primaryUrl || (!primaryServiceRoleKey && !primaryAnonKey)) {
      return jsonResponse(
        {
          error:
            'Missing Primary Supabase configuration secrets (PRIMARY_SUPABASE_URL and PRIMARY_SUPABASE_SERVICE_ROLE_KEY or PRIMARY_SUPABASE_ANON_KEY).',
        },
        500
      );
    }

    if (!storageUrl || !storageServiceRoleKey) {
      return jsonResponse(
        {
          error:
            'Missing Storage Supabase configuration secrets (STORAGE_SUPABASE_URL and STORAGE_SUPABASE_SERVICE_ROLE_KEY).',
        },
        500
      );
    }

    // 1. Extract Bearer Access Token from primary Supabase session
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch || !tokenMatch[1]) {
      return jsonResponse({ error: 'مطلوب رمز مصادقة صالح (Bearer Token).' }, 401);
    }
    const accessToken = tokenMatch[1].trim();

    // 2. Parse & validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'بيانات الطلب غير صالحة (JSON مطلوب).' }, 400);
    }

    const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId.trim() : '';
    const folder = typeof body.folder === 'string' ? body.folder.trim() : 'menu-items';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize);

    if (!UUID_REGEX.test(restaurantId)) {
      return jsonResponse({ error: 'معرف المطعم (restaurantId) غير صالح.' }, 400);
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return jsonResponse({ error: 'مجلد التخزين المطلوب غير مصرح به.' }, 400);
    }

    if (mimeType !== ALLOWED_MIME_TYPE) {
      return jsonResponse(
        { error: 'يُسمح فقط برفع الصور المضغوطة بصيغة image/webp.' },
        400
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(
        { error: 'حجم الصورة يجب أن يكون بين 1 بايت و 1,048,576 بايت (1 ميجابايت).' },
        400
      );
    }

    // 3. Validate user JWT against Primary Supabase Auth
    const primaryAuthClient = createClient(
      primaryUrl,
      primaryServiceRoleKey || primaryAnonKey!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: userData, error: userError } = await primaryAuthClient.auth.getUser(accessToken);
    if (userError || !userData?.user?.id) {
      return jsonResponse({ error: 'جلسة المستخدم غير صالحة أو منتهية الصلاحية.' }, 401);
    }
    const authenticatedUserId = userData.user.id;

    // 4. Verify active restaurant ownership in Primary DB
    // If service_role key is absent, query as the authenticated user using their Bearer token (respecting RLS).
    const primaryDbClient = primaryServiceRoleKey
      ? primaryAuthClient
      : createClient(primaryUrl, primaryAnonKey!, {
          global: {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

    const { data: restaurantRow, error: restError } = await primaryDbClient
      .from('restaurants')
      .select('id, owner_user_id, is_active')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restError) {
      return jsonResponse(
        { error: `تعذر التحقق من بيانات المطعم في قاعدة البيانات الأساسية: ${restError.message}` },
        500
      );
    }

    if (!restaurantRow) {
      return jsonResponse({ error: 'المطعم المطلوب غير موجود.' }, 404);
    }

    if (restaurantRow.owner_user_id !== authenticatedUserId) {
      return jsonResponse(
        { error: 'غير مصرح لك برفع صور لمطعم لا يتبع حسابك.' },
        403
      );
    }

    if (restaurantRow.is_active !== true) {
      return jsonResponse(
        { error: 'حساب المطعم غير مفعل حالياً؛ لا يُسمح برفع الصور قبل تفعيل المطعم.' },
        403
      );
    }

    // 5. Generate strictly scoped, non-predictable path for this restaurant
    const objectPath = `restaurants/${restaurantId}/${folder}/${crypto.randomUUID()}.webp`;

    // 6. Create temporary signed upload URL in Talabaty Food Storage bucket
    const storageAdminClient = createClient(storageUrl, storageServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signedData, error: signedError } = await storageAdminClient.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(objectPath);

    if (signedError || !signedData?.signedUrl || !signedData?.token) {
      return jsonResponse(
        {
          error: `تعذر إصدار رابط الرفع الآمن من مشروع التخزين: ${
            signedError?.message || 'استجابة غير مكتملة'
          }`,
        },
        500
      );
    }

    const { data: publicData } = storageAdminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectPath);

    return jsonResponse(
      {
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        path: signedData.path || objectPath,
        publicUrl: publicData?.publicUrl || null,
        bucket: BUCKET_NAME,
        allowedMimeType: ALLOWED_MIME_TYPE,
        maxBytes: MAX_FILE_SIZE_BYTES,
      },
      200
    );
  } catch (err) {
    console.error('Unhandled error in issue-restaurant-image-upload-url:', err);
    return jsonResponse({ error: 'حدث خطأ داخلي أثناء إصدار تصريح رفع الصورة.' }, 500);
  }
});
