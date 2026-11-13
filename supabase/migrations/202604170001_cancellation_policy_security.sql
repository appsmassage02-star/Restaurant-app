-- Migration: Enforce route-based and stage-based cancellation decision policy
-- IMPORTANT: Review carefully and apply manually via Supabase Dashboard SQL Editor or Supabase CLI.
-- Target Project: Primary Application Database (itbfqpjwgjvvybffunkm)

BEGIN;

-- 1. Update restaurant_list_pending_cancellations to expose accurate role, route, stage, and decision authority
DROP FUNCTION IF EXISTS public.restaurant_list_pending_cancellations();

CREATE FUNCTION public.restaurant_list_pending_cancellations()
RETURNS TABLE (
  id uuid,
  request_id uuid,
  order_id uuid,
  order_number text,
  customer_name text,
  requested_by uuid,
  requested_by_role text,
  fulfillment_route text,
  order_status text,
  driver_user_id uuid,
  restaurant_phone_confirmed_at timestamptz,
  can_restaurant_decide boolean,
  reason text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := public.is_admin(v_uid);

  RETURN QUERY
  SELECT
    req.id,
    req.id AS request_id,
    req.order_id,
    ro.order_number::text AS order_number,
    ro.customer_name,
    req.requested_by,
    CASE
      WHEN req.requested_by IS NULL THEN 'unknown'
      WHEN req.requested_by = r.owner_user_id THEN 'restaurant'
      WHEN req.requested_by = ro.customer_user_id THEN 'customer'
      WHEN req.requested_by = rdo.driver_user_id THEN 'driver'
      WHEN public.is_admin(req.requested_by) THEN 'admin'
      ELSE 'unknown'
    END AS requested_by_role,
    ro.fulfillment_route,
    ro.status AS order_status,
    rdo.driver_user_id,
    rdo.restaurant_phone_confirmed_at,
    (
      ro.fulfillment_route = 'restaurant_delivery'
      AND req.status = 'pending'
      AND req.requested_by IS NOT NULL
      AND req.requested_by IS DISTINCT FROM r.owner_user_id
      AND ro.status NOT IN ('delivered', 'completed', 'cancelled', 'rejected')
    ) AS can_restaurant_decide,
    req.reason,
    req.status,
    req.created_at
  FROM public.restaurant_order_cancellation_requests req
  INNER JOIN public.restaurant_orders ro
    ON ro.id = req.order_id
  INNER JOIN public.restaurants r
    ON r.id = ro.restaurant_id
  LEFT JOIN public.restaurant_delivery_orders rdo
    ON rdo.order_id = ro.id
  WHERE req.status = 'pending'
    AND (v_is_admin OR r.owner_user_id = v_uid)
  ORDER BY req.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurant_list_pending_cancellations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restaurant_list_pending_cancellations() FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_list_pending_cancellations() TO authenticated;


-- 2. Harden restaurant_decide_cancellation: strictly allow restaurant decisions ONLY on restaurant_delivery
--    and block self-decisions, unknown sources, driver_delivery route, duplicate decisions, and final-stage orders.
CREATE OR REPLACE FUNCTION public.restaurant_decide_cancellation(
  p_request_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_req public.restaurant_order_cancellation_requests%ROWTYPE;
  v_order public.restaurant_orders%ROWTYPE;
  v_restaurant public.restaurants%ROWTYPE;
  v_delivery public.restaurant_delivery_orders%ROWTYPE;
  v_has_delivery boolean := false;
  v_clean_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
  v_note text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لتنفيذ هذا الإجراء.';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الإلغاء غير صالح.';
  END IF;

  v_is_admin := public.is_admin(v_uid);

  SELECT *
  INTO v_req
  FROM public.restaurant_order_cancellation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب الإلغاء غير موجود.';
  END IF;

  SELECT *
  INTO v_order
  FROM public.restaurant_orders
  WHERE id = v_req.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب المرتبط غير موجود.';
  END IF;

  SELECT *
  INTO v_restaurant
  FROM public.restaurants
  WHERE id = v_order.restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'بيانات المطعم غير موجودة.';
  END IF;

  SELECT *
  INTO v_delivery
  FROM public.restaurant_delivery_orders
  WHERE order_id = v_order.id
  FOR UPDATE;
  v_has_delivery := FOUND;

  -- Authorization check: must be restaurant owner or system admin
  IF NOT v_is_admin AND v_restaurant.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'غير مصرح لك بالبت في طلب الإلغاء لهذا المطعم.';
  END IF;

  -- Idempotency check
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'تم البت في طلب الإلغاء مسبقاً ولا يمكن تعديله.';
  END IF;

  -- Final order stage protection
  IF v_order.status IN ('delivered', 'completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'لا يمكن البت في طلب الإلغاء لأن الطلب في حالة نهائية بالفعل (%).', v_order.status;
  END IF;

  -- Strict policy checks for non-admin restaurant owners
  IF NOT v_is_admin THEN
    IF v_order.fulfillment_route IS DISTINCT FROM 'restaurant_delivery' THEN
      RAISE EXCEPTION 'لا يملك المطعم صلاحية البت في طلبات إلغاء مسار دليفري طلباتي (driver_delivery).';
    END IF;

    IF v_req.requested_by IS NULL OR v_req.requested_by = v_restaurant.owner_user_id THEN
      RAISE EXCEPTION 'لا يُسمح للمطعم بالموافقة أو الرفض ذاتياً على طلب إلغاء مرسل من قِبل المطعم أو مجهول المصدر.';
    END IF;
  END IF;

  -- Rejection requires an explicit reason
  IF NOT p_approve AND v_clean_reason IS NULL THEN
    RAISE EXCEPTION 'يرجى إدخال سبب واضح لرفض طلب الإلغاء.';
  END IF;

  IF p_approve THEN
    UPDATE public.restaurant_order_cancellation_requests
    SET
      status = 'approved',
      decided_by = v_uid,
      decided_at = now(),
      decision_reason = v_clean_reason,
      updated_at = now()
    WHERE id = v_req.id;

    UPDATE public.restaurant_orders
    SET
      status = 'cancelled',
      cancellation_reason = COALESCE(NULLIF(BTRIM(v_req.reason), ''), v_clean_reason, 'تم إلغاء الطلب'),
      updated_at = now()
    WHERE id = v_order.id;

    IF v_has_delivery AND v_delivery.status NOT IN ('delivered', 'completed', 'cancelled') THEN
      UPDATE public.restaurant_delivery_orders
      SET
        status = 'cancelled',
        updated_at = now()
      WHERE id = v_delivery.id;
    END IF;

    UPDATE public.restaurant_delivery_dispatch_queue
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE order_id = v_order.id
      AND status NOT IN ('cancelled', 'completed', 'delivered');

    v_note := CASE
      WHEN v_is_admin THEN 'تمت الموافقة على إلغاء الطلب بواسطة الإدارة'
      ELSE 'تمت الموافقة على إلغاء الطلب بواسطة المطعم'
    END;

    INSERT INTO public.restaurant_order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      note
    )
    VALUES (
      v_order.id,
      v_order.status,
      'cancelled',
      v_uid,
      v_note || CASE WHEN COALESCE(NULLIF(BTRIM(v_req.reason), ''), '') <> '' THEN ' — السبب: ' || BTRIM(v_req.reason) ELSE '' END
    );

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_req.id,
      'order_id', v_order.id,
      'decision', 'approved',
      'new_order_status', 'cancelled'
    );
  ELSE
    UPDATE public.restaurant_order_cancellation_requests
    SET
      status = 'rejected',
      decided_by = v_uid,
      decided_at = now(),
      decision_reason = v_clean_reason,
      updated_at = now()
    WHERE id = v_req.id;

    v_note := CASE
      WHEN v_is_admin THEN 'تم رفض طلب الإلغاء بواسطة الإدارة: ' || v_clean_reason
      ELSE 'تم رفض طلب الإلغاء بواسطة المطعم: ' || v_clean_reason
    END;

    INSERT INTO public.restaurant_order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      note
    )
    VALUES (
      v_order.id,
      v_order.status,
      v_order.status,
      v_uid,
      v_note
    );

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_req.id,
      'order_id', v_order.id,
      'decision', 'rejected',
      'new_order_status', v_order.status
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurant_decide_cancellation(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restaurant_decide_cancellation(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_decide_cancellation(uuid, boolean, text) TO authenticated;


-- 3. Driver / Admin cancellation decision RPC for driver_delivery route:
--    Driver can approve/reject ONLY BEFORE restaurant_phone_confirmed_at is set AND BEFORE preparation starts.
--    Admin (is_admin(auth.uid())) can intervene and decide at any non-final stage.
CREATE OR REPLACE FUNCTION public.restaurant_driver_decide_cancellation(
  p_request_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_req public.restaurant_order_cancellation_requests%ROWTYPE;
  v_order public.restaurant_orders%ROWTYPE;
  v_delivery public.restaurant_delivery_orders%ROWTYPE;
  v_clean_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
  v_note text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لتنفيذ هذا الإجراء.';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الإلغاء غير صالح.';
  END IF;

  v_is_admin := public.is_admin(v_uid);

  SELECT *
  INTO v_req
  FROM public.restaurant_order_cancellation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب الإلغاء غير موجود.';
  END IF;

  SELECT *
  INTO v_order
  FROM public.restaurant_orders
  WHERE id = v_req.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب المرتبط غير موجود.';
  END IF;

  SELECT *
  INTO v_delivery
  FROM public.restaurant_delivery_orders
  WHERE order_id = v_order.id
  FOR UPDATE;

  IF NOT FOUND AND NOT v_is_admin THEN
    RAISE EXCEPTION 'لا يوجد سجل توصيل سائق مرتبط بهذا الطلب.';
  END IF;

  -- Idempotency check
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'تم البت في طلب الإلغاء مسبقاً ولا يمكن تعديله.';
  END IF;

  -- Final order stage protection
  IF v_order.status IN ('delivered', 'completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'لا يمكن البت في طلب الإلغاء لأن الطلب في حالة نهائية بالفعل (%).', v_order.status;
  END IF;

  IF NOT v_is_admin THEN
    IF v_order.fulfillment_route IS DISTINCT FROM 'driver_delivery' THEN
      RAISE EXCEPTION 'هذا المسار مخصص لطلبات توصيل السائقين (driver_delivery) فقط.';
    END IF;

    IF v_delivery.driver_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'غير مصرح لك؛ لست السائق المسند إليه هذا الطلب.';
    END IF;

    IF v_req.requested_by IS NULL OR v_req.requested_by = v_uid THEN
      RAISE EXCEPTION 'لا يُسمح للسائق بالبت ذاتياً في طلب إلغاء مقدم منه أو مجهول المصدر.';
    END IF;

    IF v_delivery.restaurant_phone_confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'تم تأكيد الاتصال الهاتفي بالمطعم بالفعل؛ يُمنع السائق من البت في الإلغاء بعد هذه المرحلة ويلزم تدخل الإدارة.';
    END IF;

    IF v_order.status IN ('preparing', 'ready', 'picked_up', 'on_the_way')
       OR v_delivery.status IN ('picked_up', 'on_the_way', 'delivered', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'بدأ تحضير الطلب أو تم استلامه بالفعل؛ يُمنع السائق من البت في الإلغاء بعد بدء التحضير.';
    END IF;
  END IF;

  IF NOT p_approve AND v_clean_reason IS NULL THEN
    RAISE EXCEPTION 'يرجى إدخال سبب واضح لرفض طلب الإلغاء.';
  END IF;

  IF p_approve THEN
    UPDATE public.restaurant_order_cancellation_requests
    SET
      status = 'approved',
      decided_by = v_uid,
      decided_at = now(),
      decision_reason = v_clean_reason,
      updated_at = now()
    WHERE id = v_req.id;

    UPDATE public.restaurant_orders
    SET
      status = 'cancelled',
      cancellation_reason = COALESCE(NULLIF(BTRIM(v_req.reason), ''), v_clean_reason, 'تم إلغاء الطلب'),
      updated_at = now()
    WHERE id = v_order.id;

    IF v_delivery.id IS NOT NULL AND v_delivery.status NOT IN ('delivered', 'completed', 'cancelled') THEN
      UPDATE public.restaurant_delivery_orders
      SET
        status = 'cancelled',
        updated_at = now()
      WHERE id = v_delivery.id;
    END IF;

    UPDATE public.restaurant_delivery_dispatch_queue
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE order_id = v_order.id
      AND status NOT IN ('cancelled', 'completed', 'delivered');

    v_note := CASE
      WHEN v_is_admin THEN 'تمت الموافقة على إلغاء الطلب بواسطة الإدارة'
      ELSE 'تمت الموافقة على إلغاء الطلب بواسطة السائق قبل تأكيد الاتصال الهاتفي وبدء التحضير'
    END;

    INSERT INTO public.restaurant_order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      note
    )
    VALUES (
      v_order.id,
      v_order.status,
      'cancelled',
      v_uid,
      v_note
    );

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_req.id,
      'order_id', v_order.id,
      'decision', 'approved',
      'new_order_status', 'cancelled'
    );
  ELSE
    UPDATE public.restaurant_order_cancellation_requests
    SET
      status = 'rejected',
      decided_by = v_uid,
      decided_at = now(),
      decision_reason = v_clean_reason,
      updated_at = now()
    WHERE id = v_req.id;

    v_note := CASE
      WHEN v_is_admin THEN 'تم رفض طلب الإلغاء بواسطة الإدارة: ' || v_clean_reason
      ELSE 'تم رفض طلب الإلغاء بواسطة السائق: ' || v_clean_reason
    END;

    INSERT INTO public.restaurant_order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      note
    )
    VALUES (
      v_order.id,
      v_order.status,
      v_order.status,
      v_uid,
      v_note
    );

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_req.id,
      'order_id', v_order.id,
      'decision', 'rejected',
      'new_order_status', v_order.status
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.restaurant_driver_decide_cancellation(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restaurant_driver_decide_cancellation(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.restaurant_driver_decide_cancellation(uuid, boolean, text) TO authenticated;

COMMIT;
