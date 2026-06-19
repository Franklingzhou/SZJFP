-- ============================================================
-- 重新插入8个测试账号（先删除旧数据，再重新插入）
-- ============================================================

-- 先删除现有用户（保留表结构）
DELETE FROM users;

-- 插入8个测试账号
INSERT INTO users (id, name, phone, password_hash, role, review_status, is_active, register_source, reviewed_by, reviewed_at, wechat_openid, credit_score, points, deposit, status, created_at) VALUES
  ('w001', '王秀兰', '13800005678', '$2a$10$dummyhashfordev', 'worker', 'approved', true, 'admin', 'w001', NOW(), 'dev_wx_worker', 1000, 0, '0.00', 'active', NOW()),
  ('a001', '张丽华', '13600001234', '$2a$10$dummyhashfordev', 'agent', 'approved', true, 'admin', 'a001', NOW(), 'dev_wx_agent', 1000, 0, '0.00', 'active', NOW()),
  ('r001', '陈招生', '13500003456', '$2a$10$dummyhashfordev', 'recruiter', 'approved', true, 'admin', 'r001', NOW(), 'dev_wx_recruiter', 1000, 0, '0.00', 'active', NOW()),
  ('i001', '李敏', '13700007890', '$2a$10$dummyhashfordev', 'instructor', 'approved', true, 'admin', 'i001', NOW(), 'dev_wx_instructor', 1000, 0, '0.00', 'active', NOW()),
  ('c001', '刘女士', '13900009876', '$2a$10$dummyhashfordev', 'customer', 'approved', true, 'admin', 'c001', NOW(), 'dev_wx_customer', 1000, 0, '0.00', 'active', NOW()),
  ('admin001', '管理员', '13000000001', '$2a$10$dummyhashfordev', 'admin', 'approved', true, 'admin', 'admin001', NOW(), 'dev_wx_admin', 1000, 0, '0.00', 'active', NOW()),
  ('ts001', '赵主管', '13100001111', '$2a$10$dummyhashfordev', 'training_supervisor', 'approved', true, 'admin', 'ts001', NOW(), 'dev_wx_training_supervisor', 1000, 0, '0.00', 'active', NOW()),
  ('wo001', '周运营', '13200002222', '$2a$10$dummyhashfordev', 'worker_operator', 'approved', true, 'admin', 'wo001', NOW(), 'dev_wx_worker_operator', 1000, 0, '0.00', 'active', NOW());

-- 验证结果
SELECT id, name, phone, role, review_status FROM users ORDER BY role;
