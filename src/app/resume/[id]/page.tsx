'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { WORKER_STATUS_LABELS } from '@/lib/types';
import { Shield, Star, Phone, Clock, Heart, Briefcase, ChevronLeft, Share2, Camera, Play, Loader2, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReviewItem {
  id: string;
  reviewerName: string;
  reviewerRole: string;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
}

interface SharedByUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  roleLabel: string;
}

interface PhotoItem {
  id: string;
  type: string;
  category: string;
  url: string;
  sort_order: number;
}

interface WorkExpItem {
  id: string;
  period: string;
  employer: string;
  jobType: string;
  description: string;
  sortOrder: number;
  contractId?: string;
  source?: string;        // manual | contract
}

interface WorkerData {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  origin: string;
  jobTypes: string[];
  experienceYears: number;
  specialties: string[];
  certifications: string[];
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  status: string;
  availableDate: string;
  creditScore: number;
  deposit: number;
  points: number;
  resume_review_status: string;
  photo: string | null;
  reviews: ReviewItem[];
  avgRating: string;
  reviewCount: number;
  sharedByUser: SharedByUser | null;
  photos: PhotoItem[];
  videos: PhotoItem[];
  workExperience: WorkExpItem[];
}

function PublicResumeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workerId = params.id as string;
  const sharedByPersonId = searchParams.get('sharedBy') || '';

  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 字段可见性配置（从 worker API 响应中读取，后台管理在 system_settings 配置）
  const [expVisibility, setExpVisibility] = useState<Record<string, boolean>>({
    period: true, employer: false, jobType: true, description: true, salary: false,
  });

  // 雇主名称脱敏：张三 → 张先生，李梅 → 李女士
  function maskEmployer(name: string): string {
    if (!name || name.length < 2) return name || '***';
    const surname = name.charAt(0);
    const isFemale = /(女士|梅|芳|娜|丽|婷|玲|燕|霞|娟|敏|萍|蓉)$/.test(name);
    return isFemale ? `${surname}女士` : `${surname}先生`;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const url = `/api/workers/${encodeURIComponent(workerId)}${sharedByPersonId ? `?sharedBy=${encodeURIComponent(sharedByPersonId)}` : ''}`;
        const res = await fetch(url);
        if (res.status === 404) {
          setError('简历未找到');
          return;
        }
        if (!res.ok) {
          setError('加载失败，请稍后重试');
          return;
        }
        const json = await res.json();
        if (!json.data) {
          setError('简历未找到');
          return;
        }
        setWorker(json.data);
        if (json.data.expVisibility) {
          setExpVisibility(json.data.expVisibility);
        }
      } catch {
        setError('网络错误，请检查网络后重试');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workerId, sharedByPersonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-600">{error || '简历未找到'}</p>
          <p className="text-sm text-slate-400 mt-1">该阿姨简历不存在或已被隐藏</p>
        </div>
      </div>
    );
  }

  const sharedByPerson = worker.sharedByUser;

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto">
      {/* 顶部导航 */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => window.history.back()} className="p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">阿姨简历</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
            {worker.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{worker.name}</h1>
            <p className="text-amber-100 text-sm mt-1">{worker.jobTypes.join(' · ')} · {worker.experienceYears}年经验</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                worker.status === 'idle' ? 'bg-green-500/30 text-green-100' : 'bg-blue-500/30 text-blue-100'
              }`}>
                {WORKER_STATUS_LABELS[worker.status as keyof typeof WORKER_STATUS_LABELS] || worker.status}
              </span>
              {worker.availableDate && (
                <span className="text-xs text-amber-100">可上岗：{worker.availableDate}</span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center">
            <Shield className="h-5 w-5 mx-auto text-amber-200" />
            <p className="text-lg font-bold mt-1">{worker.creditScore}</p>
            <p className="text-xs text-amber-200">诚信分</p>
          </div>
          <div className="text-center">
            <Star className="h-5 w-5 mx-auto text-amber-200" />
            <p className="text-lg font-bold mt-1">{worker.avgRating}</p>
            <p className="text-xs text-amber-200">评分</p>
          </div>
          <div className="text-center">
            <Briefcase className="h-5 w-5 mx-auto text-amber-200" />
            <p className="text-lg font-bold mt-1">{worker.reviewCount}</p>
            <p className="text-xs text-amber-200">评价数</p>
          </div>
          <div className="text-center">
            <Clock className="h-5 w-5 mx-auto text-amber-200" />
            <p className="text-lg font-bold mt-1">{worker.experienceYears}</p>
            <p className="text-xs text-amber-200">年经验</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* 介绍视频 */}
        {worker.videos && worker.videos.length > 0 ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Play className="h-4 w-4 text-amber-500" /> 介绍视频
            </h2>
            {worker.videos.map((v) => (
              <div key={v.id} className="bg-slate-100 rounded-lg overflow-hidden mb-2" style={{aspectRatio: '16/9'}}>
                <video src={v.url} controls className="w-full h-full object-cover" preload="metadata">
                  您的浏览器不支持视频播放
                </video>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Play className="h-4 w-4 text-amber-500" /> 介绍视频
            </h2>
            <div className="bg-slate-100 rounded-lg overflow-hidden" style={{aspectRatio: '16/9'}}>
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Play className="h-12 w-12 mb-2" />
                <span className="text-sm">暂无视频介绍</span>
              </div>
            </div>
          </div>
        )}

        {/* 照片展示 */}
        {worker.photos.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-amber-500" /> 照片展示 ({worker.photos.length}张)
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {worker.photos.map((p) => (
                <div key={p.id} className="aspect-square rounded-lg bg-slate-100 overflow-hidden">
                  <img src={p.url} alt={p.category || '照片'} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-amber-500" /> 基本信息
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div><span className="text-slate-400">籍贯：</span>{worker.origin || '未填写'}</div>
            <div><span className="text-slate-400">年龄：</span>{worker.age || '未填写'}岁</div>
            <div><span className="text-slate-400">学历：</span>{worker.certifications.length > 0 ? '高中以上' : '高中'}</div>
            <div><span className="text-slate-400">经验：</span>{worker.experienceYears}年</div>
          </div>
        </div>

        {/* 期望薪资 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-amber-500" /> 期望薪资
          </h2>
          <p className="text-2xl font-bold text-amber-600">{worker.expectedSalaryMin}-{worker.expectedSalaryMax}<span className="text-sm font-normal text-slate-400">元/月</span></p>
        </div>

        {/* 特长 */}
        {worker.specialties.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" /> 特长技能
            </h2>
            <div className="flex flex-wrap gap-2">
              {worker.specialties.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* 证书 */}
        {worker.certifications.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" /> 资格证书
            </h2>
            <div className="flex flex-wrap gap-2">
              {worker.certifications.map((c, i) => (
                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* 自我介绍 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">自我介绍</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {worker.specialties.length > 0 ? worker.specialties.join('、') + '，做事细心，有爱心。' : '踏实肯干，做事细心，有爱心。擅长照顾老人和婴幼儿，做饭口味好，卫生习惯好。'}
          </p>
        </div>

        {/* 上户记录 */}
        {worker.workExperience && worker.workExperience.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-amber-500" /> 上户记录
            </h2>
            <div className="space-y-2">
              {worker.workExperience.map((exp) => (
                <div key={exp.id} className="border-l-2 border-amber-300 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {expVisibility.period && (
                      <Badge className="text-xs bg-amber-50 text-amber-700 border-0">{exp.period}</Badge>
                    )}
                    {expVisibility.jobType && exp.jobType && (
                      <Badge variant="outline" className="text-xs">{exp.jobType}</Badge>
                    )}
                    {expVisibility.employer && exp.employer && (
                      <span className="text-xs text-slate-500">雇主：{maskEmployer(exp.employer)}</span>
                    )}
                  </div>
                  {expVisibility.description && exp.description && (
                    <p className="text-xs text-slate-500">
                      {expVisibility.employer
                        ? exp.description
                        : exp.description.replace(exp.employer ? `雇主${exp.employer}` : '', '').replace(/^，|，$/g, '').replace('，，', '，')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评价 */}
        {worker.reviews.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">客户评价</h2>
            <div className="space-y-3">
              {worker.reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.reviewerName}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3 w-3 ${j < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部联系按钮 */}
        <div className="bg-white rounded-xl p-4 shadow-sm sticky bottom-0">
          {sharedByPerson && (
            <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-medium">
                  {sharedByPerson.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{sharedByPerson.name} · {sharedByPerson.roleLabel}</div>
                  <div className="text-xs text-slate-500">{sharedByPerson.phone}</div>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <a
              href={`tel:${sharedByPerson?.phone || ''}`}
              className={`flex-1 bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium ${!sharedByPerson ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Phone className="h-5 w-5" /> {sharedByPerson ? `联系${sharedByPerson.roleLabel}` : '请通过经纪人联系'}
            </a>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/resume/${worker.id}?sharedBy=${sharedByPersonId || 'direct'}`;
                if (navigator.share) {
                  navigator.share({
                    title: `${worker.name}的家政简历`,
                    text: `${worker.name} - ${worker.jobTypes.join('/')} - ${worker.experienceYears}年经验`,
                    url: shareUrl,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('链接已复制，可粘贴到微信分享');
                  });
                }
              }}
              className="flex-1 bg-slate-800 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium"
            >
              <Share2 className="h-5 w-5" /> 分享简历
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicResumePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400">加载中...</p></div>}>
      <PublicResumeContent />
    </Suspense>
  );
}
