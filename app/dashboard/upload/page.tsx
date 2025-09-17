'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon, DocumentTextIcon, TableCellsIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { FileUpload } from '@/components/FileUpload';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [excelResult, setExcelResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePdfUpload = (result: any) => {
    setPdfResult(result);
    console.log('PDF Upload Result:', result);
    toast.success('PDF 파싱 완료');
    setStep(2);
  };

  const handleExcelUpload = (result: any) => {
    setExcelResult(result);
    console.log('Excel Upload Result:', result);
    toast.success(`Excel 파싱 완료: ${result.summary?.totalUnits || 0}개 호실`);
    setStep(3);
  };

  const handlePdfReset = () => {
    setPdfResult(null);
    setStep(1);
    console.log('PDF data reset');
  };

  const handleExcelReset = () => {
    setExcelResult(null);
    setStep(pdfResult ? 2 : 1);
    console.log('Excel data reset');
  };

  const handleProcess = async () => {
    if (!pdfResult?.data || !excelResult?.data) {
      toast.error('PDF와 Excel 파일을 모두 업로드해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. 먼저 월별 청구서 생성
      const billResponse = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billYear: pdfResult.data.billingPeriod?.year || pdfResult.data.billYear || new Date().getFullYear(),
          billMonth: pdfResult.data.billingPeriod?.month || pdfResult.data.billMonth || new Date().getMonth() + 1,
          totalAmount: pdfResult.data.totalAmount,
          totalUsage: pdfResult.data.totalUsage,
          basicFee: pdfResult.data.basicFee,
          powerFee: pdfResult.data.powerFee,
          climateFee: pdfResult.data.climateFee,
          fuelFee: pdfResult.data.fuelFee,
          vat: pdfResult.data.vat,
          powerFund: pdfResult.data.powerFund,
          tvLicenseFee: pdfResult.data.tvLicenseFee || 0,
          roundDown: pdfResult.data.roundDown || 0,
          billingPeriodStart: pdfResult.data.billingPeriod?.start,
          billingPeriodEnd: pdfResult.data.billingPeriod?.end,
        }),
      });

      const billResult = await billResponse.json();

      if (billResult.success) {
        // 2. 계산 API 호출 (monthlyBillId 포함)
        const response = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfData: pdfResult.data,
            excelData: excelResult.data,
            pdfTotalUsage: pdfResult.data.totalUsage,
            validationMode: 'unit-only',
            generateExcel: true,
            monthlyBillId: billResult.id, // 생성된 월별 청구서 ID 전달
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('계산 및 청구서 생성이 완료되었습니다.');

          // unit_bills 저장 결과 로그
          if (result.saveResult) {
            console.log(`${result.saveResult.savedCount}개 호실 청구서가 저장되었습니다.`);
          }

          // Excel 파일 다운로드 (있는 경우)
          if (result.excelFile) {
            const blob = new Blob(
              [Buffer.from(result.excelFile, 'base64')],
              { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `계산결과_${pdfResult.data.billingPeriod?.year || pdfResult.data.billYear}_${pdfResult.data.billingPeriod?.month || pdfResult.data.billMonth}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          }

          // 계산 결과 표시
          console.log('Calculation result:', result);
          console.log('Bill creation result:', billResult);

          // 대시보드로 이동
          setTimeout(() => {
            router.push('/dashboard/bills');
          }, 2000);
        } else {
          toast.error('청구서 생성 중 오류가 발생했습니다.');
          console.error('Bill creation error:', billResult);
        }
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setPdfResult(null);
    setExcelResult(null);
    setStep(1);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">데이터 업로드</h1>
        <p className="mt-1 text-sm text-gray-600">
          한전 청구서와 호실별 사용량 데이터를 업로드하여 청구서를 생성합니다
        </p>
      </div>

      {/* 진행 단계 표시 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              {pdfResult ? <CheckCircleIcon className="h-6 w-6" /> : '1'}
            </div>
            <span className="ml-2 font-medium">PDF 업로드</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              {excelResult ? <CheckCircleIcon className="h-6 w-6" /> : '2'}
            </div>
            <span className="ml-2 font-medium">Excel 업로드</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              {step > 3 ? <CheckCircleIcon className="h-6 w-6" /> : '3'}
            </div>
            <span className="ml-2 font-medium">확인 및 생성</span>
          </div>
        </div>
      </div>

      {/* 파일 업로드 영역 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* PDF 업로드 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <DocumentTextIcon className="inline h-5 w-5 mr-2" />
            1. 한전 청구서 PDF
          </h3>
          <FileUpload
            type="pdf"
            onUploadSuccess={handlePdfUpload}
            onReset={handlePdfReset}
          />
          {pdfResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800">
                PDF 파싱 완료 (ID: {pdfResult.pdfId})
              </p>
              {pdfResult.data && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>✓ 청구연월: {pdfResult.data.billingPeriod?.year || pdfResult.data.billYear}년 {pdfResult.data.billingPeriod?.month || pdfResult.data.billMonth}월</p>
                  <p>✓ 총 청구액: {pdfResult.data.totalAmount?.toLocaleString()}원</p>
                  <p>✓ 총 사용량: {pdfResult.data.totalUsage?.toLocaleString()} kWh</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Excel 업로드 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <TableCellsIcon className="inline h-5 w-5 mr-2" />
            2. 호실별 사용량 Excel
          </h3>
          <div className={`${step < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
            <FileUpload
              type="excel"
              onUploadSuccess={handleExcelUpload}
              onReset={handleExcelReset}
            />
          </div>
          {excelResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800">
                Excel 파싱 완료 (ID: {excelResult.excelId})
              </p>
              {excelResult.summary && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>✓ 총 호실 수: {excelResult.summary.totalUnits}개</p>
                  <p>✓ 총 사용량: {excelResult.summary.totalUsage?.toLocaleString()} kWh</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 처리 버튼 */}
      {pdfResult && excelResult && (
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">3. 데이터 확인</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">PDF 총 사용량:</p>
                <p className="font-semibold">{pdfResult.data?.totalUsage?.toLocaleString() || 0} kWh</p>
              </div>
              <div>
                <p className="text-gray-600">Excel 호실 합계:</p>
                <p className="font-semibold">
                  {excelResult.summary?.totalUsage?.toLocaleString() || 0} kWh
                </p>
              </div>
              <div>
                <p className="text-gray-600">공용 사용량 (추정):</p>
                <p className="font-semibold">
                  {((pdfResult.data?.totalUsage || 0) - (excelResult.summary?.totalUsage || 0)).toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-gray-600">호실 수:</p>
                <p className="font-semibold">{excelResult.summary?.totalUnits || 0}개</p>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={resetAll}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                다시 시작
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    처리 중...
                  </>
                ) : (
                  '청구서 생성'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}