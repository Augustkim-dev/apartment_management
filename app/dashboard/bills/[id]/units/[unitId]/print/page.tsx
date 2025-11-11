'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PrinterIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface UnitInvoiceData {
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
}

// 더미 데이터 생성 함수
function generateInvoiceData(unitNumber: string): UnitInvoiceData {
  const usage = Math.floor(Math.random() * 100) + 100; // 100-200 kwh
  const usageRate = usage / 25231; // 전체 사용량 대비 비율

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
  };
}

export default function UnitInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  const unitId = params.unitId as string;

  const [invoiceData, setInvoiceData] = useState<UnitInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 실제로는 API에서 데이터를 가져오겠지만, 현재는 더미 데이터 사용
    const dummyData = generateInvoiceData(unitId);
    setInvoiceData(dummyData);
    setLoading(false);
  }, [unitId]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading || !invoiceData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                {invoiceData.unitNumber}호 고지서
              </h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                인쇄
              </button>
              <button
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                PDF 저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 고지서 본문 (A4 가로) */}
      <div className="invoice-container bg-white mx-auto p-6 print:p-4" style={{ maxWidth: '297mm' }}>

        {/* 제목 */}
        <h1 className="text-xl font-bold text-center mb-4 print:text-base print:mb-2">
          {invoiceData.billYear}년 {invoiceData.billMonth}월분 세대별 전기세 청구서
        </h1>

        {/* 2단 레이아웃 컨테이너 */}
        <div className="flex gap-6 print:gap-4">

          {/* 좌측 영역 */}
          <div className="flex-1">

            {/* 상단 정보 섹션 */}
            <div className="mb-4 print:mb-2">
              <div className="space-y-1 print:space-y-0.5">
                <div className="flex">
                  <span className="font-semibold w-20 text-sm print:text-xs">청구 호수:</span>
                  <span className="text-lg font-bold text-blue-600 print:text-sm">{invoiceData.unitNumber}호</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-20 text-sm print:text-xs">청구 금액:</span>
                  <span className="text-lg font-bold text-red-600 print:text-sm">{formatCurrency(invoiceData.currentCharges.total)}원</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-20 text-sm print:text-xs">미납 금액:</span>
                  <span className="font-semibold text-orange-600 print:text-xs">{formatCurrency(invoiceData.unpaidAmount)}원</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-20 text-sm print:text-xs">입금 계좌:</span>
                  <span className="text-sm print:text-xs">{invoiceData.paymentInfo.bankName} {invoiceData.paymentInfo.accountNumber}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-20 text-sm print:text-xs">납기일:</span>
                  <span className="font-semibold text-blue-600 text-sm print:text-xs">{formatDate(invoiceData.paymentInfo.dueDate)}</span>
                </div>
              </div>
            </div>

            {/* 당월/전월 요금 비교 테이블 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 요금 비교</h3>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs">항목</th>
                    <th className="border border-gray-300 px-2 py-1 text-right text-xs">금월</th>
                    <th className="border border-gray-300 px-2 py-1 text-right text-xs">전월</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">기본요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.basicFee)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.basicFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">전력량요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFee)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.powerFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">기후환경요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.climateFee)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.climateFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">연료비조정액</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.fuelFee)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.fuelFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">역률요금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFactorFee)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.powerFactorFee)}</td>
                  </tr>
                  <tr className="bg-gray-50 print:bg-white">
                    <td className="border border-gray-300 px-2 py-0.5 font-semibold">전기요금계</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right font-semibold">{formatCurrency(invoiceData.currentCharges.subtotal)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right font-semibold">{formatCurrency(invoiceData.previousCharges.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">부가가치세</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.vat)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.vat)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-0.5">전력기금</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.currentCharges.powerFund)}</td>
                    <td className="border border-gray-300 px-2 py-0.5 text-right">{formatCurrency(invoiceData.previousCharges.powerFund)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-2 py-1 font-bold">당월요금계</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-blue-600">{formatCurrency(invoiceData.currentCharges.total)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">{formatCurrency(invoiceData.previousCharges.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 고객확인사항 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">
                ◎ 고객확인사항 ({formatDate(invoiceData.billingPeriod.start)} ~ {formatDate(invoiceData.billingPeriod.end)})
              </h3>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-xs">전월 지침 (kwh)</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">당월 지침 (kwh)</th>
                    <th className="border border-gray-300 px-2 py-1 text-xs">사용량 (kwh)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {invoiceData.meterReading.previous}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {invoiceData.meterReading.current}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold text-blue-600">
                      {invoiceData.meterReading.usage}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* 우측 영역 */}
          <div className="flex-1">

            {/* 한전 계약 사항 */}
            <div className="bg-gray-50 print:bg-white p-3 rounded mb-4 print:mb-2 print:p-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 한전 계약 사항</h3>
              <div className="space-y-0.5 text-sm print:text-xs">
                <div className="flex">
                  <span className="w-24">계약 종별:</span>
                  <span>{invoiceData.contractInfo.contractType}</span>
                </div>
                <div className="flex">
                  <span className="w-24">계약 전력:</span>
                  <span>{invoiceData.contractInfo.contractPower}kw</span>
                </div>
                <div className="flex">
                  <span className="w-24">요금적용 전력:</span>
                  <span>{invoiceData.contractInfo.appliedPower}kw</span>
                </div>
                <div className="flex">
                  <span className="w-24">기본료:</span>
                  <span>1kw당 {formatCurrency(invoiceData.contractInfo.basicFeeRate)}원</span>
                </div>
              </div>
            </div>

            {/* 한전 고지 내역 (건물 전체) */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">
                ◎ 한전 고지 내역 (건물 전체)
              </h3>
              <div className="bg-gray-50 print:bg-white p-2 rounded mb-2 print:mb-1">
                <div className="flex justify-between text-sm print:text-xs">
                  <div>
                    <span className="font-semibold">청구 금액:</span>
                    <span className="ml-1 font-bold">{formatCurrency(invoiceData.buildingTotal.totalAmount)}원</span>
                  </div>
                  <div>
                    <span className="font-semibold">총사용량:</span>
                    <span className="ml-1 font-bold">{formatCurrency(invoiceData.buildingTotal.totalUsage)}kwh</span>
                  </div>
                </div>
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100 w-1/3">기본료</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.basicFee)}</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100 w-1/3">전력량요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.powerFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">기후환경요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.climateFee)}</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">연료비조정액</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.fuelFee)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">역률요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.powerFactorFee)}</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">전력기금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(invoiceData.buildingTotal.powerFund)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 기준 금액 */}
            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">
                ◎ 기준 금액 (사용 비율: {(invoiceData.usageRate * 100).toFixed(3)}%)
              </h3>
              <div className="bg-blue-50 p-2 rounded text-xs mb-2 print:mb-1 print:p-1">
                호실별 요금 = 건물 전체 요금 × 사용 비율
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm print:text-xs">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100 w-1/3">기본료</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{invoiceData.unitBaseFee}</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100 w-1/3">전력량요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">128.4</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">기후환경요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">9.0</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">연료비조정액</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">5.0</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">역률요금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">-0.6</td>
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100">전력기금</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">6.0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 안내사항 */}
            <div className="border border-gray-300 rounded p-3 bg-yellow-50 print:p-2">
              <h3 className="font-semibold mb-2 text-sm print:text-xs print:mb-1">◎ 안내사항</h3>
              <ul className="space-y-1 text-xs print:text-xs print:space-y-0.5">
                {invoiceData.unpaidDetails.length > 0 && (
                  <li className="text-red-600">
                    • {invoiceData.unpaidDetails.map(d => `${d.month} ${formatCurrency(d.amount)}원`).join(', ')} 미납
                  </li>
                )}
                <li>• 전기세 입금시 입금자/호수 입력 필수</li>
                <li>• 문의: 관리사무소 02-XXX-XXXX</li>
                <li>• 납기일 경과시 연체료 부과</li>
              </ul>
            </div>

          </div>
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