-- 推荐记录表迁移 (2A)
CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(36) REFERENCES orders(id),
  recommender_id VARCHAR(36) NOT NULL REFERENCES users(id),
  recommender_role VARCHAR(20) NOT NULL,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS recommendations_order_id_idx ON recommendations(order_id);
CREATE INDEX IF NOT EXISTS recommendations_recommender_id_idx ON recommendations(recommender_id);
CREATE INDEX IF NOT EXISTS recommendations_worker_id_idx ON recommendations(worker_id);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);
