'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

interface UnitBill {
  id: number;
  bill_year: number;
  bill_month: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  due_date: string;
  unit_number: string;
  basic_fee: number;
  power_fee: number;
  vat: number;
}

interface BillsResponse {
  bills: UnitBill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    totalCount: number;
    paidCount: number;
    unpaidCount: number;
  };
}

type StatusFilter = 'all' | 'paid' | 'unpaid';

export default function MyBillsPage() {
  const [bills, setBills] = useState<UnitBill[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    totalCount: 0,
    paidCount: 0,
    unpaidCount: 0
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async (page: number, status: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status
      });
      const response = await fetch(`/api/my/bills?${params}`);
      if (!response.ok) {
        throw new Error('청구서를 불러오는데 실패했습니다.');
      }
      const data: BillsResponse = await response.json();
      setBills(data.bills);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills(pagination.page, statusFilter);
  }, []);

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    fetchBills(1, status);
  };

  const handlePageChange = (page: number) => {
    fetchBills(page, statusFilter);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '납부완료';
      case 'overdue':
        return '연체';
      default:
        return '미납';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getFilterCount = (filter: StatusFilter): number => {
    switch (filter) {
      case 'paid':
        return summary.paidCount;
      case 'unpaid':
        return summary.unpaidCount;
      default:
        return summary.totalCount;
    }
  };

  // 페이지네이션 버튼 생성
  const renderPaginationButtons = () => {
    const buttons = [];
    const { page, totalPages } = pagination;

    // 최대 5개의 페이지 버튼 표시
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 text-sm rounded ${
            i === page
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchBills(1, statusFilter)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">청구서 내역</h1>
        <p className="text-gray-600 mt-1">
          {bills[0]?.unit_number ? `${bills[0].unit_number}호 ` : ''}전기료 청구 내역
        </p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 청구액</h3>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(summary.totalAmount).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-600 mt-1">전체 {summary.totalCount}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">납부 완료</h3>
          <p className="text-2xl font-bold text-green-600">
            {Math.floor(summary.paidAmount).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-600 mt-1">{summary.paidCount}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">납부하셔야 할 금액</h3>
          <p className="text-2xl font-bold text-orange-600">
            {Math.floor(summary.unpaidAmount).toLocaleString()}원
          </p>
          <p className="text-xs text-gray-600 mt-1">{summary.unpaidCount}건</p>
        </div>
      </div>

      {/* 청구서 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">전체 청구서 목록</h2>

            {/* 필터 탭 */}
            <div className="flex gap-2">
              {(['all', 'paid', 'unpaid'] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleStatusChange(filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? '전체' : filter === 'paid' ? '납부완료' : '미납'}
                  <span className="ml-1 text-xs">
                    ({getFilterCount(filter)})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            불러오는 중...
          </div>
        ) : bills.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600">
            {statusFilter === 'all'
              ? '청구서가 없습니다.'
              : statusFilter === 'paid'
              ? '납부완료된 청구서가 없습니다.'
              : '미납 청구서가 없습니다.'}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {bills.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/my/bills/${bill.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-8 w-8 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bill.bill_year}년 {bill.bill_month}월 청구서
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm font-semibold text-gray-900">
                            기본료: {(bill.basic_fee ? Math.floor(bill.basic_fee) : 0).toLocaleString()}원
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            전력량요금: {(bill.power_fee ? Math.floor(bill.power_fee) : 0).toLocaleString()}원
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            부가세: {(bill.vat ? Math.floor(bill.vat) : 0).toLocaleString()}원
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 mt-1">
                          납부기한: {new Date(bill.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {(bill.total_amount ? Math.floor(bill.total_amount) : 0).toLocaleString()}원
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${getStatusColor(bill.payment_status)}`}>
                          {getStatusIcon(bill.payment_status)}
                          <span className="text-sm font-medium">
                            {getStatusText(bill.payment_status)}
                          </span>
                        </div>
                        {bill.payment_date && (
                          <p className="text-xs font-semibold text-gray-900 mt-1">
                            납부일: {new Date(bill.payment_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  전체 {pagination.total}건 중 {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}건
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  {renderPaginationButtons()}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
