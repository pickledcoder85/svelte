CREATE INDEX IF NOT EXISTS idx_ingestion_outputs_reviewed_at
    ON ingestion_outputs (reviewed_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_outputs_pending_review
    ON ingestion_outputs (created_at DESC, id)
    WHERE reviewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL;
