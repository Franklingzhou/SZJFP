-- 迁移：2026-06-28 — workers 表新增 certificates JSONB 字段
-- 证书从独立表迁移为简历的一部分

ALTER TABLE workers ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN workers.certificates IS '证书列表 [{id, name, authority, issue_date, expiry_date, image_url, status}]';
