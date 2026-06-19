'use client';

import { useState, useEffect, useCallback } from 'react';

// snake_case → camelCase 转换
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = toCamel(value);
    }
    return result;
  }
  return obj;
}

// 通用API获取hook
export function useApi<T>(url: string, options?: { enabled?: boolean }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('miniapp_token') : '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const payload = json.data !== undefined ? json.data : json;
      // 自动转换snake_case为camelCase
      setData(toCamel(payload) as T);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      console.error(`useApi error: ${url}`, msg);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (options?.enabled === false) return;
    fetch_();
  }, [fetch_, options?.enabled]);

  return { data, loading, error, refresh: fetch_, setData };
}

// 通用API修改方法
export async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('miniapp_token') : '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('miniapp_token') : '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// camelCase → snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

function toSnake(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toSnakeCase(key)] = toSnake(value);
    }
    return result;
  }
  return obj;
}

export async function apiPutSnake<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const snakeBody = toSnake(body) as Record<string, unknown>;
  return apiPut<T>(url, snakeBody);
}

export async function apiPostSnake<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const snakeBody = toSnake(body) as Record<string, unknown>;
  return apiPost<T>(url, snakeBody);
}
