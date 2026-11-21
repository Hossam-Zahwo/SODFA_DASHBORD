CREATE SCHEMA IF NOT EXISTS saas;

CREATE TABLE IF NOT EXISTS saas.tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9-]+$'), display_name text NOT NULL, state text NOT NULL DEFAULT 'active' CHECK(state IN ('trial','active','suspended','cancelled')), created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS saas.memberships(tenant_id uuid NOT NULL REFERENCES saas.tenants(id), user_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('owner','admin','manager','operator','viewer')), is_active boolean NOT NULL DEFAULT true, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,user_id));

CREATE TABLE IF NOT EXISTS saas.brands(tenant_id uuid NOT NULL REFERENCES saas.tenants(id), id text NOT NULL, display_name text NOT NULL, PRIMARY KEY(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.channels(tenant_id uuid NOT NULL, id text NOT NULL, brand_id text NOT NULL, display_name text NOT NULL, enabled boolean NOT NULL DEFAULT false, connector_state text NOT NULL DEFAULT 'not_configured' CHECK(connector_state IN ('not_configured','read_only','staging','ready','error')), PRIMARY KEY(tenant_id,id), FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), brand_id text NOT NULL, source_system text, external_id text, sku text, title text NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')), cost_minor bigint CHECK(cost_minor IS NULL OR cost_minor>=0), currency text NOT NULL DEFAULT 'EGP', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id), UNIQUE(tenant_id,source_system,external_id), UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.channel_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, product_id uuid NOT NULL, channel_id text NOT NULL, title_override text, price_minor bigint CHECK(price_minor IS NULL OR price_minor>=0), visibility text NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft','pending_approval','approved','published','hidden','error')), source_revision text, published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id), FOREIGN KEY(tenant_id,channel_id) REFERENCES saas.channels(tenant_id,id), UNIQUE(tenant_id,product_id,channel_id), UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.warehouses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), brand_id text NOT NULL, name text NOT NULL, active boolean NOT NULL DEFAULT true, FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id), UNIQUE(tenant_id,id), UNIQUE(tenant_id,brand_id,name));

CREATE TABLE IF NOT EXISTS saas.inventory_balances(tenant_id uuid NOT NULL, warehouse_id uuid NOT NULL, product_id uuid NOT NULL, on_hand integer NOT NULL DEFAULT 0 CHECK(on_hand>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), CHECK(reserved<=on_hand), PRIMARY KEY(tenant_id,warehouse_id,product_id), FOREIGN KEY(tenant_id,warehouse_id) REFERENCES saas.warehouses(tenant_id,id), FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), brand_id text NOT NULL, display_name text NOT NULL, phone text, email text, notes text, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id), UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), brand_id text NOT NULL, customer_id uuid, channel_id text, source_system text, external_order_id text, status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','preparing','shipped','delivered','cancelled','returned')), currency text NOT NULL DEFAULT 'EGP', shipping_minor bigint NOT NULL DEFAULT 0 CHECK(shipping_minor>=0), discount_minor bigint NOT NULL DEFAULT 0 CHECK(discount_minor>=0), version integer NOT NULL DEFAULT 1, placed_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id), FOREIGN KEY(tenant_id,customer_id) REFERENCES saas.customers(tenant_id,id), FOREIGN KEY(tenant_id,channel_id) REFERENCES saas.channels(tenant_id,id), UNIQUE(tenant_id,source_system,external_order_id), UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.order_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, order_id uuid NOT NULL, product_id uuid, item_name text NOT NULL, quantity integer NOT NULL CHECK(quantity>0), unit_price_minor bigint NOT NULL CHECK(unit_price_minor>=0), FOREIGN KEY(tenant_id,order_id) REFERENCES saas.orders(tenant_id,id), FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, order_id uuid NOT NULL, payment_kind text NOT NULL CHECK(payment_kind IN ('cod','instapay','courier','refund','other')), amount_minor bigint NOT NULL CHECK(amount_minor>=0), direction text NOT NULL CHECK(direction IN ('incoming','outgoing')), reference text, created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(tenant_id,order_id) REFERENCES saas.orders(tenant_id,id), UNIQUE(tenant_id,payment_kind,reference));

CREATE TABLE IF NOT EXISTS saas.expenses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), brand_id text, category text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0), incurred_at timestamptz NOT NULL DEFAULT now(), description text, FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.integration_connections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), system_key text NOT NULL, connection_state text NOT NULL DEFAULT 'not_configured' CHECK(connection_state IN ('not_configured','read_only','staging','ready','error')), last_success_at timestamptz, last_error_at timestamptz, error_code text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,system_key));

CREATE TABLE IF NOT EXISTS saas.outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), destination text NOT NULL, event_type text NOT NULL, aggregate_id uuid NOT NULL, request_key text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed','dead_letter')), attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), retry_after timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,destination,request_key));

CREATE TABLE IF NOT EXISTS saas.audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES saas.tenants(id), actor_id uuid, action text NOT NULL, entity_kind text NOT NULL, entity_id text NOT NULL, previous jsonb, next jsonb, occurred_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS saas.billing_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES saas.tenants(id), plan_key text NOT NULL DEFAULT 'internal', billing_state text NOT NULL DEFAULT 'internal' CHECK(billing_state IN ('internal','trial','active','past_due','cancelled')), period_ends_at timestamptz, customer_reference text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id));

CREATE INDEX IF NOT EXISTS saas_products_tenant_brand_idx ON saas.products(tenant_id,brand_id,status);

CREATE INDEX IF NOT EXISTS saas_orders_tenant_brand_date_idx ON saas.orders(tenant_id,brand_id,placed_at DESC);

CREATE INDEX IF NOT EXISTS saas_audit_tenant_time_idx ON saas.audit_log(tenant_id,occurred_at DESC);

CREATE INDEX IF NOT EXISTS saas_outbox_pending_idx ON saas.outbox(tenant_id,state,retry_after);

CREATE OR REPLACE FUNCTION saas.current_tenant() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.tenant_id', true),'')::uuid $$;

CREATE OR REPLACE FUNCTION saas.current_actor() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.actor_id', true),'')::uuid $$;

CREATE OR REPLACE FUNCTION saas.actor_has_access(tenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$ SELECT EXISTS(SELECT 1 FROM saas.memberships m WHERE m.tenant_id=tenant AND m.user_id=saas.current_actor() AND m.is_active) $$;

INSERT INTO saas.tenants(id,slug,display_name,state) VALUES ('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','sodfa-company','صدفة وهومي','active') ON CONFLICT(slug) DO NOTHING;

INSERT INTO saas.brands(tenant_id,id,display_name) VALUES ('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','homey','هومي'),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','sodfa','صدفة') ON CONFLICT DO NOTHING;

INSERT INTO saas.channels(tenant_id,id,brand_id,display_name,enabled,connector_state) VALUES ('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','homey_web','homey','هومي ويب',false,'read_only'),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','sodfa_web','sodfa','صدفة ويب',false,'error') ON CONFLICT DO NOTHING;

INSERT INTO saas.billing_subscriptions(tenant_id,plan_key,billing_state) VALUES ('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','internal','internal') ON CONFLICT DO NOTHING;

INSERT INTO saas.integration_connections(tenant_id,system_key,connection_state,error_code) VALUES ('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','homey_store','read_only',NULL),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','sodfa_inventory','read_only',NULL),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','orders_manager','staging',NULL),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','sodfa_web','error','SUPABASE_PROJECT_INACTIVE'),('4e23ed6b-8430-475f-8eb4-c9d249e4c0e4','tala','not_configured','LIVE_API_NOT_LINKED') ON CONFLICT DO NOTHING;

INSERT INTO saas.products(tenant_id,brand_id,source_system,external_id,sku,title,status) SELECT '4e23ed6b-8430-475f-8eb4-c9d249e4c0e4'::uuid,brand_id,source_system_id,source_product_id,source_sku,title,'draft' FROM public.product_references WHERE brand_id IN ('homey','sodfa') ON CONFLICT(tenant_id,source_system,external_id) DO NOTHING;

ALTER TABLE saas.memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.brands ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.brands FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.channels ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.channels FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.products FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.channel_listings ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.channel_listings FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.warehouses ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.warehouses FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.inventory_balances ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.inventory_balances FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.customers FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.orders FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.order_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.order_lines FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.expenses FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.integration_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.integration_connections FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.outbox ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.outbox FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE saas.billing_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.billing_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_tenant_isolation ON saas.memberships FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY brands_tenant_isolation ON saas.brands FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY channels_tenant_isolation ON saas.channels FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY products_tenant_isolation ON saas.products FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY channel_listings_tenant_isolation ON saas.channel_listings FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY warehouses_tenant_isolation ON saas.warehouses FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY inventory_balances_tenant_isolation ON saas.inventory_balances FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY customers_tenant_isolation ON saas.customers FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY orders_tenant_isolation ON saas.orders FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY order_lines_tenant_isolation ON saas.order_lines FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY payments_tenant_isolation ON saas.payments FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY expenses_tenant_isolation ON saas.expenses FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY integration_connections_tenant_isolation ON saas.integration_connections FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY outbox_tenant_isolation ON saas.outbox FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY audit_log_tenant_isolation ON saas.audit_log FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

CREATE POLICY billing_subscriptions_tenant_isolation ON saas.billing_subscriptions FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

ALTER TABLE saas.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_member_isolation ON saas.tenants FOR SELECT USING (id=saas.current_tenant() AND saas.actor_has_access(id));
