CREATE TYPE comment_status AS ENUM ('OPEN', 'RESOLVED');

ALTER TABLE comments ADD COLUMN status comment_status NOT NULL DEFAULT 'OPEN';

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  original_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  sha256 char(64) NOT NULL,
  storage_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, sha256)
);
CREATE INDEX assets_workspace_created_idx ON assets(workspace_id, created_at DESC);

CREATE TABLE comment_assets (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  PRIMARY KEY(comment_id, asset_id)
);
CREATE INDEX comment_assets_asset_idx ON comment_assets(asset_id);
