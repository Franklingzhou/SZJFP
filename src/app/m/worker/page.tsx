'use client';

import React, { useState } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockOrders } from '@/lib/data-service';
import { cn, formatCurrency } from '@/lib/utils';
import { WORKER_STATUS_LABELS, type WorkerStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Star, Shield, User, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { updateRecord } from '@/lib/data-service';

export default function WorkerHomePage() {
  const { userName, userId } = useMiniApp();
  const worker = mockWorkers.find(w => w.id === userId) || mockWorkers[0];
  const availableJobs = mockOrders.filter((o) => o.status === 'created');
  const completedOrders = mockOrders.filter((o) => o.status === 'completed' && o.workerId === worker.id);

  const [status, setStatus] = useState<WorkerStatus>(worker.status);
  const [acceptedJobs, setAcceptedJobs] = useState<Set<string>>(new Set());
  const [showAcceptConfirm, setShowAcceptConfirm] = useState<string | null>(null);
  const [showAcceptSuccess, setShowAcceptSuccess] = useState(false);

  const handleAcceptJob = async (orderId: string) => {
    await updateRecord('orders', { id: orderId, status: 'confirmed', worker_id: worker.id });
    setAcceptedJobs(prev => new Set(prev).add(orderId));
    setShowAcceptConfirm(null);
    setShowAcceptSuccess(true);
    setTimeout(() => setShowAcceptSuccess(false), 2000);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 接单成功提示 */}
      {showAcceptSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-1.5 animate-pulse">
          <CheckCircle className="h-4 w-4" /> 接单成功！
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {worker.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{worker.name}</span>
              <Badge className="bg-white/20 text-white hover:bg-white/20 text-xs">
                {WORKER_STATUS_LABELS[status]}
              </Badge>
            </div>
            <p className="text-amber-100 text-sm mt-1">
              {worker.jobTypes.join(' · ')} · {worker.experienceYears}年经验
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <QuickStat icon={Shield} label="诚信分" value={worker.creditScore} color="text-green-600" />
        <QuickStat icon={Star} label="积分" value={worker.points} color="text-amber-600" />
        <QuickStat icon={Briefcase} label="完成单" value={completedOrders.length} color="text-blue-600" />
        <QuickStat icon={User} label="好评" value={worker.reviews.filter(r => r.rating >= 4).length} color="text-pink-600" />
      </div>

      {/* Status Toggle */}
      <div className="bg-white rounded-xl p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">上岗状态</h3>
            <p className="text-xs text-muted-foreground mt-0.5">切换状态影响接单大厅可见性</p>
          </div>
          <div className="flex gap-2">
            {(['idle', 'working', 'paused'] as WorkerStatus[]).map((s) => (
              <button
                key={s}
                onClick={async () => { setStatus(s); await updateRecord('workers', { id: worker.id, status: s }); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  status === s
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                {WORKER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs - 接单大厅 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">接单大厅</h3>
          <span className="text-xs text-amber-600">{availableJobs.length} 个可接订单</span>
        </div>
        {availableJobs.map((order) => {
          const isAccepted = acceptedJobs.has(order.id);
          return (
            <div key={order.id} className="px-4 py-3 border-b last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <span className="font-medium text-sm">{order.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{order.jobType}</Badge>
                    <span className="text-xs text-muted-foreground">{order.location}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{order.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-amber-600">
                    {formatCurrency(order.salaryMin)}-{formatCurrency(order.salaryMax)}
                  </span>
                  <div className="mt-1">
                    {isAccepted ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> 已接单
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowAcceptConfirm(order.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                      >
                        接单
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {availableJobs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无可接订单</div>
        )}
      </div>

      {/* 接单确认弹窗 */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-center mb-2">确认接单？</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              接单后经纪人会收到通知，请保持电话畅通
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptConfirm(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
              >
                取消
              </button>
              <button
                onClick={() => handleAcceptJob(showAcceptConfirm)}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium"
              >
                确认接单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 我的课程 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">我的课程</h3>
          <span className="text-xs text-amber-600">{worker.trainingRecords.length} 门课程</span>
        </div>
        {worker.trainingRecords.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">暂无培训课程</div>
        ) : (
          worker.trainingRecords.map((record) => (
            <div key={record.id} className="px-4 py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{record.courseName}</span>
                    <Badge variant="outline" className={`text-xs ${record.passed ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                      {record.passed ? '已通过' : '未通过'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">讲师：{record.instructorName} · 得分：{record.score} · {record.completedAt}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border text-center">
      <Icon className={cn('h-5 w-5 mx-auto', color)} />
      <div className={cn('text-lg font-bold mt-1', color)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
