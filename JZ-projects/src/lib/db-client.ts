import { Client } from 'pg';

/**
 * 获取 PostgreSQL 直连客户端（绕过 PostgREST schema cache 问题）
 * 适用于 system_settings / notifications / worker_applications / order_signings 等新建表
 */
export async function getDbClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.PGDATABASE_URL });
  await client.connect();
  return client;
}
