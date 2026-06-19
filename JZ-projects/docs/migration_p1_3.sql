-- P1-3: Schema补全 - workers表补phone字段
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone text DEFAULT "";
