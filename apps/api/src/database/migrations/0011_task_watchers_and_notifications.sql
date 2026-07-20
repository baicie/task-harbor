CREATE TABLE task_watchers (
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(task_id,user_id)
);

CREATE INDEX task_watchers_user_idx ON task_watchers(workspace_id,user_id,created_at DESC);

ALTER TABLE notifications
  ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN actor_id uuid REFERENCES users(id),
  ADD COLUMN body text NOT NULL DEFAULT '',
  ADD COLUMN action text NOT NULL DEFAULT 'general';

CREATE INDEX notifications_user_unread_idx ON notifications(user_id,is_read,created_at DESC);
