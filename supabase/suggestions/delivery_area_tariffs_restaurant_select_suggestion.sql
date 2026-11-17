-- ============================================================================
-- اقتراح SQL اختياري (غير منفذ تلقائياً — للمراجعة فقط من مسؤول قاعدة البيانات)
-- الغرض: السماح لصاحب المطعم المصادق عليه بقراءة تسعيرات مطعمه فقط من جدول
--       public.delivery_area_tariffs (للقراءة فقط في صفحة الإعدادات)
-- ============================================================================

-- 1. التأكد من تفعيل RLS ومنح صلاحية SELECT فقط لدور authenticated:
-- GRANT SELECT ON TABLE public.delivery_area_tariffs TO authenticated;

-- 2. سياسة قراءة مقيدة بتسعيرات توصيل المطعم الخاص بالمالك الحالي فقط:
/*
CREATE POLICY "restaurant_owner_read_own_central_tariffs"
  ON public.delivery_area_tariffs
  FOR SELECT
  TO authenticated
  USING (
    service_type = 'ready_food'
    AND delivery_owner = 'restaurant'
    AND restaurant_id IN (
      SELECT r.id
      FROM public.restaurants r
      WHERE r.owner_user_id = auth.uid()
    )
  );
*/
