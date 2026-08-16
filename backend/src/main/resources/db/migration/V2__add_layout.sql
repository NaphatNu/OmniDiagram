ALTER TABLE diagrams  ADD COLUMN layout JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE revisions ADD COLUMN layout JSONB NOT NULL DEFAULT '{}'::jsonb;
