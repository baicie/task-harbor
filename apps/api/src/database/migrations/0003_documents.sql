CREATE TYPE document_kind AS ENUM ('ARCHITECTURE','REQUIREMENT','DESIGN','MEETING','RETROSPECTIVE');
CREATE TYPE document_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind document_kind NOT NULL DEFAULT 'DESIGN',
  status document_status NOT NULL DEFAULT 'DRAFT',
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES users(id),
  updated_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_workspace_updated_idx ON documents(workspace_id, updated_at DESC);

CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind document_kind NOT NULL,
  status document_status NOT NULL,
  content text NOT NULL,
  version integer NOT NULL,
  change_note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);
