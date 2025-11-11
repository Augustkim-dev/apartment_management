'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UnitInvoiceResponse } from '@/types/database';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  CalendarIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Line, Bar, Pie } from 'recharts';

// Using UnitInvoiceResponse from @/types/database instead of local interface
interface UnitInvoiceData_Legacy {
  // 기본 정보
  billYear: number;
  billMonth: number;
  unitNumber: string;
  tenantName: string;

  // 청구 정보
  currentCharges: {
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    subtotal: number;
    vat: number;
    powerFund: number;
    roundDown: number;
    total: number;
  };

  previousCharges: {
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    subtotal: number;
    vat: number;
    powerFund: number;
    roundDown: number;
    total: number;
  };

  // 미납 정보
  unpaidAmount: number;
  unpaidDetails: Array<{
    month: string;
    amount: number;
  }>;

  // 건물 전체 정보
  buildingTotal: {
    totalAmount: number;
    totalUsage: number;
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    vat: number;
    powerFund: number;
  };

  // 검침 정보
  meterReading: {
    previous: number;
    current: number;
    usage: number;
  };

  // 계산 기준
  usageRate: number;
  unitBaseFee: number;

  // 계약 정보
  contractInfo: {
    contractType: string;
    contractPower: number;
    appliedPower: number;
    basicFeeRate: number;
  };

  // 납부 정보
  paymentInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    dueDate: string;
  };

  // 사용 기간
  billingPeriod: {
    start: string;
    end: string;
  };

  // 안내사항
  notices?: string[];

  // 최근 6개월 데이터 (차트용) - optional for legacy
  monthlyHistory?: Array<{
    month: string;
    usage: number;
    amount: number;
  }>;
}

// 더미 데이터 생성 함수 (deprecated - using API now)
function generateInvoiceData_Legacy(unitNumber: string): UnitInvoiceData_Legacy {
  const usage = Math.floor(Math.random() * 100) + 100;
  const usageRate = usage / 25231;

  return {
    billYear: 2025,
    billMonth: 7,
    unitNumber,
    tenantName: `입주자${unitNumber}`,

    currentCharges: {
      basicFee: 8454,
      powerFee: 19589,
      climateFee: 1373,
      fuelFee: 763,
      powerFactorFee: -85,
      subtotal: 30094,
      vat: 3009,
      powerFund: 918,
      roundDown: -1,
      total: 34020,
    },

    previousCharges: {
      basicFee: 4854,
      powerFee: 8014,
      climateFee: 667,
      fuelFee: 371,
      powerFactorFee: -49,
      subtotal: 13857,
      vat: 1386,
      powerFund: 443,
      roundDown: -5,
      total: 15681,
    },

    unpaidAmount: 81500,
    unpaidDetails: [
      { month: '2월', amount: 19830 },
      { month: '3월', amount: 17160 },
      { month: '4월', amount: 14390 },
      { month: '5월', amount: 14440 },
      { month: '6월', amount: 15680 },
    ],

    buildingTotal: {
      totalAmount: 5625260,
      totalUsage: 25231,
      basicFee: 1397760,
      powerFee: 3238894,
      climateFee: 227079,
      fuelFee: 126155,
      powerFactorFee: -13977,
      vat: 497591,
      powerFund: 151760,
    },

    meterReading: {
      previous: 1753.9,
      current: 1601.3,
      usage: 152.6,
    },

    usageRate: 0.00605,
    unitBaseFee: 55.4,

    contractInfo: {
      contractType: '일반용(을) 고압A Ⅱ',
      contractPower: 700,
      appliedPower: 210,
      basicFeeRate: 8320,
    },

    paymentInfo: {
      bankName: '신한은행',
      accountNumber: '100-035-727568',
      accountHolder: '㈜코로코',
      dueDate: '2025-08-30',
    },

    billingPeriod: {
      start: '2025-06-10',
      end: '2025-07-09',
    },

    monthlyHistory: [
      { month: '2월', usage: 145, amount: 28500 },
      { month: '3월', usage: 132, amount: 26800 },
      { month: '4월', usage: 128, amount: 25600 },
      { month: '5월', usage: 135, amount: 27200 },
      { month: '6월', usage: 142, amount: 28900 },
      { month: '7월', usage: 152, amount: 34020 },
    ],
  };
}

export default function UnitInvoiceViewerPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  const unitId = params.unitId as string;

  const [invoiceData, setInvoiceData] = useState<UnitInvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('charges');

  useEffect(() => {
    // API에서 실제 데이터 로드
    async function fetchInvoiceData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/bills/${billId}/units/${unitId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch invoice data');
        }

        const data = await response.json();
        setInvoiceData(data);
      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError('고지서 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (billId && unitId) {
      fetchInvoiceData();
    }
  }, [billId, unitId]);

  const handlePrint = () => {
    // 인쇄 전용 페이지를 새 창에서 열기
    window.open(`/dashboard/bills/${billId}/units/${unitId}/print`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    return Math.floor(amount).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const calculateChange = () => {
    if (!invoiceData) return { amount: 0, percentage: 0, isIncrease: true };
    const diff = invoiceData.currentCharges.total - invoiceData.previousCharges.total;
    const percentage = invoiceData.previousCharges.total > 0
      ? (diff / invoiceData.previousCharges.total) * 100
      : 0;
    return {
      amount: Math.abs(diff),
      percentage: Math.abs(percentage),
      isIncrease: diff > 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">고지서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-800">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return <div className="p-6">데이터가 없습니다.</div>;
  }

  const change = calculateChange();
  const daysUntilDue = Math.ceil((new Date(invoiceData.paymentInfo.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {invoiceData.billYear}년 {invoiceData.billMonth}월 전기요금 고지서
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  사용기간: {formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                인쇄
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                PDF
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                이메일
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 호실 정보 카드 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-4xl font-bold">{invoiceData.unitNumber}호</span>
                <span className="text-xl">{invoiceData.tenantName}</span>
              </div>
              <p className="text-blue-100">
                {invoiceData.billYear}년 {invoiceData.billMonth}월 청구분
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">
                {invoiceData.unpaidAmount > 0 ? '총 납부액' : '당월 청구액'}
              </p>
              <p className="text-4xl font-bold">
                {formatCurrency(invoiceData.currentCharges.total + (invoiceData.unpaidAmount || 0))}원
              </p>
              {invoiceData.unpaidAmount > 0 && (
                <p className="text-sm text-blue-200 mt-1">
                  (당월 {formatCurrency(invoiceData.currentCharges.total)}원 + 미납 {formatCurrency(invoiceData.unpaidAmount)}원)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 요약 정보 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 전월 대비 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">전월 대비</span>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold ${change.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                {change.isIncrease ? '+' : '-'}{formatCurrency(change.amount)}원
              </span>
            </div>
            <p className={`text-sm mt-1 ${change.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
              {change.isIncrease ? '↑' : '↓'} {change.percentage.toFixed(1)}%
            </p>
          </div>

          {/* 사용량 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">당월 사용량</span>
              <BoltIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{invoiceData.meterReading.usage}</span>
              <span className="text-sm text-gray-500">kWh</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              전체 대비 {(invoiceData.usageRate * 100).toFixed(2)}%
            </p>
          </div>

          {/* 미납금액 */}
          {invoiceData.unpaidAmount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-600 font-medium">미납금액</span>
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-red-600">{formatCurrency(invoiceData.unpaidAmount)}</span>
                <span className="text-sm text-red-600">원</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                {invoiceData.unpaidDetails.length}개월 미납
              </p>
            </div>
          )}

          {/* 납기일 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">납기일</span>
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-gray-900">{formatDate(invoiceData.paymentInfo.dueDate)}</span>
            </div>
            <p className={`text-sm mt-1 ${daysUntilDue < 7 ? 'text-red-600' : 'text-gray-500'}`}>
              {daysUntilDue > 0 ? `D-${daysUntilDue}` : '납기일 경과'}
            </p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 사용량 추이 차트 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 6개월 사용량 추이</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              {/* 실제로는 Recharts Line 컴포넌트 사용 */}
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
                <p>차트 영역</p>
                <p className="text-sm">Line Chart</p>
              </div>
            </div>
          </div>

          {/* 요금 구성 차트 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">당월 요금 구성</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              {/* 실제로는 Recharts Pie 컴포넌트 사용 */}
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
                <p>차트 영역</p>
                <p className="text-sm">Pie Chart</p>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 정보 탭 */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* 탭 헤더 */}
          <div className="border-b">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('charges')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'charges'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5" />
                  <span>요금 상세</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('meter')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'meter'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BoltIcon className="h-5 w-5" />
                  <span>검침 정보</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('building')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'building'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="h-5 w-5" />
                  <span>건물 전체</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'payment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CreditCardIcon className="h-5 w-5" />
                  <span>납부 정보</span>
                </div>
              </button>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {/* 요금 상세 탭 */}
            {activeTab === 'charges' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">요금 상세 내역</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">항목</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">당월</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">전월</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">증감</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">기본요금</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.basicFee)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {formatCurrency(invoiceData.previousCharges.basicFee)}원
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.currentCharges.basicFee - invoiceData.previousCharges.basicFee > 0 ? '+' : ''}
                          {formatCurrency(invoiceData.currentCharges.basicFee - invoiceData.previousCharges.basicFee)}원
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">전력량요금</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.powerFee)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.previousCharges.powerFee) + '원' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? (
                            <>
                              {invoiceData.currentCharges.powerFee - invoiceData.previousCharges.powerFee > 0 ? '+' : ''}
                              {formatCurrency(invoiceData.currentCharges.powerFee - invoiceData.previousCharges.powerFee)}원
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">기후환경요금</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.climateFee)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.previousCharges.climateFee) + '원' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? (
                            <>
                              {invoiceData.currentCharges.climateFee - invoiceData.previousCharges.climateFee > 0 ? '+' : ''}
                              {formatCurrency(invoiceData.currentCharges.climateFee - invoiceData.previousCharges.climateFee)}원
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">연료비조정액</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.fuelFee)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.previousCharges.fuelFee) + '원' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? (
                            <>
                              {invoiceData.currentCharges.fuelFee - invoiceData.previousCharges.fuelFee > 0 ? '+' : ''}
                              {formatCurrency(invoiceData.currentCharges.fuelFee - invoiceData.previousCharges.fuelFee)}원
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">역률요금</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.powerFactorFee)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.previousCharges.powerFactorFee) + '원' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.currentCharges.powerFactorFee - invoiceData.previousCharges.powerFactorFee) + '원' : '-'}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 text-sm text-gray-900">전기요금계</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.subtotal)}원</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.previousCharges.subtotal)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.currentCharges.subtotal - invoiceData.previousCharges.subtotal > 0 ? '+' : ''}
                          {formatCurrency(invoiceData.currentCharges.subtotal - invoiceData.previousCharges.subtotal)}원
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">부가가치세</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.vat)}원</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.previousCharges.vat)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.currentCharges.vat - invoiceData.previousCharges.vat > 0 ? '+' : ''}
                          {formatCurrency(invoiceData.currentCharges.vat - invoiceData.previousCharges.vat)}원
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">전력기금</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.currentCharges.powerFund)}원</td>
                        <td className="px-6 py-4 text-sm text-right">{formatCurrency(invoiceData.previousCharges.powerFund)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.currentCharges.powerFund - invoiceData.previousCharges.powerFund > 0 ? '+' : ''}
                          {formatCurrency(invoiceData.currentCharges.powerFund - invoiceData.previousCharges.powerFund)}원
                        </td>
                      </tr>
                      <tr className="bg-blue-50 font-bold">
                        <td className="px-6 py-4 text-sm text-gray-900">당월 청구금액</td>
                        <td className="px-6 py-4 text-sm text-right text-blue-600">{formatCurrency(invoiceData.currentCharges.total)}원</td>
                        <td className="px-6 py-4 text-sm text-right">
                          {invoiceData.previousCharges ? formatCurrency(invoiceData.previousCharges.total) + '원' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-blue-600">
                          {invoiceData.previousCharges ? (
                            <>
                              {invoiceData.currentCharges.total - invoiceData.previousCharges.total > 0 ? '+' : ''}
                              {formatCurrency(invoiceData.currentCharges.total - invoiceData.previousCharges.total)}원
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                      {invoiceData.unpaidAmount > 0 && (
                        <>
                          <tr className="bg-red-50">
                            <td className="px-6 py-4 text-sm text-red-700">전월 미납금</td>
                            <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(invoiceData.unpaidAmount)}원</td>
                            <td className="px-6 py-4 text-sm text-right">-</td>
                            <td className="px-6 py-4 text-sm text-right">-</td>
                          </tr>
                          <tr className="bg-purple-50 font-bold">
                            <td className="px-6 py-4 text-sm text-purple-900">총 납부금액</td>
                            <td className="px-6 py-4 text-sm text-right text-purple-600 text-lg">
                              {formatCurrency(invoiceData.currentCharges.total + invoiceData.unpaidAmount)}원
                            </td>
                            <td className="px-6 py-4 text-sm text-right">-</td>
                            <td className="px-6 py-4 text-sm text-right">-</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 검침 정보 탭 */}
            {activeTab === 'meter' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">검침 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-sm text-gray-500 mb-2">전월 지침</p>
                    <p className="text-3xl font-bold text-gray-900">{invoiceData.meterReading.previous}</p>
                    <p className="text-sm text-gray-500 mt-1">kWh</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-sm text-gray-500 mb-2">당월 지침</p>
                    <p className="text-3xl font-bold text-gray-900">{invoiceData.meterReading.current}</p>
                    <p className="text-sm text-gray-500 mt-1">kWh</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <p className="text-sm text-blue-600 mb-2">사용량</p>
                    <p className="text-3xl font-bold text-blue-600">{invoiceData.meterReading.usage}</p>
                    <p className="text-sm text-blue-600 mt-1">kWh</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">참고:</span> 검침일은 매월 9일이며, 검침값은 한국전력공사에서 제공한 데이터입니다.
                  </p>
                </div>
              </div>
            )}

            {/* 건물 전체 탭 */}
            {activeTab === 'building' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">건물 전체 정보</h3>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">한전 계약 정보</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">계약 종별</p>
                        <p className="font-medium">{invoiceData.contractInfo.contractType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">계약 전력</p>
                        <p className="font-medium">{invoiceData.contractInfo.contractPower} kW</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">요금적용 전력</p>
                        <p className="font-medium">{invoiceData.contractInfo.appliedPower} kW</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">기본료 단가</p>
                        <p className="font-medium">1kW당 {formatCurrency(invoiceData.contractInfo.basicFeeRate)}원</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">건물 전체 청구 내역</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">총 청구액</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoiceData.buildingTotal.totalAmount)}원</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">총 사용량</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoiceData.buildingTotal.totalUsage)} kWh</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">기본료:</span>
                          <span>{formatCurrency(invoiceData.buildingTotal.basicFee)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">전력량요금:</span>
                          <span>{formatCurrency(invoiceData.buildingTotal.powerFee)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">기후환경요금:</span>
                          <span>{formatCurrency(invoiceData.buildingTotal.climateFee)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">연료비조정액:</span>
                          <span>{formatCurrency(invoiceData.buildingTotal.fuelFee)}원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 납부 정보 탭 */}
            {activeTab === 'payment' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">납부 정보</h3>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">입금 계좌</h4>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 mb-1">입금 계좌번호</p>
                        <p className="text-xl font-bold text-blue-900">
                          {invoiceData.paymentInfo.bankName} {invoiceData.paymentInfo.accountNumber}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">예금주: {invoiceData.paymentInfo.accountHolder}</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        계좌 복사
                      </button>
                    </div>
                  </div>
                </div>

                {invoiceData.unpaidAmount > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">미납 내역</h4>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="mb-3">
                        <p className="text-sm text-red-600">총 미납금액</p>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(invoiceData.unpaidAmount)}원</p>
                      </div>
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-sm text-red-600">
                            <th className="text-left pb-2">청구월</th>
                            <th className="text-right pb-2">미납금액</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {invoiceData.unpaidDetails.map((item, index) => (
                            <tr key={index} className="border-t border-red-200">
                              <td className="py-2 text-red-700">{item.month}</td>
                              <td className="py-2 text-right text-red-700">{formatCurrency(item.amount)}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">납부 안내</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                    <p>• 납기일까지 납부하지 않을 경우 연체료가 부과됩니다.</p>
                    <p>• 입금 시 반드시 호수를 입력해 주세요.</p>
                    <p>• 자동이체 신청은 관리사무소로 문의해 주세요.</p>
                    <p>• 문의: 관리사무소 02-XXX-XXXX</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}