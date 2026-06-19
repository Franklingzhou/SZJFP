import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    // 测试service_role客户端是否能执行查询
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ 
      success: true, 
      data, 
      message: 'service_role客户端连接正常' 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}