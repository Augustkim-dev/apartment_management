'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

interface SettlementDetail {
  id: number;
  unitId: number;
  unitNumber: string;
  settlementDate: string;
  billYear: number;
  billMonth: number;
  status: 'pending' | 'completed' | 'cancelled';

  outgoingTenant: {
    id: number;
    name: string;
    contact: string | null;
    periodStart: string;
    periodEnd: string;
    meterReading: number | null;
    usage: number | null;
  };

  incomingTenant: {
    id: number;
    name: string;
    contact: string | null;
    periodStart: string;
    meterReading: number | null;
  } | null;

  estimation: {
    totalUsage: number | null;
    totalAmount: number | null;
    baseMonths: { year: number; month: number }[];
  };

  outgoingBill: {
    id: number;
    totalAmount: number;
    isEstimated: boolean;
    paymentStatus: string;
  } | null;

  notes: string | null;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '완료', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '미납', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '납부', color: 'bg-green-100 text-green-800' },
  overdue: { label: '연체', color: 'bg-red-100 text-red-800' },
};

export default function MoveSettlementDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 입주자 등록 폼
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [incomingName, setIncomingName] = useState('');
  const [incomingContact, setIncomingContact] = useState('');
  const [incomingMoveInDate, setIncomingMoveInDate] = useState('');
  const [incomingMoveInReading, setIncomingMoveInReading] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/move-settlements/${id}`);
      if (!res.ok) {
        toast.error('이사 정산 정보를 불러올 수 없습니다.');
        return;
      }
      const data = await res.json();
      setDetail(data);
    } catch {
      toast.error('데이터 로딩에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTenant = async () => {
    if (!incomingName || !incomingMoveInDate || !incomingMoveInReading) {
      toast.error('이름, 입주일, 계량기값은 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/move-settlements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registerIncomingTenant',
          name: incomingName,
          contact: incomingContact || undefined,
          moveInDate: incomingMoveInDate,
          moveInReading: parseFloat(incomingMoveInReading),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || '입주자 등록에 실패했습니다.');
        return;
      }

      toast.success('입주자가 등록되었습니다.');
      setShowRegisterForm(false);
      fetchDetail();
    } catch {
      toast.error('입주자 등록 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: 'completed' | 'cancelled') => {
    const label = status === 'completed' ? '완료' : '취소';
    if (!confirm(`이사 정산을 ${label} 처리하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/move-settlements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', status }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message);
        return;
      }

      toast.success(data.message);
      fetchDetail();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fmtNumber = (n: number | null) =>
    n != null ? Math.floor(n).toLocaleString() : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-12 text-center text-gray-500">
        이사 정산 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/move-settlements"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <ArrowsRightLeftIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                이사 정산 #{detail.id}
              </h1>
              <p className="text-sm text-gray-500">
                {detail.unitNumber}호 - {detail.billYear}년 {detail.billMonth}월
              </p>
            </div>
          </div>
          <span
            className={`ml-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              statusLabels[detail.status]?.color || ''
            }`}
          >
            {statusLabels[detail.status]?.label || detail.status}
          </span>
        </div>

        {detail.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('completed')}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              완료 처리
            </button>
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 퇴거자 정보 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            퇴거자 정보
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">이름</dt>
              <dd className="font-medium">{detail.outgoingTenant.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">연락처</dt>
              <dd>{detail.outgoingTenant.contact || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">청구 기간</dt>
              <dd>
                {formatDate(detail.outgoingTenant.periodStart)} ~{' '}
                {formatDate(detail.outgoingTenant.periodEnd)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">계량기값</dt>
              <dd className="font-medium">
                {fmtNumber(detail.outgoingTenant.meterReading)} kWh
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">사용량</dt>
              <dd className="font-bold text-blue-600">
                {fmtNumber(detail.outgoingTenant.usage)} kWh
              </dd>
            </div>
          </dl>
        </div>

        {/* 입주자 정보 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">입주자 정보</h2>
            {!detail.incomingTenant && detail.status === 'pending' && (
              <button
                onClick={() => setShowRegisterForm(!showRegisterForm)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <UserPlusIcon className="h-4 w-4" />
                입주자 등록
              </button>
            )}
          </div>

          {detail.incomingTenant ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">이름</dt>
                <dd className="font-medium">{detail.incomingTenant.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">연락처</dt>
                <dd>{detail.incomingTenant.contact || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">입주일</dt>
                <dd>{formatDate(detail.incomingTenant.periodStart)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">입주 시 계량기값</dt>
                <dd className="font-medium">
                  {fmtNumber(detail.incomingTenant.meterReading)} kWh
                </dd>
              </div>
            </dl>
          ) : showRegisterForm ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="이름 *"
                value={incomingName}
                onChange={(e) => setIncomingName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="연락처"
                value={incomingContact}
                onChange={(e) => setIncomingContact(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={incomingMoveInDate}
                onChange={(e) => setIncomingMoveInDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="입주 시 계량기값 *"
                value={incomingMoveInReading}
                onChange={(e) => setIncomingMoveInReading(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleRegisterTenant}
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '입주자 등록'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">입주자 미등록</p>
          )}
        </div>
      </div>

      {/* 추정 데이터 & 청구서 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 추정 기준 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            추정 기준 데이터
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">평균 건물 사용량</dt>
              <dd className="font-medium">
                {fmtNumber(detail.estimation.totalUsage)} kWh
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">평균 건물 전체 요금</dt>
              <dd className="font-medium">
                {fmtNumber(detail.estimation.totalAmount)}원
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">참조 월</dt>
              <dd>
                {detail.estimation.baseMonths.length > 0
                  ? detail.estimation.baseMonths
                      .map((m) => `${m.year}.${m.month}`)
                      .join(', ')
                  : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* 퇴거자 청구서 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            퇴거자 청구서
          </h2>
          {detail.outgoingBill ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">청구 금액</dt>
                <dd className="text-lg font-bold text-red-600">
                  {fmtNumber(detail.outgoingBill.totalAmount)}원
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">유형</dt>
                <dd>
                  {detail.outgoingBill.isEstimated ? (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      추정
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      확정
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">납부 상태</dt>
                <dd>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      paymentLabels[detail.outgoingBill.paymentStatus]?.color || ''
                    }`}
                  >
                    {paymentLabels[detail.outgoingBill.paymentStatus]?.label ||
                      detail.outgoingBill.paymentStatus}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">
              해당 월의 청구서가 아직 생성되지 않았습니다.
            </p>
          )}
        </div>
      </div>

      {/* 비고 */}
      {detail.notes && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">비고</h2>
          <p className="text-sm text-gray-600">{detail.notes}</p>
        </div>
      )}
    </div>
  );
}
