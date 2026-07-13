CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE member_role AS ENUM ('OWNER','ADMIN','MEMBER','VIEWER');
CREATE TYPE task_priority AS ENUM ('HIGH','MEDIUM','LOW');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
  name text NOT NULL, password_hash text NOT NULL, disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role member_role NOT NULL DEFAULT 'MEMBER',
  disabled_at timestamptz, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL, code varchar(8) NOT NULL, description text NOT NULL DEFAULT '', color varchar(16) NOT NULL DEFAULT '#2367d1',
  lead_id uuid REFERENCES users(id), next_task_number integer NOT NULL DEFAULT 1,
  archived_at timestamptz, deleted_at timestamptz, deleted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,code)
);
CREATE TABLE project_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(project_id,user_id)
);
CREATE TABLE board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name text NOT NULL, color varchar(16) NOT NULL,
  position numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id),
  project_id uuid NOT NULL REFERENCES projects(id), column_id uuid NOT NULL REFERENCES board_columns(id), number integer NOT NULL,
  title text NOT NULL, description text NOT NULL DEFAULT '', priority task_priority NOT NULL DEFAULT 'MEDIUM',
  creator_id uuid NOT NULL REFERENCES users(id), start_date date, due_date date, position numeric NOT NULL DEFAULT 1000,
  version integer NOT NULL DEFAULT 1, archived_at timestamptz, deleted_at timestamptz, deleted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,number)
);
CREATE INDEX tasks_workspace_project_idx ON tasks(workspace_id,project_id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_title_trgm_idx ON tasks USING gin(title gin_trgm_ops);
CREATE TABLE task_assignees (workspace_id uuid NOT NULL REFERENCES workspaces(id), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id), PRIMARY KEY(task_id,user_id));
CREATE TABLE labels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id), name text NOT NULL, color varchar(16) NOT NULL DEFAULT '#84908b', UNIQUE(workspace_id,name));
CREATE TABLE task_labels (workspace_id uuid NOT NULL REFERENCES workspaces(id), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, label_id uuid NOT NULL REFERENCES labels(id), PRIMARY KEY(task_id,label_id));
CREATE TABLE checklist_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title text NOT NULL, is_done boolean NOT NULL DEFAULT false, position numeric NOT NULL DEFAULT 1000);
CREATE TABLE comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id), task_id uuid NOT NULL REFERENCES tasks(id), author_id uuid NOT NULL REFERENCES users(id), body text NOT NULL, deleted_at timestamptz, deleted_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE activities (id bigserial PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), task_id uuid REFERENCES tasks(id), actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_logs (id bigserial PRIMARY KEY, workspace_id uuid REFERENCES workspaces(id), actor_id uuid REFERENCES users(id), action text NOT NULL, entity_type text NOT NULL, entity_id text, before_data jsonb, after_data jsonb, ip text, user_agent text, request_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id bigserial PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), title text NOT NULL, is_read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sessions (id char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf_token char(48) NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
