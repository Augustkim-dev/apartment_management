'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { SettlementRecord, SettlementSummary, SettlementFilters } from '@/types/settlement';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({
    totalBilled: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    recordCount: 0,
    paidCount: 0,
    unpaidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // 필터 상태
  const [filters, setFilters] = useState<SettlementFilters>({
    unitNumber: '',
    userName: '',
    phoneNumber: '',
    startDate: '',
    endDate: '',
    paymentStatus: 'all',
    page: 1,
    limit: 50,
  });

  // 날짜 수정 모달
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState<string>('');

  // 데이터 로드
  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.unitNumber) params.append('unitNumber', filters.unitNumber);
      if (filters.userName) params.append('userName', filters.userName);
      if (filters.phoneNumber) params.append('phoneNumber', filters.phoneNumber);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '50');

      const response = await fetch(`/api/settlements?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setSettlements(result.data);
        setSummary(result.summary);
        setPagination(result.pagination);
      } else {
        toast.error('데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
      toast.error('데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // 검색 핸들러
  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
  };

  // 초기화 핸들러
  const handleReset = () => {
    setFilters({
      unitNumber: '',
      userName: '',
      phoneNumber: '',
      startDate: '',
      endDate: '',
      paymentStatus: 'all',
      page: 1,
      limit: 50,
    });
  };

  // 납부 상태 토글
  const handleStatusToggle = async (billId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paymentDate = newStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : null;

    try {
      const response = await fetch(`/api/settlements/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('납부 상태가 변경되었습니다.');
        fetchSettlements();
      } else {
        toast.error('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 납부일자 수정
  const handleDateUpdate = async () => {
    if (!editingBillId || !editingDate) return;

    try {
      const response = await fetch(`/api/settlements/${editingBillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: editingDate,
          paymentStatus: 'paid', // 날짜를 설정하면 자동으로 paid로 변경
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('납부일자가 변경되었습니다.');
        setEditingBillId(null);
        setEditingDate('');
        fetchSettlements();
      } else {
        toast.error('날짜 변경에 실패했습니다.');
      }
    } catch (error) {
      toast.error('날짜 변경 중 오류가 발생했습니다.');
    }
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  // 납부 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            납부완료
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            미납
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationCircleIcon className="w-4 h-4 mr-1" />
            연체
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">정산 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            전체 호실의 청구 내역과 납부 현황을 관리합니다
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 부과액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(summary.totalBilled).toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500 mt-1">{summary.recordCount}건</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 납부액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(summary.totalPaid).toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500 mt-1">{summary.paidCount}건</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 미납액</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(summary.totalUnpaid).toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500 mt-1">{summary.unpaidCount}건</p>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 필터 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">검색 필터</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              호실 번호
            </label>
            <input
              type="text"
              placeholder="예: 201"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.unitNumber || ''}
              onChange={(e) => setFilters({ ...filters, unitNumber: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용자명
            </label>
            <input
              type="text"
              placeholder="이름 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.userName || ''}
              onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호
            </label>
            <input
              type="text"
              placeholder="전화번호 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.phoneNumber || ''}
              onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 월
            </label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 월
            </label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              납부 상태
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.paymentStatus || 'all'}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value as any })}
            >
              <option value="all">전체</option>
              <option value="pending">미납</option>
              <option value="paid">납부완료</option>
              <option value="overdue">연체</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSearch}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
            검색
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            초기화
          </button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">다른 조건으로 검색해보세요.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      청구월
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      호실
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      사용자명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      사용량
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      부과금액
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                      납부상태
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                      납부일자
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settlements.map((settlement) => (
                    <tr key={settlement.unitBillId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {settlement.billYear}년 {settlement.billMonth}월
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {settlement.unitNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {settlement.tenantName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {settlement.contact || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {Math.floor(settlement.usageAmount).toLocaleString()} kWh
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {Math.floor(settlement.totalAmount).toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleStatusToggle(settlement.unitBillId, settlement.paymentStatus)}
                          className="cursor-pointer hover:opacity-75"
                        >
                          {getStatusBadge(settlement.paymentStatus)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                        {editingBillId === settlement.unitBillId ? (
                          <div className="flex items-center justify-center space-x-2">
                            <input
                              type="date"
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                              value={editingDate}
                              onChange={(e) => setEditingDate(e.target.value)}
                            />
                            <button
                              onClick={handleDateUpdate}
                              className="text-green-600 hover:text-green-800"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setEditingBillId(null);
                                setEditingDate('');
                              }}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBillId(settlement.unitBillId);
                              setEditingDate(settlement.paymentDate || format(new Date(), 'yyyy-MM-dd'));
                            }}
                            className="hover:text-blue-600"
                          >
                            {settlement.paymentDate
                              ? format(new Date(settlement.paymentDate), 'yyyy-MM-dd')
                              : '-'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <button
                          onClick={() => {
                            setEditingBillId(settlement.unitBillId);
                            setEditingDate(settlement.paymentDate || format(new Date(), 'yyyy-MM-dd'));
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <CalendarIcon className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{pagination.total}</span>개 중{' '}
                    <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                    -
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
