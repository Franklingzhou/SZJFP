'use client';

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { createRecord } from '@/lib/data-service';

interface AddCustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function AddCustomerForm({ open, onClose, onSubmitted }: AddCustomerFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [demand, setDemand] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    try {
      const result = await createRecord('customers', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        requirement: demand.trim() || undefined,
        budget_min: budgetMin ? parseInt(budgetMin) : undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
      } as Record<string, unknown>);
      if (result.success) {
        setStep('success');
      } else {
        setErrorMsg(result.error || '创建失败');
        setStep('error');
      }
    } catch {
      setErrorMsg('网络错误，请重试');
      setStep('error');
    }
  };

  const handleDone = () => {
    setStep('form');
    setName(''); setPhone(''); setAddress('');
    setDemand(''); setBudgetMin(''); setBudgetMax('');
    onSubmitted?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">录入客户</h2>
          <button onClick={onClose} className="p-1"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {step === 'error' ? (
          <div className="px-4 py-10 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600">录入失败</h3>
            <p className="text-sm text-slate-500 mt-2">{errorMsg}</p>
            <button onClick={() => setStep('form')} className="mt-6 px-8 py-2.5 bg-amber-500 text-white rounded-xl font-medium">返回修改</button>
          </div>
        ) : step === 'success' ? (
          <div className="px-4 py-10 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">客户录入成功</h3>
            <p className="text-sm text-slate-500 mt-2">可在客户列表中查看</p>
            <button onClick={handleDone} className="mt-6 px-8 py-2.5 bg-amber-500 text-white rounded-xl font-medium">完成</button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs text-slate-400"><span className="text-red-500">*</span> 为必填项</p>

            <div>
              <label className="text-sm font-medium text-slate-700">客户姓名 <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名"
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">手机号 <span className="text-red-500">*</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" type="tel" maxLength={11}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">服务地址</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="如：上海市浦东新区"
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">服务需求</label>
              <textarea value={demand} onChange={e => setDemand(e.target.value)} placeholder="如：照顾老人、做饭、打扫卫生" rows={3}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">预算范围（元/月）</label>
              <div className="flex items-center gap-2 mt-1">
                <input value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="最低" type="number"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <span className="text-slate-400">—</span>
                <input value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="最高" type="number"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!name.trim() || !phone.trim()}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium disabled:bg-slate-200 disabled:text-slate-400 transition">
              提交录入
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
