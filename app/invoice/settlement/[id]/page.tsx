'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  PrinterIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

interface InvoiceData {
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

export default function PublicSettlementInvoicePage() {
  const params = useParams();
  const settlementId = params.id as string;

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/move-settlements/${settlementId}/invoice`);
        if (!res.ok) {
          throw new Error('청구서를 찾을 수 없습니다.');
        }
        const data = await res.json();
        setInvoiceData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [settlementId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyAccount = async () => {
    if (!invoiceData) return;
    try {
      await navigator.clipboard.writeText(invoiceData.paymentInfo.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invoiceData.paymentInfo.accountNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return Math.floor(amount).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 text-sm">청구서를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">청구서 조회 실패</h2>
        <p className="text-gray-500 text-sm text-center">{error || '청구서 데이터를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const chargeItems = [
    { label: '기본요금', value: invoiceData.currentCharges.basicFee },
    { label: '전력량요금', value: invoiceData.currentCharges.powerFee },
    { label: '기후환경요금', value: invoiceData.currentCharges.climateFee },
    { label: '연료비조정액', value: invoiceData.currentCharges.fuelFee },
    { label: '역률요금', value: invoiceData.currentCharges.powerFactorFee },
    { label: '전기요금계', value: invoiceData.currentCharges.subtotal, isSub: true },
    { label: '부가가치세', value: invoiceData.currentCharges.vat },
    { label: '전력기금', value: invoiceData.currentCharges.powerFund },
    { label: '절사', value: invoiceData.currentCharges.roundDown },
    { label: '청구금액 합계', value: invoiceData.currentCharges.total, isTotal: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* 상단 헤더 */}
      <header className="bg-blue-900 text-white no-print">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-3">
          <BuildingOffice2Icon className="h-7 w-7 flex-shrink-0" />
          <h1 className="text-lg font-semibold">아르노빌리지 전기요금 관리</h1>
        </div>
      </header>

      {/* 추정 청구서 배너 */}
      <div className="bg-amber-500 text-white no-print">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold text-sm">이사정산 추정 청구서</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 print:px-0 print:py-2 print:max-w-none">

        {/* 인쇄용 헤더 (화면에서 숨김) */}
        <div className="hidden print:block mb-4">
          <h1 className="text-lg font-bold text-center">아르노빌리지 전기요금 이사정산 추정 청구서</h1>
          <p className="text-sm text-center text-gray-600 mt-1">
            {invoiceData.billYear}년 {invoiceData.billMonth}월
          </p>
        </div>

        {/* 호실/입주자 정보 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4 print:shadow-none print:border print:rounded-none print:p-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">청구 호실</p>
              <p className="text-2xl font-bold text-blue-600 print:text-lg">{invoiceData.unitNumber}호</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">입주자</p>
              <p className="text-lg font-semibold print:text-base">{invoiceData.tenantName}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-600">
            <span>정산일: {formatDate(invoiceData.settlementDate)}</span>
            <span>기간: {formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)}</span>
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 print:bg-white">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-700 font-medium">추정 청구 금액</span>
              <span className="text-xl font-bold text-red-600 print:text-lg">{formatCurrency(invoiceData.currentCharges.total)}원</span>
            </div>
          </div>
        </div>

        {/* 요금 상세 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 print:shadow-none print:border print:rounded-none">
          <div className="px-5 py-3 border-b border-gray-200 print:px-3 print:py-2">
            <h2 className="font-semibold text-gray-900 print:text-sm">요금 상세</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {chargeItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between px-5 py-2.5 print:px-3 print:py-1.5 ${
                  item.isTotal
                    ? 'bg-blue-50 print:bg-gray-50'
                    : item.isSub
                    ? 'bg-gray-50 print:bg-white'
                    : ''
                }`}
              >
                <span
                  className={`text-sm ${
                    item.isTotal
                      ? 'font-bold text-gray-900'
                      : item.isSub
                      ? 'font-semibold text-gray-700'
                      : 'text-gray-600'
                  } print:text-xs`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-sm font-mono ${
                    item.isTotal
                      ? 'font-bold text-blue-600'
                      : item.isSub
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-900'
                  } print:text-xs`}
                >
                  {formatCurrency(item.value)}원
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 검침 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 print:shadow-none print:border print:rounded-none">
          <div className="px-5 py-3 border-b border-gray-200 print:px-3 print:py-2">
            <h2 className="font-semibold text-gray-900 print:text-sm">검침 정보</h2>
          </div>
          <div className="p-5 print:p-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">전월 지침</p>
                <p className="text-lg font-semibold print:text-base">{invoiceData.meterReading.previous.toLocaleString()}</p>
                <p className="text-xs text-gray-400">kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">당월 지침</p>
                <p className="text-lg font-semibold print:text-base">{invoiceData.meterReading.current.toLocaleString()}</p>
                <p className="text-xs text-gray-400">kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">사용량</p>
                <p className="text-lg font-semibold text-blue-600 print:text-base">{invoiceData.meterReading.usage.toLocaleString()}</p>
                <p className="text-xs text-gray-400">kWh</p>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-gray-500">
              사용 비율: {(invoiceData.usageRate * 100).toFixed(3)}%
            </div>
          </div>
        </div>

        {/* 추정 기준 정보 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl mb-4 print:bg-white print:border-gray-200 print:rounded-none">
          <div className="px-5 py-3 border-b border-amber-200 print:border-gray-200 print:px-3 print:py-2">
            <h2 className="font-semibold text-amber-800 print:text-gray-900 print:text-sm">추정 기준</h2>
          </div>
          <div className="p-5 print:p-3 space-y-2 text-sm print:text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">기준 월</span>
              <span className="font-medium">
                {invoiceData.estimationBasis.baseMonths
                  .map(m => `${m.year}.${String(m.month).padStart(2, '0')}`)
                  .join(', ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">평균 사용량</span>
              <span className="font-medium">{invoiceData.estimationBasis.avgTotalUsage.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">평균 요금</span>
              <span className="font-medium">{formatCurrency(invoiceData.estimationBasis.avgTotalAmount)}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">사용 비율</span>
              <span className="font-medium">{(invoiceData.estimationBasis.usageRatio * 100).toFixed(3)}%</span>
            </div>
          </div>
        </div>

        {/* 납부 계좌 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 print:shadow-none print:border print:rounded-none">
          <div className="px-5 py-3 border-b border-gray-200 print:px-3 print:py-2">
            <h2 className="font-semibold text-gray-900 print:text-sm">납부 안내</h2>
          </div>
          <div className="p-5 print:p-3">
            <div className="space-y-2 text-sm print:text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">입금 은행</span>
                <span className="font-medium">{invoiceData.paymentInfo.bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">계좌 번호</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold text-blue-600">{invoiceData.paymentInfo.accountNumber}</span>
                  <button
                    onClick={handleCopyAccount}
                    className="no-print p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="계좌번호 복사"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {copied && (
                <div className="text-right no-print">
                  <span className="text-xs text-green-600 font-medium">복사되었습니다!</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">예금주</span>
                <span className="font-medium">{invoiceData.paymentInfo.accountHolder}</span>
              </div>
              {invoiceData.paymentInfo.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">납기일</span>
                  <span className="font-semibold text-red-600">{formatDate(invoiceData.paymentInfo.dueDate)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 print:bg-gray-50 print:text-gray-600">
              입금 시 <strong>호수/입주자명</strong>을 반드시 입력해 주세요.
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-500 text-center print:rounded-none print:mb-2">
          본 청구서는 직전 {invoiceData.estimationBasis.baseMonths.length}개월 평균 데이터 기반 추정입니다. 실제 금액과 차이가 있을 수 있습니다.
        </div>

        {/* 인쇄 버튼 (화면 전용) */}
        <div className="no-print pb-8">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            인쇄
          </button>
        </div>

      </main>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}