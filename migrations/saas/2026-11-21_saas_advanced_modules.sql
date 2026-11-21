CREATE TABLE IF NOT EXISTS saas.crm_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),brand_id text NOT NULL,full_name text NOT NULL,phone text,email text,stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','proposal','won','lost')),source text,owner_id uuid,expected_value_minor bigint CHECK(expected_value_minor IS NULL OR expected_value_minor>=0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id),UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.crm_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),lead_id uuid,assigned_to uuid,summary text NOT NULL,priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','in_progress','blocked','done','cancelled')),due_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,lead_id) REFERENCES saas.crm_leads(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.crm_activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),lead_id uuid,customer_id uuid,actor_id uuid,kind text NOT NULL CHECK(kind IN ('call','whatsapp','email','meeting','note','status_change')),summary text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,lead_id) REFERENCES saas.crm_leads(tenant_id,id),FOREIGN KEY(tenant_id,customer_id) REFERENCES saas.customers(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.suppliers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),name text NOT NULL,contact_email text,contact_phone text,country_code char(2),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.purchase_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),brand_id text NOT NULL,supplier_id uuid,state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','approved','ordered','partially_received','received','cancelled')),expected_at date,total_minor bigint NOT NULL DEFAULT 0 CHECK(total_minor>=0),currency text NOT NULL DEFAULT 'EGP',created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id),FOREIGN KEY(tenant_id,supplier_id) REFERENCES saas.suppliers(tenant_id,id),UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.purchase_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,product_id uuid,quantity integer NOT NULL CHECK(quantity>0),unit_cost_minor bigint NOT NULL CHECK(unit_cost_minor>=0),FOREIGN KEY(tenant_id,order_id) REFERENCES saas.purchase_orders(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.inventory_movements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,warehouse_id uuid NOT NULL,product_id uuid NOT NULL,delta integer NOT NULL CHECK(delta<>0),reason text NOT NULL CHECK(reason IN ('receipt','sale','return','transfer_in','transfer_out','count_adjustment','reservation_release')),reference text,actor_id uuid,occurred_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,warehouse_id) REFERENCES saas.warehouses(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES saas.products(tenant_id,id),UNIQUE(tenant_id,warehouse_id,product_id,reference,reason));

CREATE TABLE IF NOT EXISTS saas.returns(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','approved','received','refunded','rejected')),reason text,refund_minor bigint NOT NULL DEFAULT 0 CHECK(refund_minor>=0),created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,order_id) REFERENCES saas.orders(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.shipments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,order_id uuid NOT NULL,carrier text NOT NULL,tracking_code text,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued','submitted','in_transit','delivered','failed','returned')),external_shipment_id text,requested_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,order_id) REFERENCES saas.orders(tenant_id,id),UNIQUE(tenant_id,carrier,external_shipment_id));

CREATE TABLE IF NOT EXISTS saas.account_categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),code text NOT NULL,name text NOT NULL,account_type text NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense')),active boolean NOT NULL DEFAULT true,UNIQUE(tenant_id,code),UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),reference text,description text,entry_date date NOT NULL DEFAULT CURRENT_DATE,state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','posted','reversed')),created_by uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,reference),UNIQUE(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.journal_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,entry_id uuid NOT NULL,account_id uuid NOT NULL,debit_minor bigint NOT NULL DEFAULT 0 CHECK(debit_minor>=0),credit_minor bigint NOT NULL DEFAULT 0 CHECK(credit_minor>=0),memo text,CHECK((debit_minor>0 AND credit_minor=0) OR (credit_minor>0 AND debit_minor=0)),FOREIGN KEY(tenant_id,entry_id) REFERENCES saas.journal_entries(tenant_id,id),FOREIGN KEY(tenant_id,account_id) REFERENCES saas.account_categories(tenant_id,id));

CREATE TABLE IF NOT EXISTS saas.webhook_inbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),provider text NOT NULL,event_id text NOT NULL,event_type text NOT NULL,payload_hash text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz,state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','processed','failed')),UNIQUE(tenant_id,provider,event_id));

CREATE TABLE IF NOT EXISTS saas.plan_quotas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),metric text NOT NULL CHECK(metric IN ('users','products','orders_month','storage_gb','api_requests_month')),limit_value bigint NOT NULL CHECK(limit_value>=0),UNIQUE(tenant_id,metric));

CREATE TABLE IF NOT EXISTS saas.tenant_invitations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES saas.tenants(id),email text NOT NULL,role text NOT NULL CHECK(role IN ('admin','manager','operator','viewer')),token_hash text NOT NULL,expires_at timestamptz NOT NULL,accepted_at timestamptz,invited_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,email,accepted_at));

ALTER TABLE saas.crm_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.crm_leads FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_isolation ON saas.crm_leads FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.crm_leads TO saas_runtime_staging;

ALTER TABLE saas.crm_tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.crm_tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_tasks_isolation ON saas.crm_tasks FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.crm_tasks TO saas_runtime_staging;

ALTER TABLE saas.crm_activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.crm_activities FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_activities_isolation ON saas.crm_activities FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.crm_activities TO saas_runtime_staging;

ALTER TABLE saas.suppliers ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.suppliers FORCE ROW LEVEL SECURITY;

CREATE POLICY suppliers_isolation ON saas.suppliers FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.suppliers TO saas_runtime_staging;

ALTER TABLE saas.purchase_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.purchase_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_isolation ON saas.purchase_orders FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.purchase_orders TO saas_runtime_staging;

ALTER TABLE saas.purchase_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.purchase_lines FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_lines_isolation ON saas.purchase_lines FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.purchase_lines TO saas_runtime_staging;

ALTER TABLE saas.inventory_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.inventory_movements FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_movements_isolation ON saas.inventory_movements FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.inventory_movements TO saas_runtime_staging;

ALTER TABLE saas.returns ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.returns FORCE ROW LEVEL SECURITY;

CREATE POLICY returns_isolation ON saas.returns FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.returns TO saas_runtime_staging;

ALTER TABLE saas.shipments ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.shipments FORCE ROW LEVEL SECURITY;

CREATE POLICY shipments_isolation ON saas.shipments FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.shipments TO saas_runtime_staging;

ALTER TABLE saas.account_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.account_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY account_categories_isolation ON saas.account_categories FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.account_categories TO saas_runtime_staging;

ALTER TABLE saas.journal_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.journal_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY journal_entries_isolation ON saas.journal_entries FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.journal_entries TO saas_runtime_staging;

ALTER TABLE saas.journal_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.journal_lines FORCE ROW LEVEL SECURITY;

CREATE POLICY journal_lines_isolation ON saas.journal_lines FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.journal_lines TO saas_runtime_staging;

ALTER TABLE saas.webhook_inbox ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.webhook_inbox FORCE ROW LEVEL SECURITY;

CREATE POLICY webhook_inbox_isolation ON saas.webhook_inbox FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.webhook_inbox TO saas_runtime_staging;

ALTER TABLE saas.plan_quotas ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.plan_quotas FORCE ROW LEVEL SECURITY;

CREATE POLICY plan_quotas_isolation ON saas.plan_quotas FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.plan_quotas TO saas_runtime_staging;

ALTER TABLE saas.tenant_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.tenant_invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_invitations_isolation ON saas.tenant_invitations FOR ALL USING (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id)) WITH CHECK (tenant_id=saas.current_tenant() AND saas.actor_has_access(tenant_id));

GRANT SELECT ON saas.tenant_invitations TO saas_runtime_staging;

GRANT INSERT ON saas.crm_leads TO saas_runtime_staging;

GRANT INSERT ON saas.crm_tasks TO saas_runtime_staging;

GRANT INSERT ON saas.crm_activities TO saas_runtime_staging;

GRANT INSERT ON saas.suppliers TO saas_runtime_staging;

GRANT INSERT ON saas.purchase_orders TO saas_runtime_staging;

GRANT INSERT ON saas.purchase_lines TO saas_runtime_staging;

GRANT INSERT ON saas.inventory_movements TO saas_runtime_staging;

GRANT INSERT ON saas.returns TO saas_runtime_staging;

GRANT INSERT ON saas.shipments TO saas_runtime_staging;

GRANT INSERT ON saas.journal_entries TO saas_runtime_staging;

GRANT INSERT ON saas.journal_lines TO saas_runtime_staging;

GRANT UPDATE ON saas.crm_leads TO saas_runtime_staging;

GRANT UPDATE ON saas.crm_tasks TO saas_runtime_staging;

GRANT UPDATE ON saas.purchase_orders TO saas_runtime_staging;

GRANT UPDATE ON saas.returns TO saas_runtime_staging;

GRANT UPDATE ON saas.shipments TO saas_runtime_staging;

CREATE INDEX IF NOT EXISTS saas_leads_stage_idx ON saas.crm_leads(tenant_id,brand_id,stage);

CREATE INDEX IF NOT EXISTS saas_tasks_owner_due_idx ON saas.crm_tasks(tenant_id,assigned_to,due_at);

CREATE INDEX IF NOT EXISTS saas_journal_tenant_date_idx ON saas.journal_entries(tenant_id,entry_date);
