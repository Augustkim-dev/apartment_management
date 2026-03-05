'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PrinterIcon,
  BoltIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface MoveSettlementInvoice {
  settlementId: number;
  billYear: number;
  billMonth: number;
  unitNumber: string;
  tenantName: string;
  isEstimated: true;
  status: string;
  settlementDate: string;
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
  meterReading: {
    previous: number;
    current: number;
    usage: number;
  };
  usageRate: number;
  estimationBasis: {
    baseMonths: { year: number; month: number }[];
    avgTotalUsage: number;
    avgTotalAmount: number;
    usageRatio: number;
  };
  billingPeriod: {
    start: string;
    end: string;
  };
  paymentInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    dueDate: string | null;
  };
  paymentStatus: string;
}

export default function MoveSettlementInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoiceData, setInvoiceData] = useState<MoveSettlementInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('charges');

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/move-settlements/${id}/invoice`);

        if (!response.ok) {
          throw new Error('Failed to fetch invoice data');
        }

        const data = await response.json();
        setInvoiceData(data);
      } catch (err) {
        console.error('Error fetching invoice data:', err);
        setError('추정 청구서 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  const handlePrint = () => {
    window.open(`/dashboard/move-settlements/${id}/invoice/print`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    return Math.floor(amount).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const copyAccountNumber = () => {
    if (!invoiceData) return;
    const text = `${invoiceData.paymentInfo.bankName} ${invoiceData.paymentInfo.accountNumber}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('계좌번호가 복사되었습니다.');
    });
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return '납부 완료';
      case 'unpaid': return '미납';
      case 'partial': return '일부 납부';
      case 'pending': return '대기중';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'unpaid': return 'text-red-600 bg-red-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'pending': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">추정 청구서를 불러오는 중...</p>
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

  const tabs = [
    { key: 'charges', label: '요금 상세', icon: CurrencyDollarIcon },
    { key: 'meter', label: '검침 정보', icon: BoltIcon },
    { key: 'estimation', label: '추정 기준', icon: DocumentTextIcon },
    { key: 'payment', label: '납부 정보', icon: CreditCardIcon },
  ];

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
                  {invoiceData.billYear}년 {invoiceData.billMonth}월 추정 전기요금 청구서
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  사용기간: {formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                인쇄
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 호실 정보 카드 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-4xl font-bold">{invoiceData.unitNumber}호</span>
                <span className="text-xl">{invoiceData.tenantName}</span>
              </div>
              <p className="text-amber-100">
                {invoiceData.billYear}년 {invoiceData.billMonth}월 퇴거 정산분
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-amber-100">추정 청구액</p>
              <p className="text-4xl font-bold">
                {formatCurrency(invoiceData.currentCharges.total)}원
              </p>
            </div>
          </div>
        </div>

        {/* 추정 청구서 경고 배너 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start space-x-3">
          <ExclamationCircleIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">추정 청구서</p>
            <p className="text-sm text-amber-700">
              본 청구서는 직전 3개월 평균 데이터를 기반으로 추정한 금액입니다.
            </p>
          </div>
        </div>

        {/* 요약 정보 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 사용량 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">사용량</span>
              <BoltIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{invoiceData.meterReading.usage}</span>
              <span className="text-sm text-gray-500">kWh</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              검침 기반 사용량
            </p>
          </div>

          {/* 사용 비율 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">사용 비율</span>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{(invoiceData.usageRate * 100).toFixed(2)}</span>
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              건물 전체 대비 비율
            </p>
          </div>

          {/* 납부 상태 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">납부 상태</span>
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-lg font-bold px-3 py-1 rounded-full ${getPaymentStatusColor(invoiceData.paymentStatus)}`}>
                {getPaymentStatusLabel(invoiceData.paymentStatus)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              정산일: {formatDate(invoiceData.settlementDate)}
            </p>
          </div>
        </div>

        {/* 상세 정보 탭 */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* 탭 헤더 */}
          <div className="border-b">
            <div className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}
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
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">기본요금</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.basicFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">전력량요금</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">기후환경요금</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.climateFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">연료비조정액</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.fuelFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">역률요금</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFactorFee)}원</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 text-sm text-gray-900">전기요금계</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.subtotal)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">부가가치세</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.vat)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">전력기금</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFund)}원</td>
                      </tr>
                      {invoiceData.currentCharges.roundDown !== 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">절사금액</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.roundDown)}원</td>
                        </tr>
                      )}
                      <tr className="bg-amber-50 font-bold">
                        <td className="px-6 py-4 text-sm text-gray-900">추정 청구금액</td>
                        <td className="px-6 py-4 text-sm text-right text-amber-600">{formatCurrency(invoiceData.currentCharges.total)}원</td>
                      </tr>
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
                  <div className="bg-amber-50 rounded-lg p-6">
                    <p className="text-sm text-amber-600 mb-2">사용량</p>
                    <p className="text-3xl font-bold text-amber-600">{invoiceData.meterReading.usage}</p>
                    <p className="text-sm text-amber-600 mt-1">kWh</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">참고:</span> 퇴거 정산 시 검침값은 퇴거일 기준으로 확인된 데이터입니다.
                  </p>
                </div>
              </div>
            )}

            {/* 추정 기준 탭 */}
            {activeTab === 'estimation' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">추정 기준 정보</h3>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">기준 월</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-3">
                      {invoiceData.estimationBasis.baseMonths.map((month, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
                        >
                          {month.year}년 {month.month}월
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      위 {invoiceData.estimationBasis.baseMonths.length}개월의 평균 데이터를 기반으로 추정합니다.
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">건물 평균 데이터</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">평균 건물 사용량</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(invoiceData.estimationBasis.avgTotalUsage)}
                          <span className="text-sm font-normal text-gray-500 ml-1">kWh</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">평균 건물 청구액</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(invoiceData.estimationBasis.avgTotalAmount)}
                          <span className="text-sm font-normal text-gray-500 ml-1">원</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">호실 사용 비율</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {(invoiceData.estimationBasis.usageRatio * 100).toFixed(2)}
                          <span className="text-sm font-normal text-amber-500 ml-1">%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">추정 방식:</span> 직전 {invoiceData.estimationBasis.baseMonths.length}개월간 건물 전체 사용량 및 청구액의 평균을 산출하고,
                    해당 호실의 사용 비율({(invoiceData.estimationBasis.usageRatio * 100).toFixed(2)}%)을 적용하여 추정 금액을 계산합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 납부 정보 탭 */}
            {activeTab === 'payment' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">납부 정보</h3>

                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">입금 계좌</h4>
                  <div className="bg-amber-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-600 mb-1">입금 계좌번호</p>
                        <p className="text-xl font-bold text-amber-900">
                          {invoiceData.paymentInfo.bankName} {invoiceData.paymentInfo.accountNumber}
                        </p>
                        <p className="text-sm text-amber-600 mt-1">예금주: {invoiceData.paymentInfo.accountHolder}</p>
                      </div>
                      <button
                        onClick={copyAccountNumber}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        계좌 복사
                      </button>
                    </div>
                  </div>
                </div>

                {invoiceData.paymentInfo.dueDate && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">납기일</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-lg font-bold text-gray-900">{formatDate(invoiceData.paymentInfo.dueDate)}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">납부 안내</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                    <p>• 본 청구서는 퇴거 정산용 추정 청구서입니다.</p>
                    <p>• 실제 한전 청구서 수신 후 차액이 발생할 수 있습니다.</p>
                    <p>• 입금 시 반드시 호수를 입력해 주세요.</p>
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
