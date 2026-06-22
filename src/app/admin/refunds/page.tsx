'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle, XCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Refund {
  id: string;
  refund_type: string;
  amount: number;
  reason: string | null;
  related_type: string;
  related_id: string;
  related_name: string | null;
  requester_id: string;
  requester_role: string;
  status: string;
  approver_id: string | null;
  review_comment: string | null;
  approved_at: string | null;
  completed_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string | null;
}

const REFUND_TYPE_LABELS: Record<string, string> = {
  training_fee: '培训费',
  agency_fee: '中介费',
  deposit: '保证金',
};

const RELATED_TYPE_LABELS: Record<string, string> = {
  lead_contract: '培训合同',
  contract: '中介合同',
  order: '订单',
  worker: '阿姨',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  completed: '已完成',
  rejected: '已驳回',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const ROLE_LABELS: Record<string, string> = {
  recruiter: '招生',
  agent: '经纪人',
  worker_operator: '运营',
  admin: '管理员',
};

type FilterTab = 'all' | 'pending' | 'approved' | 'completed' | 'rejected';

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [refundTypeFilter, setRefundTypeFilter] = useState('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterTab !== 'all') params.set('status', filterTab);
      if (refundTypeFilter !== 'all') params.set('refund_type', refundTypeFilter);
      const res = await fetch(`/api/refunds?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) setRefunds(json.data || []);
    } catch (e) {
      console.error('获取退款列表失败', e);
    } finally {
      setLoading(false);
    }
  }, [filterTab, refundTypeFilter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleApprove = async () => {
    if (!selectedRefund) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/refunds/${selectedRefund.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ review_comment: reviewComment }),
    });
    const json = await res.json();
    if (json.ok) {
      toast({ title: '审批通过', description: '退款申请已通过' });
      setApproveOpen(false);
      setReviewComment('');
      fetchRefunds();
    } else {
      toast({ title: '操作失败', description: json.error, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/refunds/${selectedRefund.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ review_comment: reviewComment }),
    });
    const json = await res.json();
    if (json.ok) {
      toast({ title: '已驳回', description: '退款申请已驳回' });
      setRejectOpen(false);
      setReviewComment('');
      fetchRefunds();
    } else {
      toast({ title: '操作失败', description: json.error, variant: 'destructive' });
    }
  };

  const handleComplete = async () => {
    if (!selectedRefund) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/refunds/${selectedRefund.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ remark: reviewComment }),
    });
    const json = await res.json();
    if (json.ok) {
      toast({ title: '确认完成', description: '线下打款已确认完成' });
      setCompleteOpen(false);
      setReviewComment('');
      fetchRefunds();
    } else {
      toast({ title: '操作失败', description: json.error, variant: 'destructive' });
    }
  };

  const openApproveDialog = (r: Refund) => {
    setSelectedRefund(r);
    setReviewComment('');
    setApproveOpen(true);
  };

  const openRejectDialog = (r: Refund) => {
    setSelectedRefund(r);
    setReviewComment('');
    setRejectOpen(true);
  };

  const openCompleteDialog = (r: Refund) => {
    setSelectedRefund(r);
    setReviewComment('');
    setCompleteOpen(true);
  };

  const openDetail = (r: Refund) => {
    setSelectedRefund(r);
    setDetailOpen(true);
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已通过' },
    { key: 'completed', label: '已完成' },
    { key: 'rejected', label: '已驳回' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">退款管理</h1>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterTab === tab.key ? 'bg-white shadow-sm font-medium' : 'hover:text-foreground text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Select value={refundTypeFilter} onValueChange={setRefundTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="退款类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="training_fee">培训费</SelectItem>
            <SelectItem value="agency_fee">中介费</SelectItem>
            <SelectItem value="deposit">保证金</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无退款记录</div>
      ) : (
        <div className="space-y-3">
          {refunds.map(r => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[r.status] || 'bg-gray-100'}>
                      {STATUS_LABELS[r.status] || r.status}
                    </Badge>
                    <Badge variant="outline">{REFUND_TYPE_LABELS[r.refund_type] || r.refund_type}</Badge>
                    <span className="font-semibold text-lg">¥{r.amount.toLocaleString()}</span>
                    {r.related_name && (
                      <span className="text-sm text-muted-foreground">
                        {RELATED_TYPE_LABELS[r.related_type] || r.related_type}: {r.related_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      发起人: {ROLE_LABELS[r.requester_role] || r.requester_role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {expandedId === r.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {r.reason && (
                      <div>
                        <span className="text-xs text-muted-foreground">退款原因：</span>
                        <p className="text-sm">{r.reason}</p>
                      </div>
                    )}
                    {r.review_comment && (
                      <div>
                        <span className="text-xs text-muted-foreground">审核意见：</span>
                        <p className="text-sm">{r.review_comment}</p>
                      </div>
                    )}
                    {r.approved_at && (
                      <div className="text-xs text-muted-foreground">
                        审核时间: {new Date(r.approved_at).toLocaleString('zh-CN')}
                      </div>
                    )}
                    {r.completed_at && (
                      <div className="text-xs text-muted-foreground">
                        完成时间: {new Date(r.completed_at).toLocaleString('zh-CN')}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(r); }}>
                        <Eye className="h-3 w-3 mr-1" /> 详情
                      </Button>
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); openApproveDialog(r); }}>
                            <CheckCircle className="h-3 w-3 mr-1" /> 通过
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openRejectDialog(r); }}>
                            <XCircle className="h-3 w-3 mr-1" /> 驳回
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openCompleteDialog(r); }}>
                          <CheckCircle className="h-3 w-3 mr-1" /> 确认打款完成
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>退款详情</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">退款类型：</span>{REFUND_TYPE_LABELS[selectedRefund.refund_type]}</div>
                <div><span className="text-muted-foreground">金额：</span>¥{selectedRefund.amount.toLocaleString()}</div>
                <div><span className="text-muted-foreground">关联类型：</span>{RELATED_TYPE_LABELS[selectedRefund.related_type] || selectedRefund.related_type}</div>
                <div><span className="text-muted-foreground">关联名称：</span>{selectedRefund.related_name || '-'}</div>
                <div><span className="text-muted-foreground">状态：</span>
                  <Badge className={STATUS_COLORS[selectedRefund.status]}>{STATUS_LABELS[selectedRefund.status]}</Badge>
                </div>
                <div><span className="text-muted-foreground">发起角色：</span>{ROLE_LABELS[selectedRefund.requester_role] || selectedRefund.requester_role}</div>
              </div>
              {selectedRefund.reason && (
                <div><span className="text-sm text-muted-foreground">退款原因：</span><p className="text-sm mt-1">{selectedRefund.reason}</p></div>
              )}
              {selectedRefund.review_comment && (
                <div><span className="text-sm text-muted-foreground">审核意见：</span><p className="text-sm mt-1">{selectedRefund.review_comment}</p></div>
              )}
              {selectedRefund.remark && (
                <div><span className="text-sm text-muted-foreground">备注：</span><p className="text-sm mt-1">{selectedRefund.remark}</p></div>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>创建时间: {new Date(selectedRefund.created_at).toLocaleString('zh-CN')}</div>
                {selectedRefund.approved_at && <div>审批时间: {new Date(selectedRefund.approved_at).toLocaleString('zh-CN')}</div>}
                {selectedRefund.completed_at && <div>完成时间: {new Date(selectedRefund.completed_at).toLocaleString('zh-CN')}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 审批通过弹窗 */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>审批通过退款申请</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              确认通过 ¥{selectedRefund?.amount.toLocaleString()} 的{selectedRefund ? REFUND_TYPE_LABELS[selectedRefund.refund_type] : ''}退款申请？
            </p>
            <Textarea
              placeholder="审核意见（可选）"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>取消</Button>
            <Button onClick={handleApprove}>确认通过</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回弹窗 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回退款申请</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              确认驳回 ¥{selectedRefund?.amount.toLocaleString()} 的{selectedRefund ? REFUND_TYPE_LABELS[selectedRefund.refund_type] : ''}退款申请？
            </p>
            <Textarea
              placeholder="驳回原因（必填）"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleReject}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认完成弹窗 */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认线下打款完成</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              确认已线下打款 ¥{selectedRefund?.amount.toLocaleString()} 完成？
            </p>
            <Textarea
              placeholder="备注（可选）"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>取消</Button>
            <Button onClick={handleComplete}>确认完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
