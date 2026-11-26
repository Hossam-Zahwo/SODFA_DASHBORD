CREATE TABLE IF NOT EXISTS workspace_support_requests (
  id uuid PRIMARY KEY,
  requester_id uuid NOT NULL,
  project text NOT NULL CHECK (project IN ('all', 'homey', 'sodfa', 'sodfa_web', 'orders')),
  section text NOT NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  report jsonb,
  response text CHECK (char_length(response) BETWEEN 10 AND 2000),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS workspace_support_requests_owner_created_idx
  ON workspace_support_requests (requester_id, created_at DESC, id);
GRANT SELECT, INSERT, UPDATE ON workspace_support_requests TO control_center_draft_writer;
