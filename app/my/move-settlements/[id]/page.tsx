'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PrinterIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  BoltIcon,
  CalculatorIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface SettlementInvoice {
  settlementId: number;
  billYear: number;
  billMonth: number;
  unitNumber: string;
  tenantName: string;
  isEstimated: true;
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

export default function MoveSettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const settlementId = params.id as string;

  const [invoiceData, setInvoiceData] = useState<SettlementInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('payment');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/move-settlements/${settlementId}/invoice`);

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch settlement invoice');
        }

        const data = await response.json();
        setInvoiceData(data);
      } catch (err) {
        console.error('Error fetching settlement invoice:', err);
        setError('이사정산 청구서를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (settlementId && session) {
      fetchInvoiceData();
    }
  }, [settlementId, session, router]);

  const handlePrint = () => {
    window.print();
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
    const accountText = `${invoiceData.paymentInfo.bankName} ${invoiceData.paymentInfo.accountNumber} ${invoiceData.paymentInfo.accountHolder}`;
    navigator.clipboard.writeText(accountText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '납부완료';
      case 'overdue':
        return '연체';
      default:
        return '미납';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-amber-600 bg-amber-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">청구서를 불러오는 중...</p>
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
          <Link
            href="/my/move-settlements"
            className="mt-4 inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return <div className="p-6">데이터가 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <Link
                href="/my/move-settlements"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {invoiceData.billYear}년 {invoiceData.billMonth}월 이사정산 청구서
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  사용기간: {formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)}
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm sm:text-base"
            >
              <PrinterIcon className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
              인쇄
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 추정 청구서 배너 */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 flex items-center space-x-3">
          <ExclamationCircleIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">추정 청구서</p>
            <p className="text-xs text-amber-700 mt-0.5">
              이 청구서는 과거 사용 데이터를 기반으로 추정한 금액입니다. 실제 청구 금액과 차이가 있을 수 있습니다.
            </p>
          </div>
        </div>

        {/* 호실 정보 카드 */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 sm:p-6 text-white mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-3xl sm:text-4xl font-bold">{invoiceData.unitNumber}호</span>
                <span className="text-lg sm:text-xl">{invoiceData.tenantName}</span>
              </div>
              <p className="text-amber-100 text-sm sm:text-base">
                {invoiceData.billYear}년 {invoiceData.billMonth}월 이사정산분
              </p>
            </div>
            <div className="text-left sm:text-right mt-4 sm:mt-0">
              <p className="text-xs sm:text-sm text-amber-100">추정 청구액</p>
              <p className="text-3xl sm:text-4xl font-bold">
                {formatCurrency(invoiceData.currentCharges.total)}원
              </p>
            </div>
          </div>
        </div>

        {/* 요약 정보 카드 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* 사용량 */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500">사용량</span>
              <BoltIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{invoiceData.meterReading.usage}</span>
              <span className="text-xs sm:text-sm text-gray-500">kWh</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              전체 대비 {(invoiceData.usageRate * 100).toFixed(2)}%
            </p>
          </div>

          {/* 추정 금액 */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500">추정 금액</span>
              <CurrencyDollarIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-600">{formatCurrency(invoiceData.currentCharges.total)}</span>
              <span className="text-xs sm:text-sm text-gray-500">원</span>
            </div>
          </div>

          {/* 평균 사용량 기준 */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500">평균 사용량</span>
              <CalculatorIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{formatCurrency(invoiceData.estimationBasis.avgTotalUsage)}</span>
              <span className="text-xs sm:text-sm text-gray-500">kWh</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {invoiceData.estimationBasis.baseMonths.length}개월 기준
            </p>
          </div>

          {/* 납부 상태 */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500">납부 상태</span>
              <CreditCardIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
            </div>
            <span className={`inline-block px-2 py-1 rounded-full text-xs sm:text-sm font-semibold ${getPaymentStatusColor(invoiceData.paymentStatus)}`}>
              {getPaymentStatusText(invoiceData.paymentStatus)}
            </span>
          </div>
        </div>

        {/* 상세 정보 탭 */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* 탭 헤더 */}
          <div className="border-b overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'payment'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <CreditCardIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                  <span>납부 정보</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('charges')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'charges'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <CurrencyDollarIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                  <span>요금 상세</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('meter')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'meter'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <BoltIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                  <span>검침 정보</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('basis')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'basis'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <CalculatorIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                  <span>추정 기준</span>
                </div>
              </button>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-4 sm:p-6">
            {/* 납부 정보 탭 */}
            {activeTab === 'payment' && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">납부 정보</h3>

                <div className="mb-6">
                  <h4 className="text-sm sm:text-md font-medium text-gray-700 mb-3">입금 계좌</h4>
                  <div className="bg-amber-50 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-3 sm:mb-0">
                        <p className="text-xs sm:text-sm text-amber-600 mb-1">입금 계좌번호</p>
                        <p className="text-lg sm:text-xl font-bold text-amber-900">
                          {invoiceData.paymentInfo.bankName} {invoiceData.paymentInfo.accountNumber}
                        </p>
                        <p className="text-xs sm:text-sm text-amber-600 mt-1">예금주: {invoiceData.paymentInfo.accountHolder}</p>
                      </div>
                      <button
                        onClick={copyAccountNumber}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center text-sm"
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                            계좌 복사
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm sm:text-md font-medium text-gray-700 mb-3">납부 상태</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500">상태</p>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${getPaymentStatusColor(invoiceData.paymentStatus)}`}>
                          {getPaymentStatusText(invoiceData.paymentStatus)}
                        </span>
                      </div>
                      {invoiceData.paymentInfo.dueDate && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500">납부 기한</p>
                          <p className="font-semibold text-sm sm:text-base text-gray-900 mt-1">
                            {formatDate(invoiceData.paymentInfo.dueDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm sm:text-md font-medium text-gray-700 mb-3">납부 안내</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-xs sm:text-sm text-gray-600">
                    <p>이 청구서는 과거 사용 데이터를 기반으로 추정한 금액입니다.</p>
                    <p>실제 청구 금액과 차이가 있을 수 있으며, 최종 금액은 추후 확정됩니다.</p>
                    <p>위 계좌로 입금하여 주시기 바랍니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 요금 상세 탭 */}
            {activeTab === 'charges' && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">요금 상세 내역</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">항목</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">기본요금</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.basicFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">전력량요금</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">기후환경요금</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.climateFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">연료비조정액</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.fuelFee)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">역률요금</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFactorFee)}원</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">전기요금계</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.subtotal)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">부가가치세</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.vat)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">전력기금</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.powerFund)}원</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">절사액</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right font-semibold text-gray-900">{formatCurrency(invoiceData.currentCharges.roundDown)}원</td>
                      </tr>
                      <tr className="bg-amber-50 font-bold">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">추정 청구금액</td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-right text-amber-600">{formatCurrency(invoiceData.currentCharges.total)}원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 검침 정보 탭 */}
            {activeTab === 'meter' && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">검침 정보</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">전월 지침</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{invoiceData.meterReading.previous}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">kWh</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">당월 지침</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{invoiceData.meterReading.current}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">kWh</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-amber-600 mb-2">사용량</p>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600">{invoiceData.meterReading.usage}</p>
                    <p className="text-xs sm:text-sm text-amber-600 mt-1">kWh</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-amber-800">
                    <span className="font-semibold">참고:</span> 이사정산 시 검침 데이터는 이사일 기준으로 측정된 값입니다.
                  </p>
                </div>
              </div>
            )}

            {/* 추정 기준 탭 */}
            {activeTab === 'basis' && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">추정 기준</h3>

                <div className="mb-6">
                  <h4 className="text-sm sm:text-md font-medium text-gray-700 mb-3">기준 월</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {invoiceData.estimationBasis.baseMonths.map((month, index) => (
                        <span
                          key={index}
                          className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs sm:text-sm font-medium"
                        >
                          {month.year}년 {month.month}월
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">평균 총 사용량</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatCurrency(invoiceData.estimationBasis.avgTotalUsage)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">kWh</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">평균 총 금액</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatCurrency(invoiceData.estimationBasis.avgTotalAmount)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">원</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-amber-600 mb-2">사용량 비율</p>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                      {(invoiceData.estimationBasis.usageRatio * 100).toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-amber-600 mt-1">%</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-amber-800">
                    <span className="font-semibold">산출 방식:</span> 기준 월의 평균 데이터를 바탕으로
                    호실 사용량 비율을 적용하여 각 요금 항목을 추정합니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
