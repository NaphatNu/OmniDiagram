CREATE TABLE diagrams (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('SchemaDiagram', 'GenericDiagram')),
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE revisions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id   UUID NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revisions_diagram_id ON revisions (diagram_id);
