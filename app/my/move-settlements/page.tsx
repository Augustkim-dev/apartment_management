'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface MoveSettlement {
  id: number;
  unitNumber: string;
  billYear: number;
  billMonth: number;
  settlementDate: string | null;
  outgoingName: string;
  outgoingUsage: number;
  estimatedTotalAmount: number;
  status: string;
}

export default function MyMoveSettlementsPage() {
  const [settlements, setSettlements] = useState<MoveSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettlements() {
      try {
        setLoading(true);
        const response = await fetch('/api/my/move-settlements');
        if (!response.ok) {
          throw new Error('이사정산 내역을 불러오는데 실패했습니다.');
        }
        const data: MoveSettlement[] = await response.json();
        setSettlements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchSettlements();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      default:
        return '대기';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      default:
        return 'text-amber-600';
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">이사정산 내역</h1>
        <p className="text-gray-600 mt-1">이사 시 발생한 전기료 정산 내역입니다.</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">정산 목록</h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            불러오는 중...
          </div>
        ) : settlements.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600">
            이사정산 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {settlements.map((settlement) => (
              <Link
                key={settlement.id}
                href={`/my/move-settlements/${settlement.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {settlement.billYear}년 {settlement.billMonth}월 이사정산
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm font-semibold text-gray-900">
                          사용량: {settlement.outgoingUsage} kWh
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          추정 청구액: {Math.floor(settlement.estimatedTotalAmount).toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.floor(settlement.estimatedTotalAmount).toLocaleString()}원
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${getStatusColor(settlement.status)}`}>
                        {getStatusIcon(settlement.status)}
                        <span className="text-sm font-medium">
                          {getStatusText(settlement.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
