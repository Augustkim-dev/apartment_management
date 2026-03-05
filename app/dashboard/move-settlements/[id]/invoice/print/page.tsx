'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PrinterIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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

export default function MoveSettlementInvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const settlementId = params.id as string;

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/move-settlements/${settlementId}/invoice`);
        if (!res.ok) {
          throw new Error('청구서 데이터를 불러올 수 없습니다.');
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

  const formatCurrency = (amount: number) => {
    return Math.floor(amount).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{error || '데이터를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* 화면용 헤더 (인쇄 시 숨김) */}
      <div className="no-print bg-white shadow-sm mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold">
                {invoiceData.unitNumber}호 이사정산 추정 청구서 (인쇄)
              </h1>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              인쇄
            </button>
          </div>
        </div>
      </div>

      {/* 청구서 본문 (A4 가로) */}
      <div className="invoice-container bg-white mx-auto p-6 print:p-4 relative" style={{ maxWidth: '297mm' }}>

        {/* 추정 스탬프 */}
        <div className="absolute top-8 right-12 print:top-6 print:right-8 rotate-[-15deg] border-4 border-amber-500 rounded-lg px-4 py-1 opacity-60">
          <span className="text-amber-500 font-bold text-2xl print:text-xl tracking-widest">추 정</span>
        </div>

        {/* 제목 */}
        <div className="text-center mb-4 print:mb-3">
          <h1 className="text-xl font-bold print:text-base">
            아르노빌리지 전기요금 이사정산 추정 청구서
          </h1>
          <p className="text-lg font-semibold text-gray-700 mt-1 print:text-sm">
            {invoiceData.billYear}년 {invoiceData.billMonth}월 이사정산 추정 청구서
          </p>
        </div>

        {/* 기본 정보 */}
        <div className="flex justify-between items-start mb-4 print:mb-3">
          <div className="space-y-0.5 text-sm print:text-xs">
            <div className="flex">
              <span className="font-semibold w-20">청구 호수:</span>
              <span className="text-lg font-bold text-blue-600 print:text-sm">{invoiceData.unitNumber}호</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-20">입주자명:</span>
              <span className="font-semibold">{invoiceData.tenantName}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-20">정산일:</span>
              <span>{formatDate(invoiceData.settlementDate)}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-20">청구 금액:</span>
              <span className="text-lg font-bold text-red-600 print:text-sm">{formatCurrency(invoiceData.currentCharges.total)}원</span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-300 rounded px-3 py-1.5 print:px-2 print:py-1">
            <span className="text-amber-700 text-xs font-semibold">추정 청구서</span>
          </div>
        </div>

        {/* 2단 레이아웃 */}
        <div className="flex gap-6 print:gap-4">

          {/* 좌측: 요금 상세 + 검침 정보 */}
          <div className="flex-1">

            {/* 요금 상세 테이블 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 요금 상세</h3>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs">항목</th>
                    <th className="border border-gray-300 px-2 py-1 text-right text-xs">금액 (원)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">기본요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.basicFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">전력량요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">기후환경요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.climateFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">연료비조정액</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.fuelFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">역률요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFactorFee)}</td>
                  </tr>
                  <tr className="bg-gray-50 print:bg-white">
                    <td className="border border-gray-300 px-2 py-0.5 font-semibold">전기요금계</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right font-semibold">{formatCurrency(invoiceData.currentCharges.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">부가가치세</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.vat)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">전력기금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFund)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">절사</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.roundDown)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-2 py-1 font-bold">청구금액 합계</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-blue-600">{formatCurrency(invoiceData.currentCharges.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 검침 정보 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">
                ◎ 검침 정보 ({formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)})
              </h3>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-xs">전월 지침 (kWh)</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">당월 지침 (kWh)</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">사용량 (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {invoiceData.meterReading.previous.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {invoiceData.meterReading.current.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold text-blue-600">
                      {invoiceData.meterReading.usage.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-1 text-xs text-gray-500 print:text-xs">
                사용 비율: {(invoiceData.usageRate * 100).toFixed(3)}%
              </div>
            </div>

          </div>

          {/* 우측: 추정 기준 + 납부 안내 */}
          <div className="flex-1">

            {/* 추정 기준 정보 */}
            <div className="bg-amber-50 print:bg-white border border-amber-200 rounded p-3 mb-4 print:mb-2 print:p-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1 text-amber-800">◎ 추정 기준 정보</h3>
              <div className="space-y-1 text-sm print:text-xs">
                <div className="flex">
                  <span className="w-28 text-gray-600">기준 월:</span>
                  <span className="font-medium">
                    {invoiceData.estimationBasis.baseMonths
                      .map(m => `${m.year}년 ${m.month}월`)
                      .join(', ')}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-600">평균 사용량:</span>
                  <span className="font-medium">{invoiceData.estimationBasis.avgTotalUsage.toLocaleString()} kWh</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-600">평균 요금:</span>
                  <span className="font-medium">{formatCurrency(invoiceData.estimationBasis.avgTotalAmount)}원</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-600">사용 비율:</span>
                  <span className="font-medium">{(invoiceData.estimationBasis.usageRatio * 100).toFixed(3)}%</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-amber-100 print:bg-gray-100 rounded text-xs text-amber-700 print:text-gray-600">
                직전 {invoiceData.estimationBasis.baseMonths.length}개월 평균 데이터를 기반으로 추정한 금액입니다.
              </div>
            </div>

            {/* 납부 안내 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 납부 안내</h3>
              <div className="border border-gray-300 rounded p-3 print:p-2">
                <div className="space-y-1.5 text-sm print:text-xs">
                  <div className="flex">
                    <span className="font-semibold w-20">입금 은행:</span>
                    <span>{invoiceData.paymentInfo.bankName}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-20">계좌 번호:</span>
                    <span className="font-mono font-semibold text-blue-600">{invoiceData.paymentInfo.accountNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-20">예금주:</span>
                    <span>{invoiceData.paymentInfo.accountHolder}</span>
                  </div>
                  {invoiceData.paymentInfo.dueDate && (
                    <div className="flex">
                      <span className="font-semibold w-20">납기일:</span>
                      <span className="font-semibold text-red-600">{formatDate(invoiceData.paymentInfo.dueDate)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 p-2 bg-blue-50 print:bg-gray-50 rounded text-xs">
                  <p>입금 시 <strong>호수/입주자명</strong>을 반드시 입력해 주세요.</p>
                </div>
              </div>
            </div>

            {/* 안내사항 */}
            <div className="border border-gray-300 rounded p-3 bg-yellow-50 print:bg-white print:p-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 안내사항</h3>
              <ul className="space-y-1 text-xs print:space-y-0.5">
                <li>• 본 청구서는 이사정산용 추정 청구서입니다.</li>
                <li>• 실제 정산 금액은 월말 한전 고지서 확인 후 확정됩니다.</li>
                <li>• 문의: 관리사무소</li>
              </ul>
            </div>

          </div>
        </div>

        {/* 하단 안내 문구 */}
        <div className="mt-4 pt-3 border-t border-gray-200 print:mt-2 print:pt-2">
          <p className="text-xs text-gray-500 text-center print:text-xs">
            본 청구서는 직전 {invoiceData.estimationBasis.baseMonths.length}개월 평균 데이터 기반 추정입니다. 실제 금액과 차이가 있을 수 있습니다.
          </p>
        </div>

      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .invoice-container {
            margin: 0;
            padding: 10mm;
            box-shadow: none;
            max-width: 100% !important;
            width: 100%;
          }

          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}