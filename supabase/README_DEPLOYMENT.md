# دليل النشر وإعداد الأسرار (يدوياً بعد المراجعة والموافقة)

## 1. تطبيق Migration سياسة إلغاء الطلبات على المشروع الأساسي (`itbfqpjwgjvvybffunkm`)

الملف:
- `supabase/migrations/202604170001_cancellation_policy_security.sql`

خطوات التطبيق:
1. افتح لوحة تحكم Supabase للمشروع الأساسي (`itbfqpjwgjvvybffunkm`) -> **SQL Editor**.
2. انسخ محتوى الملف `supabase/migrations/202604170001_cancellation_policy_security.sql` ونفّذه بعد المراجعة.
3. أو عبر Supabase CLI المرتبط بالمشروع الأساسي:
   ```bash
   supabase db push
   ```

ما يفعله هذا الـ Migration:
- يحدّث `public.restaurant_list_pending_cancellations()` لإرجاع `requested_by_role` الدقيق، و`fulfillment_route`، و`order_status`، و`restaurant_phone_confirmed_at`، و`can_restaurant_decide`.
- يشدّد `public.restaurant_decide_cancellation(p_request_id, p_approve, p_reason)` لمنع البت في مسار `driver_delivery` ومنع الموافقة/الرفض الذاتي على طلبات المطعم ومنع تكرار القرار أو البت في الحالات النهائية وإلزام سبب الرفض.
- يضيف `public.restaurant_driver_decide_cancellation(p_request_id, p_approve, p_reason)` للسماح للسائق المسند إليه بالبت فقط في مسار `driver_delivery` قبل تأكيد الاتصال الهاتفي بالمطعم (`restaurant_phone_confirmed_at IS NULL`) وقبل بدء التحضير (`preparing`)، مع السماح للإدارة (`public.is_admin(auth.uid())`) بالتدخل في أي مرحلة غير نهائية.

---

## 2. نشر Edge Function وإعداد Secrets على مشروع الكتالوج المستقل `Talabaty Food Storage` (`qjmcbaxyutatamzvudqp`)

الدالة:
- `supabase/functions/issue-restaurant-image-upload-url/index.ts`

ملاحظة أمنية:
- لا تضع أي `service_role` key في متغيرات Vite الأمامية (`VITE_*`) أو في الكود المصدري.
- لا تعدّل إعدادات الـ Bucket الحالي (`restaurant-product-images`)؛ فهو مضبوط مسبقاً (`Public = true`, `1 MiB`, `image/webp`).

### خطوات إعداد Secrets على مشروع التخزين (`qjmcbaxyutatamzvudqp`):

```bash
supabase secrets set --project-ref qjmcbaxyutatamzvudqp \
  PRIMARY_SUPABASE_URL="https://itbfqpjwgjvvybffunkm.supabase.co" \
  PRIMARY_SUPABASE_SERVICE_ROLE_KEY="<PRIMARY_PROJECT_SERVICE_ROLE_KEY>" \
  STORAGE_SUPABASE_URL="https://qjmcbaxyutatamzvudqp.supabase.co" \
  STORAGE_SUPABASE_SERVICE_ROLE_KEY="<FOOD_STORAGE_SERVICE_ROLE_KEY>"
```

*(بديل: إذا لم ترغب في وضع `PRIMARY_SUPABASE_SERVICE_ROLE_KEY`، يمكنك تمرير `PRIMARY_SUPABASE_ANON_KEY` بدلاً منه وستتحقق الدالة من `restaurants` باستخدام توكن المستخدم المصادق عليه مع احترام RLS).*

### خطوة نشر الدالة:

```bash
supabase functions deploy issue-restaurant-image-upload-url \
  --project-ref qjmcbaxyutatamzvudqp \
  --no-verify-jwt
```

> **مهم جداً:** يجب تمرير `--no-verify-jwt` عند نشر الدالة على مشروع الكتالوج `qjmcbaxyutatamzvudqp`؛ لأن `Access Token` القادم في ترويسة `Authorization` صادر عن المشروع الأساسي (`itbfqpjwgjvvybffunkm`) وليس عن مشروع التخزين، وتقوم الدالة نفسها بالتحقق الصارم من التوكن عبر `PRIMARY_SUPABASE_URL` قبل إصدار رابط الرفع الموقع.
