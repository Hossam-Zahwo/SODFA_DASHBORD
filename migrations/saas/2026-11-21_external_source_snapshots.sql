CREATE TABLE IF NOT EXISTS saas.external_product_snapshots(tenant_id uuid NOT NULL,product_id uuid NOT NULL,source_status text,available_units integer,min_sale_price_minor bigint,max_sale_price_minor bigint,variant_count integer,sampled_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,product_id),FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.external_order_snapshots(tenant_id uuid NOT NULL REFERENCES saas.tenants(id),source_system text NOT NULL,source_order_id text NOT NULL,brand_id text NOT NULL,status text NOT NULL,source_created_at timestamptz,last_seen_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,source_system,source_order_id),FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id));

ALTER TABLE saas.external_product_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.external_product_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY external_products_scope ON saas.external_product_snapshots FOR ALL USING(tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK(tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

ALTER TABLE saas.external_order_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.external_order_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY external_orders_scope ON saas.external_order_snapshots FOR ALL USING(tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK(tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.external_product_snapshots,saas.external_order_snapshots TO saas_runtime_staging;

INSERT INTO saas.external_product_snapshots(tenant_id,product_id,source_status,available_units,min_sale_price_minor,max_sale_price_minor,variant_count) SELECT p.tenant_id,p.id,s.source_status,s.available_units,(s.min_sale_price_egp*100)::bigint,(s.max_sale_price_egp*100)::bigint,s.variant_count FROM saas.products p INNER JOIN public.product_references pr ON pr.source_system_id=p.source_system AND pr.source_product_id=p.external_id INNER JOIN public.product_source_snapshots s ON s.product_reference_id=pr.id WHERE p.tenant_id='4e23ed6b-8430-475f-8eb4-c9d249e4c0e4'::uuid ON CONFLICT(tenant_id,product_id) DO UPDATE SET source_status=EXCLUDED.source_status,available_units=EXCLUDED.available_units,min_sale_price_minor=EXCLUDED.min_sale_price_minor,max_sale_price_minor=EXCLUDED.max_sale_price_minor,variant_count=EXCLUDED.variant_count,sampled_at=now();
