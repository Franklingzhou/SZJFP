'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface WorkerData {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  gender?: string;
  hometown?: string;
  job_type?: string[];
  experience_years?: number;
  education?: string;
  salary_min?: number;
  salary_max?: number;
  availability?: string;
  introduction?: string;
  photo_url?: string;
  id_card_url?: string;
  health_cert_url?: string;
  resume_review_status?: string;
  status?: string;
}

const emptyWorker: WorkerData = {
  id: '', name: '', phone: '', age: 0, gender: '女', hometown: '',
  job_type: [], experience_years: 0, education: '', salary_min: 0, salary_max: 0,
  availability: 'available', introduction: '', resume_review_status: 'pending', status: 'idle',
};

export default function WorkerResumePage() {
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerData>(emptyWorker);
  const [tab, setTab] = useState<'basic' | 'files' | 'history'>('basic');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<WorkerData>(emptyWorker);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorker();
  }, []);

  const loadWorker = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const res = await fetch(`/api/workers?user_id=${userId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        const w = data.data[0];
        setWorker(w);
        setForm(w);
      }
    } catch (e) {
      console.error('[worker-resume] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...form, id: worker.id }),
      });
      const data = await res.json();
      if (data.success) {
        setWorker({ ...worker, ...form, resume_review_status: 'pending' });
        setEditing(false);
        alert('保存成功，简历已提交审核');
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  const handleFileUpload = async (file: File, field: 'photo_url' | 'id_card_url' | 'health_cert_url') => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setForm({ ...form, [field]: data.url });
      } else {
        alert('上传失败');
      }
    } catch {
      alert('上传失败');
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: '待审核', color: 'text-amber-600 bg-amber-50', icon: <Clock className="w-4 h-4" /> },
    approved: { label: '已通过', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { label: '已拒绝', color: 'text-red-600 bg-red-50', icon: <AlertCircle className="w-4 h-4" /> },
  };

  const reviewStatus = worker.resume_review_status || 'pending';
  const sc = statusConfig[reviewStatus] || statusConfig.pending;

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">我的简历</h1>
        <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm', sc.color)}>
          {sc.icon}{sc.label}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
        {(['basic', 'files', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2 text-sm rounded-md transition-colors',
              tab === t ? 'bg-white text-[#1e3a5f] font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            {t === 'basic' ? '基本信息' : t === 'files' ? '照片证件' : '上户记录'}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          {!worker.id ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">您还没有简历，请创建</p>
              <button onClick={() => { setEditing(true); }} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050]">
                创建简历
              </button>
            </div>
          ) : editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-500">姓名</label><input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">性别</label><select value={form.gender || '女'} onChange={e => setForm({...form, gender: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm"><option>女</option><option>男</option></select></div>
                <div><label className="text-xs text-slate-500">年龄</label><input type="number" value={form.age || ''} onChange={e => setForm({...form, age: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">籍贯</label><input value={form.hometown || ''} onChange={e => setForm({...form, hometown: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">工作年限</label><input type="number" value={form.experience_years || ''} onChange={e => setForm({...form, experience_years: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">学历</label><input value={form.education || ''} onChange={e => setForm({...form, education: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">期望薪资（最低）</label><input type="number" value={form.salary_min || ''} onChange={e => setForm({...form, salary_min: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
                <div><label className="text-xs text-slate-500">期望薪资（最高）</label><input type="number" value={form.salary_max || ''} onChange={e => setForm({...form, salary_max: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
              </div>
              <div><label className="text-xs text-slate-500">工种（逗号分隔）</label><input value={(form.job_type || []).join(',')} onChange={e => setForm({...form, job_type: e.target.value.split(',').filter(Boolean)})} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
              <div><label className="text-xs text-slate-500">自我介绍</label><textarea value={form.introduction || ''} onChange={e => setForm({...form, introduction: e.target.value})} rows={4} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050]">保存并提交审核</button>
                <button onClick={() => { setEditing(false); setForm(worker); }} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50">取消</button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">姓名：</span>{worker.name}</div>
                <div><span className="text-slate-500">性别：</span>{worker.gender}</div>
                <div><span className="text-slate-500">年龄：</span>{worker.age || '-'}</div>
                <div><span className="text-slate-500">籍贯：</span>{worker.hometown || '-'}</div>
                <div><span className="text-slate-500">工作年限：</span>{worker.experience_years || 0}年</div>
                <div><span className="text-slate-500">学历：</span>{worker.education || '-'}</div>
                <div><span className="text-slate-500">期望薪资：</span>{worker.salary_min || '?'}-{worker.salary_max || '?'}元</div>
                <div><span className="text-slate-500">工种：</span>{(worker.job_type || []).join('、') || '-'}</div>
              </div>
              {worker.introduction && <div className="mt-3 text-sm"><span className="text-slate-500">自我介绍：</span>{worker.introduction}</div>}
              <div className="pt-2">
                <button onClick={() => setEditing(true)} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050]">编辑简历</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          {(['photo_url', 'id_card_url', 'health_cert_url'] as const).map(field => (
            <div key={field} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="text-sm font-medium">{field === 'photo_url' ? '个人照片' : field === 'id_card_url' ? '身份证' : '健康证'}</div>
                {form[field] && <div className="text-xs text-green-600 mt-1">已上传</div>}
              </div>
              <label className="px-3 py-1.5 bg-slate-100 rounded-md text-sm cursor-pointer hover:bg-slate-200">
                <Upload className="w-4 h-4 inline mr-1" />上传
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, field); }} />
              </label>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">上户记录功能开发中</p>
        </div>
      )}
    </div>
  );
}
