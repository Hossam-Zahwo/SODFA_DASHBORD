-- Correct the membership policy to avoid recursive access checks.
-- Membership assignments are made only by a separately audited admin workflow.
ALTER POLICY memberships_tenant_isolation ON saas.memberships
  USING (tenant_id=saas.current_tenant() AND user_id=saas.current_actor())
  WITH CHECK (false);
