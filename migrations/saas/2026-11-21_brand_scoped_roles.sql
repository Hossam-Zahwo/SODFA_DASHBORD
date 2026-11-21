CREATE TABLE IF NOT EXISTS saas.brand_access(tenant_id uuid NOT NULL,user_id uuid NOT NULL,brand_id text NOT NULL,role text NOT NULL CHECK(role IN ('viewer','operator','manager')),granted_by uuid NOT NULL,granted_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,user_id,brand_id),FOREIGN KEY(tenant_id,user_id) REFERENCES saas.memberships(tenant_id,user_id),FOREIGN KEY(tenant_id,brand_id) REFERENCES saas.brands(tenant_id,id));

ALTER TABLE saas.brand_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE saas.brand_access FORCE ROW LEVEL SECURITY;

CREATE POLICY brand_access_self ON saas.brand_access FOR SELECT USING (tenant_id=saas.current_tenant() AND user_id=saas.current_actor());

GRANT SELECT ON saas.brand_access TO saas_runtime_staging;
