CREATE UNIQUE INDEX IF NOT EXISTS saas_movements_request_unique ON saas.inventory_movements(tenant_id,reference) WHERE reference IS NOT NULL;

CREATE OR REPLACE FUNCTION saas.apply_inventory_movement(
 p_tenant uuid,p_actor uuid,p_warehouse uuid,p_product uuid,
 p_delta integer,p_reason text,p_request text)
RETURNS TABLE(on_hand integer,reserved integer,version integer,replayed boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=saas,pg_temp AS $$
DECLARE
 v_move uuid;
 v_old_delta integer;
 v_old_warehouse uuid;
 v_old_product uuid;
 v_old_reason text;
 v_stock integer;
 v_reserved integer;
 v_version integer;
BEGIN
 IF p_tenant IS DISTINCT FROM saas.current_tenant() OR
    p_actor IS DISTINCT FROM saas.current_actor() OR
    NOT saas.actor_has_access(p_tenant) THEN
   RAISE EXCEPTION 'TENANT_ACCESS_DENIED' USING ERRCODE='42501';
 END IF;
 IF p_delta=0 OR p_delta IS NULL OR p_request IS NULL OR length(p_request)<8 THEN
   RAISE EXCEPTION 'INVALID_MOVEMENT' USING ERRCODE='22023';
 END IF;
 IF p_reason NOT IN ('receipt','return','count_adjustment','transfer_in','transfer_out','sale') THEN
   RAISE EXCEPTION 'INVALID_MOVEMENT_REASON' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM saas.products p INNER JOIN saas.warehouses w
   ON w.tenant_id=p.tenant_id AND w.brand_id=p.brand_id
  WHERE p.id=p_product AND p.tenant_id=p_tenant AND
   w.id=p_warehouse AND w.tenant_id=p_tenant
 ) THEN RAISE EXCEPTION 'PRODUCT_WAREHOUSE_BRAND_MISMATCH' USING ERRCODE='23503'; END IF;

 SELECT b.on_hand,b.reserved,b.version INTO v_stock,v_reserved,v_version
 FROM saas.inventory_balances b
 WHERE b.tenant_id=p_tenant AND b.warehouse_id=p_warehouse AND b.product_id=p_product FOR UPDATE;
 IF p_delta<0 AND NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_STOCK' USING ERRCODE='23514';
 END IF;
 INSERT INTO saas.inventory_movements
 (tenant_id,warehouse_id,product_id,delta,reason,reference,actor_id)
 VALUES(p_tenant,p_warehouse,p_product,p_delta,p_reason,p_request,p_actor)
 ON CONFLICT(tenant_id,reference) WHERE reference IS NOT NULL DO NOTHING
 RETURNING id INTO v_move;
 IF v_move IS NULL THEN
  SELECT m.delta,m.warehouse_id,m.product_id,m.reason
    INTO v_old_delta,v_old_warehouse,v_old_product,v_old_reason
  FROM saas.inventory_movements m
  WHERE m.tenant_id=p_tenant AND m.reference=p_request LIMIT 1;
  IF v_old_delta IS DISTINCT FROM p_delta OR
     v_old_warehouse IS DISTINCT FROM p_warehouse OR
     v_old_product IS DISTINCT FROM p_product OR
     v_old_reason IS DISTINCT FROM p_reason THEN
    RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_CONFLICT' USING ERRCODE='23505';
  END IF;
  RETURN QUERY SELECT b.on_hand,b.reserved,b.version,true
    FROM saas.inventory_balances b
    WHERE b.tenant_id=p_tenant AND b.warehouse_id=p_warehouse AND b.product_id=p_product;
  RETURN;
 END IF;

 INSERT INTO saas.inventory_balances(tenant_id,warehouse_id,product_id,on_hand,reserved)
 VALUES(p_tenant,p_warehouse,p_product,GREATEST(p_delta,0),0)
 ON CONFLICT(tenant_id,warehouse_id,product_id) DO UPDATE SET
   on_hand=saas.inventory_balances.on_hand+p_delta,
   version=saas.inventory_balances.version+1,updated_at=now()
 WHERE saas.inventory_balances.on_hand+p_delta>=saas.inventory_balances.reserved
 RETURNING saas.inventory_balances.on_hand,saas.inventory_balances.reserved,
   saas.inventory_balances.version INTO v_stock,v_reserved,v_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_STOCK' USING ERRCODE='23514'; END IF;
 INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
 VALUES(p_tenant,p_actor,'inventory_adjustment','product',p_product::text,
  jsonb_build_object('delta',p_delta,'reason',p_reason,'requestKey',p_request));
 RETURN QUERY SELECT v_stock,v_reserved,v_version,false;
END $$;

REVOKE ALL ON FUNCTION saas.apply_inventory_movement(uuid,uuid,uuid,uuid,integer,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION saas.apply_inventory_movement(uuid,uuid,uuid,uuid,integer,text,text) TO saas_runtime_staging;
