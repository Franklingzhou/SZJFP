-- ============================================
-- PostgREST Schema Cache 刷新脚本
-- ============================================
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new
--
-- 作用：让 PostgREST 重新加载 schema cache，
-- 识别通过原始 SQL 创建的表（如 lead_contracts）
-- ============================================

-- 1. 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 2. 如果上面的 NOTIFY 不生效，可以尝试重建表（在 Supabase Table Editor 中）
-- 或者执行以下语句确保表在 public schema 中且 PostgREST 可见：
-- GRANT ALL ON TABLE public.lead_contracts TO anon, authenticated, service_role;

-- 验证表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'lead_contracts';
