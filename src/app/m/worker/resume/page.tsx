'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { JOB_TYPES } from '@/lib/types';
import type { JobType, WorkExperience } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Share2, Pencil, Check, X, Plus, Trash2, Clock, XCircle, Camera, ImagePlus, Video, Play, Briefcase, ShieldCheck, ChevronDown, ChevronUp, RefreshCw, GraduationCap } from 'lucide-react';

export default function WorkerResumePageWrapper() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-slate-400">加载中...</div>}>
      <WorkerResumePage />
    </Suspense>
  );
}

function WorkerResumePage() {
  const { currentRole } = useMiniApp();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');

  const emptyWorker = {
    id: '', name: '', age: 0, origin: '', phone: '', experienceYears: 0,
    expectedSalaryMin: 0, expectedSalaryMax: 0, availableDate: '',
    jobTypes: [] as JobType[], specialties: [] as string[], certifications: [] as string[],
    status: 'idle', resumeReviewStatus: '',
  };
  const [workerData, setWorkerData] = useState(emptyWorker);
  useEffect(() => {
    async function fetchWorker() {
      const userId = localStorage.getItem('miniapp_userid');
      if (!userId) {
        setWorkerData(emptyWorker);
        return;
      }
      try {
        const token = localStorage.getItem('miniapp_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/workers?user_id=${userId}`, { headers });
        const result = await res.json();
        const apiWorker = result.data?.[0];
        if (apiWorker) {
          const w = {
            id: apiWorker.id,
            name: apiWorker.name || '',
            age: apiWorker.age || 0,
            origin: apiWorker.origin || '',
            phone: apiWorker.phone || '',
            experienceYears: apiWorker.experience_years || 0,
            expectedSalaryMin: apiWorker.expected_salary_min || 0,
            expectedSalaryMax: apiWorker.expected_salary_max || 0,
            availableDate: apiWorker.available_date || '',
            jobTypes: apiWorker.job_types ? apiWorker.job_types.split(',') as JobType[] : [],
            specialties: apiWorker.specialties ? apiWorker.specialties.split(',') : [],
            certifications: apiWorker.certifications ? apiWorker.certifications.split(',') : [],
            status: apiWorker.status || 'idle',
            resumeReviewStatus: apiWorker.resume_review_status || '',
          };
          setWorkerData(w);
          setName(w.name);
          setAge(String(w.age));
          setOrigin(w.origin);
          setPhone(w.phone);
          setExperienceYears(String(w.experienceYears));
          setExpectedSalaryMin(String(w.expectedSalaryMin));
          setExpectedSalaryMax(String(w.expectedSalaryMax));
          setAvailableDate(w.availableDate);
          setSelectedJobTypes(w.jobTypes as JobType[]);
          setSpecialties(w.specialties);
          setCertifications(w.certifications);
          setEditing(true);
        } else {
          setWorkerData(emptyWorker);
        }
      } catch (err) {
        console.error('获取阿姨信息失败:', err);
        setWorkerData(emptyWorker);
      }
    }
    fetchWorker();
  }, [editId]);

  const worker = workerData;

  const [editing, setEditing] = useState(!!editId);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showReviewToast, setShowReviewToast] = useState(false);

  const [name, setName] = useState(worker.name);
  const [age, setAge] = useState(worker.age.toString());
  const [origin, setOrigin] = useState(worker.origin);
  const [phone, setPhone] = useState(worker.phone);
  const [experienceYears, setExperienceYears] = useState(worker.experienceYears.toString());
  const [expectedSalaryMin, setExpectedSalaryMin] = useState(worker.expectedSalaryMin.toString());
  const [expectedSalaryMax, setExpectedSalaryMax] = useState(worker.expectedSalaryMax.toString());
  const [availableDate, setAvailableDate] = useState(worker.availableDate);
  const [selectedJobTypes, setSelectedJobTypes] = useState<JobType[]>(worker.jobTypes);
  const [specialties, setSpecialties] = useState(worker.specialties);
  const [certifications, setCertifications] = useState(worker.certifications);
  const [intro, setIntro] = useState('踏实肯干，做事细心，有爱心。擅长照顾老人和婴幼儿，做饭口味好，卫生习惯好。');

  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCert, setNewCert] = useState('');

  // 图片和视频
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{id: string; url: string; category: string}[]>([
    { id: 'p1', url: '', category: '生活照' },
  ]);
  const [videos, setVideos] = useState<{id: string; url: string; coverUrl: string}[]>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoCategory, setPhotoCategory] = useState('生活照');
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');

  // 征信查询
  const [creditExpanded, setCreditExpanded] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditResult, setCreditResult] = useState<{
    name: string;
    idCard: string;
    queryTime: string;
    remainingCount: number;
    items: { step: number; title: string; status: 'normal' | 'warning'; statusLabel: string; result: string; description: string }[];
  } | null>(null);

  // 工作经验
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    { id: 'exp1', period: '2023.03-2024.01', employer: '张女士家', jobType: '月嫂', description: '照顾新生儿和产妇，做月子餐，婴儿抚触按摩' },
    { id: 'exp2', period: '2022.06-2023.02', employer: '李先生家', jobType: '育儿嫂', description: '照顾1岁宝宝，辅食制作，早教互动' },
  ]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState<Omit<WorkExperience, 'id'>>({ period: '', employer: '', jobType: '保姆', description: '' });

  const toggleJobType = (jt: JobType) => {
    setSelectedJobTypes(prev =>
      prev.includes(jt) ? prev.filter(t => t !== jt) : [...prev, jt]
    );
  };

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setSpecialties(prev => [...prev, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (idx: number) => {
    setSpecialties(prev => prev.filter((_, i) => i !== idx));
  };

  const addCert = () => {
    if (newCert.trim()) {
      setCertifications(prev => [...prev, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (idx: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== idx));
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [requestTrainingLoading, setRequestTrainingLoading] = useState(false);
  const [requestTrainingSent, setRequestTrainingSent] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/resume/${worker.id}` : '';

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleRequestTraining = async () => {
    setRequestTrainingLoading(true);
    try {
      const res = await fetch('/api/workers/' + worker.id + '/request-training', { method: 'POST' });
      if (!res.ok) throw new Error('请求失败');
      // 刷新页面或更新状态
    } catch (_e) {
      // 静默处理
    } finally {
      setRequestTrainingLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const shareToWechat = () => {
    const text = `【阿姨推荐】${name}，${age}岁，${origin}人，${experienceYears}年经验，擅长${specialties.join('、')}，期望薪资${expectedSalaryMin}-${expectedSalaryMax}元/月。查看完整简历：${shareUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!workerData?.id) return;

    // 生成变更摘要
    const changes: string[] = [];
    const fieldLabels: Record<string, string> = {
      name: '姓名', age: '年龄', origin: '籍贯', phone: '电话',
      experience_years: '经验年限', expected_salary_min: '期望薪资(低)', expected_salary_max: '期望薪资(高)',
      available_date: '可上岗日期', job_types: '工种', specialties: '特长', certifications: '证书',
    };
    const oldData: Record<string, unknown> = {
      name: workerData.name, age: workerData.age, origin: workerData.origin, phone: workerData.phone,
      experience_years: workerData.experienceYears, expected_salary_min: workerData.expectedSalaryMin, expected_salary_max: workerData.expectedSalaryMax,
      available_date: workerData.availableDate, job_types: workerData.jobTypes?.join(','), specialties: workerData.specialties?.join(','), certifications: workerData.certifications?.join(','),
    };
    const newData: Record<string, unknown> = {
      name, age: Number(age) || 0, origin, phone,
      experience_years: Number(experienceYears) || 0, expected_salary_min: Number(expectedSalaryMin) || 0, expected_salary_max: Number(expectedSalaryMax) || 0,
      available_date: availableDate || null, job_types: selectedJobTypes.join(','), specialties: specialties.join(','), certifications: certifications.join(','),
    };
    for (const key of Object.keys(fieldLabels)) {
      const oldVal = String(oldData[key] ?? '');
      const newVal = String(newData[key] ?? '');
      if (oldVal !== newVal) {
        changes.push(`${fieldLabels[key]}: "${oldVal}" → "${newVal}"`);
      }
    }

    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/resume-reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          worker_id: workerData.id,
          type: workerData.resumeReviewStatus ? 'update' : 'create',
          review_type: workerData.resumeReviewStatus ? 'update_resume' : 'create_resume',
          old_data: JSON.stringify(oldData),
          new_data: JSON.stringify(newData),
          changes: changes.length > 0 ? changes.join('\n') : '新建简历',
        }),
      });
      const result = await res.json();
      if (!result.success) {
        alert('提交失败：' + (result.error || '请重试'));
        return;
      }

      setEditing(false);
      setShowReviewToast(true);
      setTimeout(() => setShowReviewToast(false), 3000);
    } catch (err) {
      alert('保存失败，请重试');
      console.error('保存简历失败:', err);
    }
  };

  const handleCreditCheck = async () => {
    setCreditLoading(true);
    try {
      const res = await fetch('/api/credit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, idCard: idCardFront || '341125197001012345' }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditResult(data.data);
        setCreditExpanded(true);
      }
    } catch {
      // 模拟查询结果（实际环境接入第三方API）
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setCreditResult({
        name: maskStr(name),
        idCard: '3411251******2345',
        queryTime: now,
        remainingCount: 178,
        items: [
          {
            step: 1,
            title: '身份证验证',
            status: 'normal',
            statusLabel: '信息正常',
            result: '身份证号码与姓名核对一致',
            description: '该数据直连官方身份证中心，覆盖中国13亿人口，实施检查返回结果，保证100%的真实数据！',
          },
          {
            step: 2,
            title: '老赖查询',
            status: 'normal',
            statusLabel: '信息正常',
            result: '该用户信用正常，不是老赖',
            description: '老赖（失信被执行人）是指被人民法院判决并承担责任，但恶意不执行判决的人。该数据来源于中国最高人民法院官方公开数据。',
          },
          {
            step: 3,
            title: '法院被执行人查询',
            status: 'normal',
            statusLabel: '信息正常',
            result: '未见异常',
            description: '法院被执行人：通过法院执行公开信息核实候选人是否有法院核实记录，数据仅供参考，如有疑义，请反馈核实。',
          },
        ],
      });
      setCreditExpanded(true);
    }
    setCreditLoading(false);
  };

  const maskStr = (str: string) => {
    if (str.length <= 1) return str;
    if (str.length === 2) return str[0] + '*';
    return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
  };

  const handleCancel = () => {
    // 重置
    setName(worker.name);
    setAge(worker.age.toString());
    setOrigin(worker.origin);
    setPhone(worker.phone);
    setExperienceYears(worker.experienceYears.toString());
    setExpectedSalaryMin(worker.expectedSalaryMin.toString());
    setExpectedSalaryMax(worker.expectedSalaryMax.toString());
    setAvailableDate(worker.availableDate);
    setSelectedJobTypes(worker.jobTypes as JobType[]);
    setSpecialties(worker.specialties);
    setCertifications(worker.certifications);
    setEditing(false);
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 审核状态提示 */}
      {worker.resumeReviewStatus === 'pending' && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">简历修改已提交，等待平台审核</span>
        </div>
      )}
      {worker.resumeReviewStatus === 'rejected' && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">简历审核未通过，请修改后重新提交</span>
        </div>
      )}
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">我的简历</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100"
              >
                <X className="h-4 w-4" /> 取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white bg-amber-600"
              >
                <Check className="h-4 w-4" /> 保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-amber-700 bg-amber-50"
              >
                <Share2 className="h-4 w-4" /> 分享
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white bg-amber-600"
              >
                <Pencil className="h-4 w-4" /> 编辑
              </button>
            </>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowShareModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">分享简历</h3>
              <XCircle className="h-6 w-6 text-slate-400" onClick={() => setShowShareModal(false)} />
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700">{name[0]}</div>
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{age}岁 · {origin} · {selectedJobTypes.join('、')}</div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <div className="text-xs text-blue-600 mb-1">H5简历链接</div>
              <div className="text-blue-800 break-all text-xs font-mono">{shareUrl}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={copyLink} className="flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium">
                {linkCopied ? '已复制链接' : '复制链接'}
              </button>
              <button onClick={shareToWechat} className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 text-white text-sm font-medium">
                复制推荐语发微信
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">对方打开链接即可查看完整简历H5页面</p>
          </div>
        </div>
      )}

      {showShareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
          推荐语已复制，可粘贴到微信聊天
        </div>
      )}

      {showReviewToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg">
          简历已提交审核，审核通过后将更新展示
        </div>
      )}

      {/* 头像 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">头像</h2>
        <div className="flex items-center gap-4">
          {avatar ? (
            <div className="relative">
              <img src={avatar} alt="头像" className="h-20 w-20 rounded-full object-cover border-2 border-amber-200" />
              {editing && (
                <button onClick={() => setAvatar(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            editing ? (
              <label className="h-20 w-20 rounded-full bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100 transition-colors">
                <Camera className="h-6 w-6 text-amber-400" />
                <span className="text-xs text-amber-500 mt-1">上传头像</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setAvatar(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            ) : (
              <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center text-2xl font-bold text-amber-600">
                {name[0]}
              </div>
            )
          )}
          <div className="text-xs text-slate-400">
            建议上传本人真实生活照<br/>增强客户信任感
          </div>
        </div>
      </div>

      {/* 介绍视频 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">介绍视频</h2>
        {videos.length > 0 ? (
          <div className="space-y-2">
            {videos.map((v, i) => (
              <div key={v.id} className="relative bg-slate-100 rounded-lg overflow-hidden" style={{aspectRatio: '16/9'}}>
                <video src={v.url} className="w-full h-full object-cover" controls playsInline poster={v.coverUrl || undefined} />
                {editing && (
                  <button onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {editing && (
          <label className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors" style={{aspectRatio: '16/9'}}>
            <Video className="h-8 w-8 text-slate-300 mb-2" />
            <span className="text-sm text-slate-400">添加介绍视频</span>
            <span className="text-xs text-slate-300 mt-1">自我介绍、工作展示</span>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setVideos(prev => [...prev, { id: `v-${Date.now()}`, url, coverUrl: '' }]);
              }
            }} />
          </label>
        )}
        {!editing && videos.length === 0 && (
          <p className="text-sm text-slate-400">暂无介绍视频</p>
        )}
      </div>

      {/* 身份证上传 */}
      {editing && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">身份证上传</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">人像面</label>
              {idCardFront ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-[1.6/1]">
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">已上传</div>
                  <button onClick={() => setIdCardFront('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <XCircle className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 aspect-[1.6/1]">
                  <ImagePlus className="h-6 w-6 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400">上传人像面</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files?.[0]) setIdCardFront('uploaded');
                  }} />
                </label>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">国徽面</label>
              {idCardBack ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-[1.6/1]">
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">已上传</div>
                  <button onClick={() => setIdCardBack('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <XCircle className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 aspect-[1.6/1]">
                  <ImagePlus className="h-6 w-6 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400">上传国徽面</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files?.[0]) setIdCardBack('uploaded');
                  }} />
                </label>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">身份证信息仅用于实名认证，不会展示给客户</p>
        </div>
      )}

      {/* 征信查询 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-blue-500" /> 征信查询
          </h2>
          <button
            onClick={() => setCreditExpanded(!creditExpanded)}
            className="text-xs text-slate-400 flex items-center gap-0.5"
          >
            {creditExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {creditExpanded && creditResult && (
          <div className="space-y-3">
            {/* 用户信息 */}
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">{creditResult.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{creditResult.idCard}</p>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">基础版</span>
              </div>
              <p className="text-xs text-slate-400">您还可以免费查询{creditResult.remainingCount}次</p>
              <button
                onClick={handleCreditCheck}
                disabled={creditLoading}
                className="mt-2 w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${creditLoading ? 'animate-spin' : ''}`} />
                {creditLoading ? '查询中...' : '重新查询'}
              </button>
            </div>

            {/* 查询结果 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">普通查询</p>
              {creditResult.items.map((item) => (
                <div key={item.step} className="border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-medium">{item.step}</span>
                      <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{item.title}</span>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{item.statusLabel}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">查询时间：{creditResult.queryTime}</p>
                  <p className="text-sm text-blue-600 font-medium mb-1">{item.result}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!creditResult && creditExpanded && (
          <div className="text-center py-4">
            <ShieldCheck className="h-12 w-12 text-blue-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">点击下方按钮发起征信查询</p>
            <p className="text-xs text-slate-400 mb-3">将验证身份证信息、老赖记录、法院执行记录</p>
            <button
              onClick={handleCreditCheck}
              disabled={creditLoading}
              className="bg-blue-500 text-white rounded-lg px-6 py-2.5 text-sm font-medium flex items-center justify-center gap-1 mx-auto disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${creditLoading ? 'animate-spin' : ''}`} />
              {creditLoading ? '查询中...' : '发起查询'}
            </button>
          </div>
        )}

        {!creditExpanded && creditResult && (
          <p className="text-xs text-slate-400">已查询 · 点击展开查看详情</p>
        )}

        {!creditExpanded && !creditResult && (
          <p className="text-xs text-slate-400">验证身份证信息、老赖记录、法院执行记录</p>
        )}
      </div>

      {/* 照片相册 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500">照片相册</h2>
          {editing && (
            <button onClick={() => setShowPhotoUpload(true)} className="text-xs text-amber-600 flex items-center gap-1">
              <ImagePlus className="h-3.5 w-3.5" /> 添加照片
            </button>
          )}
        </div>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                {p.url ? (
                  <img src={p.url} alt={p.category} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Camera className="h-6 w-6 text-slate-300" />
                    <span className="text-xs text-slate-400 mt-1">{p.category}</span>
                  </div>
                )}
                {editing && (
                  <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                    <X className="h-3 w-3" />
                  </button>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-0.5">{p.category}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">暂无照片</p>
        )}
        {editing && photos.length === 0 && (
          <button onClick={() => setShowPhotoUpload(true)} className="w-full border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
            <ImagePlus className="h-8 w-8 text-slate-300 mb-2" />
            <span className="text-sm text-slate-400">添加照片</span>
            <span className="text-xs text-slate-300 mt-1">生活照、工作照、证书照</span>
          </button>
        )}
      </div>

      {/* 添加照片弹窗 */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowPhotoUpload(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">添加照片</h3>
              <XCircle className="h-6 w-6 text-slate-400" onClick={() => setShowPhotoUpload(false)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">照片分类</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {['生活照', '工作照', '资格证', '体检照片', '保险照片', '月子餐照片', '辅食照片', '厨艺照片', '客户好评'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPhotoCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      photoCategory === cat ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <label className="w-full border-2 border-dashed border-amber-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-colors bg-amber-50/50">
              <ImagePlus className="h-10 w-10 text-amber-400 mb-2" />
              <span className="text-sm text-amber-600">选择照片上传</span>
              <span className="text-xs text-amber-400 mt-1">支持 JPG、PNG 格式</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  const newPhotos = Array.from(files).map((file, idx) => ({
                    id: `p-${Date.now()}-${idx}`,
                    url: URL.createObjectURL(file),
                    category: photoCategory,
                  }));
                  setPhotos(prev => [...prev, ...newPhotos]);
                  setShowPhotoUpload(false);
                }
              }} />
            </label>
          </div>
        </div>
      )}

      {/* 基本信息 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">基本信息</h2>
        <div className="grid grid-cols-2 gap-3">
          {editing ? (
            <>
              <FieldEdit label="姓名" value={name} onChange={setName} />
              <FieldEdit label="年龄" value={age} onChange={setAge} type="number" />
              <FieldEdit label="籍贯" value={origin} onChange={setOrigin} />
              <FieldEdit label="电话" value={phone} onChange={setPhone} />
              <FieldEdit label="经验(年)" value={experienceYears} onChange={setExperienceYears} type="number" />
              <FieldEdit label="可上岗" value={availableDate} onChange={setAvailableDate} type="date" />
            </>
          ) : (
            <>
              <FieldShow label="姓名" value={name} />
              <FieldShow label="年龄" value={`${age}岁`} />
              <FieldShow label="籍贯" value={origin} />
              <FieldShow label="电话" value={phone} />
              <FieldShow label="经验" value={`${experienceYears}年`} />
              <FieldShow label="可上岗" value={availableDate} />
            </>
          )}
        </div>
      </div>

      {/* 工作经验 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 flex items-center gap-1"><Briefcase className="h-4 w-4" /> 工作经验</h2>
          {editing && (
            <button onClick={() => { setExpForm({ period: '', employer: '', jobType: '保姆', description: '' }); setShowExpForm(true); }} className="text-xs text-amber-600 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> 添加经历
            </button>
          )}
        </div>
        {experiences.length > 0 ? (
          <div className="space-y-3">
            {experiences.map((exp, i) => (
              <div key={exp.id} className="border border-slate-100 rounded-lg p-3 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-800">{exp.employer}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">{exp.jobType}</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">{exp.period}</div>
                    <p className="text-sm text-slate-600">{exp.description}</p>
                  </div>
                  {editing && (
                    <button onClick={() => setExperiences(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 ml-2">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">暂无工作经验</p>
        )}
      </div>

      {/* 添加工作经验弹窗 */}
      {showExpForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowExpForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">添加工作经验</h3>
              <XCircle className="h-6 w-6 text-slate-400" onClick={() => setShowExpForm(false)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">雇主/家庭</label>
              <Input value={expForm.employer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpForm({ ...expForm, employer: e.target.value })} placeholder="如：张女士家" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">服务类型</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={expForm.jobType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExpForm({ ...expForm, jobType: e.target.value as JobType })}>
                {JOB_TYPES.map(jt => <option key={jt} value={jt}>{jt}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">工作时间</label>
              <div className="flex items-center gap-2">
                <input type="date" className="border rounded-md px-3 py-2 text-sm flex-1" value={expForm.period.split('-')[0] || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const end = expForm.period.split('-').slice(1).join('-');
                  setExpForm({ ...expForm, period: e.target.value + (end ? '-' + end : '') });
                }} />
                <span className="text-slate-400">至</span>
                <input type="date" className="border rounded-md px-3 py-2 text-sm flex-1" value={expForm.period.split('-').length > 1 ? expForm.period.split('-').slice(1).join('-') : ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const start = expForm.period.split('-')[0] || '';
                  setExpForm({ ...expForm, period: start + '-' + e.target.value });
                }} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">工作内容</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="描述工作内容和职责..." />
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => {
              if (expForm.employer && expForm.period) {
                setExperiences(prev => [...prev, { ...expForm, id: `exp-${Date.now()}` }]);
                setShowExpForm(false);
              }
            }}>添加</Button>
          </div>
        </div>
      )}

      {/* 期望薪资 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">期望薪资</h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={expectedSalaryMin}
              onChange={e => setExpectedSalaryMin(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              value={expectedSalaryMax}
              onChange={e => setExpectedSalaryMax(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-slate-400 text-sm">元/月</span>
          </div>
        ) : (
          <p className="text-lg font-semibold text-amber-600">{expectedSalaryMin}-{expectedSalaryMax} 元/月</p>
        )}
      </div>

      {/* 工种 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">服务类型</h2>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map(jt => (
            <button
              key={jt}
              onClick={() => editing && toggleJobType(jt)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                selectedJobTypes.includes(jt)
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-slate-50 text-slate-400 border border-slate-200'
              } ${editing ? 'cursor-pointer' : ''}`}
            >
              {jt}
            </button>
          ))}
        </div>
      </div>

      {/* 特长 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">特长</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {specialties.map((s, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              {s}
              {editing && (
                <button onClick={() => removeSpecialty(i)} className="text-blue-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSpecialty}
              onChange={e => setNewSpecialty(e.target.value)}
              placeholder="添加特长"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && addSpecialty()}
            />
            <button onClick={addSpecialty} className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 证书 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">资质证书</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {certifications.map((c, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
              {c}
              {editing && (
                <button onClick={() => removeCert(i)} className="text-green-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCert}
              onChange={e => setNewCert(e.target.value)}
              placeholder="添加证书"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && addCert()}
            />
            <button onClick={addCert} className="p-1.5 rounded-lg bg-green-50 text-green-600">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 自我介绍 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">自我介绍</h2>
        {editing ? (
          <textarea
            value={intro}
            onChange={e => setIntro(e.target.value)}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="介绍一下自己..."
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">{intro}</p>
        )}
      </div>

      {/* 状态标签 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">当前状态</span>
          <span className="px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200">
            {worker.status === 'idle' ? '空闲' : worker.status === 'working' ? '在户' : '待定'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">状态可在首页切换</p>
        {/* 再培训入口 */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          {requestTrainingSent ? (
            <p className="text-center text-sm text-green-600 bg-green-50 rounded-lg py-3">
              <GraduationCap className="h-4 w-4 inline mr-1" />再培训申请已提交，招生将跟进处理
            </p>
          ) : (
            <button
              onClick={handleRequestTraining}
              disabled={requestTrainingLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 text-sm font-medium hover:from-amber-100 hover:to-orange-100 disabled:opacity-50"
            >
              <GraduationCap className="h-5 w-5" />
              {requestTrainingLoading ? '提交中...' : '申请再培训'}
            </button>
          )}
          <p className="text-xs text-slate-400 text-center mt-2">需要技能提升？提交后招生老师将联系您</p>
        </div>
      </div>
    </div>
  );
}

function FieldShow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function FieldEdit({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5"
      />
    </div>
  );
}
