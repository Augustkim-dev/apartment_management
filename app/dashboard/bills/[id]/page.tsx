'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface BillDetail {
  id: number;
  billYear: number;
  billMonth: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate?: string;
  totalUsage: number;
  totalAmount: number;
  basicFee: number;
  powerFee: number;
  climateFee: number;
  fuelFee: number;
  vat: number;
  powerFund: number;
  tvLicenseFee: number;
  roundDown: number;
  unitCount: number;
  paidCount: number;
  createdAt: string;
}

interface UnitBill {
  id: number;  // unit_bills.id
  unitId: number;  // units.id
  unitNumber: string;
  tenantName: string;
  contact: string;
  previousReading: number;
  currentReading: number;
  usage: number;
  usageRate: number;
  basicFee: number;
  powerFee: number;
  climateFee: number;
  fuelFee: number;
  vat: number;
  powerFund: number;
  tvLicenseFee: number;
  roundDown: number;
  totalAmount: number;
  unpaidAmount?: number;  // 미납금액
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentDate: string | null;
}

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [unitBills, setUnitBills] = useState<UnitBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    dueDate: '',
  });

  useEffect(() => {
    fetchBillDetail();
    fetchUnitBills();
  }, [billId]);

  const fetchBillDetail = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch bill detail');
      const data = await response.json();
      setBill(data);
    } catch (error) {
      console.error('Error fetching bill detail:', error);
      toast.error('청구서 정보를 불러오는데 실패했습니다.');
    }
  };

  const fetchUnitBills = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/units`);
      if (!response.ok) throw new Error('Failed to fetch unit bills');
      const data = await response.json();
      setUnitBills(data);
    } catch (error) {
      console.error('Error fetching unit bills:', error);
      // 샘플 데이터
      setUnitBills(generateSampleUnitBills());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleUnitBills = (): UnitBill[] => {
    const units = [];
    const floors = [2, 3, 4]; // 2층, 3층, 4층
    let idx = 1;

    for (const floor of floors) {
      for (let unit = 1; unit <= 16; unit++) {
        const unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
        const usage = Math.floor(Math.random() * 200) + 300;
        const usageRate = usage / 25000; // 전체 사용량 대비 비율

        units.push({
          id: idx,
          unitId: idx, // unitId 추가
          unitNumber,
          tenantName: `입주자${unitNumber}`,
          contact: `010-${floor}${floor}${floor}${floor}-${unit.toString().padStart(4, '0')}`,
          previousReading: Math.floor(Math.random() * 10000) + 20000,
          currentReading: Math.floor(Math.random() * 10000) + 20000 + usage,
          usage,
          usageRate,
          basicFee: Math.round(15380 * usageRate),
          powerFee: Math.round(3847580 * usageRate),
          climateFee: Math.round(267670 * usageRate),
          fuelFee: Math.round(-154270 * usageRate),
          vat: Math.round(397620 * usageRate),
          powerFund: Math.round(147420 * usageRate),
          tvLicenseFee: 0,
          roundDown: 0,
          totalAmount: Math.round(93000 + (usage - 400) * 200),
          unpaidAmount: Math.random() > 0.8 ? Math.round(Math.random() * 100000) : 0, // 20% 확률로 미납금 추가
          paymentStatus: Math.random() > 0.2 ? 'paid' : 'pending',
          paymentDate: Math.random() > 0.2 ? '2025-01-20' : null,
        } as UnitBill);
        idx++;
      }
    }
    return units;
  };

  const handlePaymentUpdate = async (unitBillId: number, status: 'paid' | 'pending') => {
    try {
      const response = await fetch(`/api/bills/${billId}/units/${unitBillId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('납부 상태가 업데이트되었습니다.');
        fetchUnitBills();
        fetchBillDetail();
      } else {
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('납부 상태 업데이트에 실패했습니다.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 현재 필터링된 모든 항목 선택 (상태 무관)
      const allUnitIds = filteredUnitBills.map(unit => unit.id);
      setSelectedUnits(new Set(allUnitIds));
    } else {
      setSelectedUnits(new Set());
    }
  };

  const handleSelectUnit = (unitId: number, checked: boolean) => {
    const newSelected = new Set(selectedUnits);
    if (checked) {
      newSelected.add(unitId);
    } else {
      newSelected.delete(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const handleBulkPayment = async () => {
    // 선택된 항목 중 미납 항목만 필터링
    const unpaidUnitIds = selectedUnitsData
      .filter(unit => unit.paymentStatus !== 'paid')
      .map(unit => unit.id);

    if (unpaidUnitIds.length === 0) {
      toast.error('납부 처리할 미납 항목이 없습니다.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch(`/api/bills/${billId}/units/bulk-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitBillIds: unpaidUnitIds,
          paymentMethod: 'bank_transfer'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // 처리된 항목만 선택 해제
        const newSelected = new Set(selectedUnits);
        unpaidUnitIds.forEach(id => newSelected.delete(id));
        setSelectedUnits(newSelected);
        fetchUnitBills();
        fetchBillDetail();
      } else {
        throw new Error(result.error || '일괄 납부 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Bulk payment error:', error);
      toast.error('일괄 납부 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBulkCancel = async () => {
    // 선택된 항목 중 납부완료 항목만 필터링
    const paidUnitIds = selectedUnitsData
      .filter(unit => unit.paymentStatus === 'paid')
      .map(unit => unit.id);

    if (paidUnitIds.length === 0) {
      toast.error('납부 취소할 납부완료 항목이 없습니다.');
      return;
    }

    setIsProcessingCancel(true);
    try {
      const response = await fetch(`/api/bills/${billId}/units/bulk-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitBillIds: paidUnitIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // 처리된 항목만 선택 해제
        const newSelected = new Set(selectedUnits);
        paidUnitIds.forEach(id => newSelected.delete(id));
        setSelectedUnits(newSelected);
        fetchUnitBills();
        fetchBillDetail();
      } else {
        throw new Error(result.error || '일괄 납부 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('Bulk cancel error:', error);
      toast.error('일괄 납부 취소 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleCarryForward = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/carry-forward`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchUnitBills();
      } else {
        toast.error(result.error || '미납 이월 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Carry forward error:', error);
      toast.error('미납 이월 처리 중 오류가 발생했습니다.');
    }
  };

  const handleOpenEditModal = () => {
    if (bill) {
      // Convert date strings to input format (YYYY-MM-DD)
      const formatForInput = (dateStr: string) => {
        return new Date(dateStr).toISOString().split('T')[0];
      };

      setEditFormData({
        billingPeriodStart: formatForInput(bill.billingPeriodStart),
        billingPeriodEnd: formatForInput(bill.billingPeriodEnd),
        dueDate: bill.dueDate ? formatForInput(bill.dueDate) : '',
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveBillingInfo = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/billing-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setIsEditModalOpen(false);
        fetchBillDetail();
        fetchUnitBills();
      } else {
        toast.error(result.error || '청구 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Billing info update error:', error);
      toast.error('청구 정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleExcelDownload = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/download`);
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `청구서_${bill?.billYear}_${bill?.billMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel 파일 다운로드가 시작되었습니다.');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Excel 다운로드에 실패했습니다.');
    }
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredUnitBills = unitBills.filter(unit => {
    const matchesSearch =
      unit.unitNumber.includes(searchTerm) ||
      unit.tenantName.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' ||
      unit.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 선택된 항목의 상태 분석
  const selectedUnitsList = Array.from(selectedUnits);
  const selectedUnitsData = unitBills.filter(unit => selectedUnits.has(unit.id));
  const selectedPaidCount = selectedUnitsData.filter(unit => unit.paymentStatus === 'paid').length;
  const selectedUnpaidCount = selectedUnitsData.filter(unit => unit.paymentStatus !== 'paid').length;

  // 상태별 개수 계산
  const statusCounts = {
    all: unitBills.length,
    paid: unitBills.filter(u => u.paymentStatus === 'paid').length,
    pending: unitBills.filter(u => u.paymentStatus === 'pending').length,
    overdue: unitBills.filter(u => u.paymentStatus === 'overdue').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">청구서를 찾을 수 없습니다</h2>
        <Link href="/dashboard/bills" className="mt-4 text-blue-600 hover:text-blue-700">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {bill.billYear}년 {bill.billMonth}월 청구서
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                청구 기간: {formatDate(bill.billingPeriodStart)} ~ {formatDate(bill.billingPeriodEnd)}
              </p>
              {bill.dueDate && (
                <p className="text-sm text-gray-500 mt-1">
                  납부기한: {formatDate(bill.dueDate)}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              청구정보 수정
            </button>
            <button
              onClick={handleExcelDownload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Excel 다운로드
            </button>
            <Link
              href={`/dashboard/bills/${billId}/print`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              일괄 출력
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">총 사용량</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {Number(bill.totalUsage).toLocaleString()} kWh
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">총 청구액</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {Number(bill.totalAmount).toLocaleString()}원
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">청구 호실</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {bill.unitCount}호
            </p>
            <div className="mt-2 pt-2 border-t border-purple-200">
              <p className="text-xs text-purple-600">전체 호실 청구액</p>
              <p className="text-lg font-semibold text-gray-900">
                {unitBills.reduce((sum, unit) => sum + Math.floor(unit.totalAmount), 0).toLocaleString()}원
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">납부 현황</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {bill.paidCount}/{bill.unitCount}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${(bill.paidCount / bill.unitCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fee Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">기본 요금</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">기본료</span>
              <span className="text-sm font-medium">{Number(bill.basicFee).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">전력량요금</span>
              <span className="text-sm font-medium">{Number(bill.powerFee).toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">환경 요금</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">기후환경요금</span>
              <span className="text-sm font-medium">{Number(bill.climateFee).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">연료비조정액</span>
              <span className="text-sm font-medium">{Number(bill.fuelFee).toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">부가 요금</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">부가세</span>
              <span className="text-sm font-medium">{Number(bill.vat).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">전력기금</span>
              <span className="text-sm font-medium">{Number(bill.powerFund).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">TV수신료</span>
              <span className="text-sm font-medium">{Number(bill.tvLicenseFee).toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">요약</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">소계</span>
              <span className="text-sm font-medium">
                {(
                  Number(bill.basicFee) +
                  Number(bill.powerFee) +
                  Number(bill.climateFee) +
                  Number(bill.fuelFee) +
                  Number(bill.vat) +
                  Number(bill.powerFund) +
                  Number(bill.tvLicenseFee)
                ).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">단수처리</span>
              <span className="text-sm font-medium">{Number(bill.roundDown).toLocaleString()}원</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">최종 청구액</span>
                <span className="text-sm font-bold text-blue-600">
                  {Number(bill.totalAmount).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Bills Table */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">호실별 상세 내역</h2>
            {selectedUnits.size > 0 && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {selectedUnits.size}개 선택
                  {selectedPaidCount > 0 && selectedUnpaidCount > 0 && (
                    <span className="ml-1">
                      (납부완료 {selectedPaidCount}, 미납 {selectedUnpaidCount})
                    </span>
                  )}
                </span>
                {selectedUnpaidCount > 0 && (
                  <button
                    onClick={handleBulkPayment}
                    disabled={isProcessingPayment}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        납부 처리 ({selectedUnpaidCount}개)
                      </>
                    )}
                  </button>
                )}
                {selectedPaidCount > 0 && (
                  <button
                    onClick={handleBulkCancel}
                    disabled={isProcessingCancel}
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingCancel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        취소 중...
                      </>
                    ) : (
                      <>
                        <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                        납부 취소 ({selectedPaidCount}개)
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="호실 또는 입주자 검색..."
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">전체 ({statusCounts.all})</option>
              <option value="paid">납부완료 ({statusCounts.paid})</option>
              <option value="pending">미납 ({statusCounts.pending})</option>
              <option value="overdue">연체 ({statusCounts.overdue})</option>
            </select>
            <button
              onClick={handleCarryForward}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700"
            >
              미납 이월
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredUnitBills.length > 0 &&
                      filteredUnitBills.every(u => selectedUnits.has(u.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  호실
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입주자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  당월 청구액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  미납금
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 청구액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUnitBills.map((unit) => {
                const totalWithUnpaid = Math.floor(unit.totalAmount) + (unit.unpaidAmount || 0);
                return (
                <React.Fragment key={unit.id}>
                  <tr
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUnits.has(unit.id)}
                        onChange={(e) => handleSelectUnit(unit.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => toggleRowExpansion(unit.id)}>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{unit.unitNumber}</span>
                        <button className="ml-2">
                          {expandedRows.has(unit.id) ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{unit.tenantName}</div>
                        <div className="text-xs text-gray-500">{unit.contact}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{unit.usage.toLocaleString()} kWh</div>
                        <div className="text-xs text-gray-500">
                          {unit.previousReading.toLocaleString()} → {unit.currentReading.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(unit.totalAmount ? Math.floor(unit.totalAmount) : 0).toLocaleString()}원
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {unit.unpaidAmount ? (
                          <span className="text-red-600">
                            {unit.unpaidAmount.toLocaleString()}원
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-600">
                        {totalWithUnpaid.toLocaleString()}원
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {unit.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          납부완료
                        </span>
                      ) : unit.paymentStatus === 'overdue' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                          연체
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                          미납
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        {unit.paymentStatus !== 'paid' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePaymentUpdate(unit.id, 'paid');
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            납부처리
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePaymentUpdate(unit.id, 'pending');
                            }}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            납부취소
                          </button>
                        )}
                        <Link
                          href={`/dashboard/bills/${billId}/units/${unit.unitId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          고지서
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(unit.id) && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">기본료:</span>
                            <span className="ml-2 font-medium">{(unit.basicFee ? Math.floor(unit.basicFee) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">전력량요금:</span>
                            <span className="ml-2 font-medium">{(unit.powerFee ? Math.floor(unit.powerFee) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">기후환경요금:</span>
                            <span className="ml-2 font-medium">{(unit.climateFee ? Math.floor(unit.climateFee) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">연료비조정액:</span>
                            <span className="ml-2 font-medium">{(unit.fuelFee ? Math.floor(unit.fuelFee) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">부가세:</span>
                            <span className="ml-2 font-medium">{(unit.vat ? Math.floor(unit.vat) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">전력기금:</span>
                            <span className="ml-2 font-medium">{(unit.powerFund ? Math.floor(unit.powerFund) : 0).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-500">사용 비율:</span>
                            <span className="ml-2 font-medium">{(unit.usageRate * 100).toFixed(2)}%</span>
                          </div>
                          {unit.paymentDate && (
                            <div>
                              <span className="text-gray-500">납부일:</span>
                              <span className="ml-2 font-medium">{formatDate(unit.paymentDate)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination or Summary */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              총 {filteredUnitBills.length}개 호실
            </p>
            <div className="text-sm text-gray-700">
              총 청구액: <span className="font-semibold">
                {filteredUnitBills.reduce((sum, unit) => sum + Math.floor(unit.totalAmount), 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Billing Info Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">청구정보 수정</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  청구기간 시작일
                </label>
                <input
                  type="date"
                  value={editFormData.billingPeriodStart}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, billingPeriodStart: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  청구기간 종료일
                </label>
                <input
                  type="date"
                  value={editFormData.billingPeriodEnd}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, billingPeriodEnd: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  납부기한
                </label>
                <input
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveBillingInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}