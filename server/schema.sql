CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_records (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    company TEXT NOT NULL,
    card_id TEXT,
    status TEXT NOT NULL DEFAULT 'İçeride',
    entry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_at TIMESTAMPTZ,
    expected_exit TIME,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitor_records_entry_at_idx
    ON visitor_records (entry_at DESC);

CREATE INDEX IF NOT EXISTS visitor_records_status_idx
    ON visitor_records (status);

CREATE INDEX IF NOT EXISTS visitor_records_company_idx
    ON visitor_records (company);
