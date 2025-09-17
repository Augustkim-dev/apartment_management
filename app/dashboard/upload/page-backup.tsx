'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon, DocumentTextIcon, TableCellsIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// 동적 임포트로 PdfUploader 로드 (클라이언트 사이드에서만)
const PdfUploader = dynamic(() => import('@/components/PdfUploader'), { ssr: false });

interface PdfData {
  totalAmount: number;
  totalUsage: number;
  basicFee?: number;
  powerFee?: number;
  climateFee?: number;
  fuelFee?: number;
  powerFactorFee?: number;
  vat?: number;
  powerFund?: number;
  billYear?: number;
  billMonth?: number;
}

interface ExcelData {
  unitNumber: string;
  usage: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [excelData, setExcelData] = useState<ExcelData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const handlePdfUpload = async (data: any) => {
    setPdfData(data);

    // 파싱된 데이터는 이미 메모리에 있으므로 DB 저장은 선택사항
    // test-upload 페이지처럼 별도 DB 저장 없이 메모리 데이터를 사용
    console.log('PDF data parsed:', data);
    toast.success('PDF 파싱 완료');

    setStep(2);
  };

  const processExcelFile = async (file: File) => {
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Excel 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    console.log('Excel file selected:', file.name);
    setIsUploadingExcel(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse/excel', {
        method: 'POST',
        body: formData,
      });

      console.log('Excel API response status:', response.status);
      const result = await response.json();
      console.log('Excel API result:', result);

      if (result.success && result.data) {
        setExcelData(result.data);
        setExcelFile(file);
        toast.success(`Excel 파싱 완료: ${result.data.length}개 호실`);
        setStep(3);
      } else {
        toast.error(result.error || 'Excel 파싱 실패');
        console.error('Excel parsing failed:', result);
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      toast.error('Excel 파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processExcelFile(file);
    }
  };

  const handleExcelDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processExcelFile(file);
    }
  };

  const handleProcess = async () => {
    if (!pdfData || !excelData) {
      toast.error('PDF와 Excel 파일을 모두 업로드해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      // 계산 API 호출
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfData: pdfData,
          excelData: excelData,
          pdfTotalUsage: pdfData.totalUsage,
          validationMode: 'unit-only',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 청구서 생성 API 호출
        const billResponse = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billYear: pdfData.billYear || new Date().getFullYear(),
            billMonth: pdfData.billMonth || new Date().getMonth() + 1,
            totalAmount: pdfData.totalAmount,
            totalUsage: pdfData.totalUsage,
            basicFee: pdfData.basicFee || 0,
            powerFee: pdfData.powerFee || 0,
            climateFee: pdfData.climateFee || 0,
            fuelFee: pdfData.fuelFee || 0,
            powerFactorFee: pdfData.powerFactorFee || 0,
            vat: pdfData.vat || 0,
            powerFund: pdfData.powerFund || 0,
          }),
        });

        const billResult = await billResponse.json();

        if (billResult.success) {
          toast.success('청구서가 생성되었습니다.');
          router.push(`/dashboard/bills/${billResult.billId || ''}`);
        } else {
          toast.error('청구서 생성 중 오류가 발생했습니다.');
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

  const resetUpload = () => {
    setStep(1);
    setPdfData(null);
    setExcelData(null);
    setExcelFile(null);
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
              {step > 1 ? <CheckCircleIcon className="h-6 w-6" /> : '1'}
            </div>
            <span className="ml-2 font-medium">PDF 업로드</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              {step > 2 ? <CheckCircleIcon className="h-6 w-6" /> : '2'}
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
          {!pdfData ? (
            <PdfUploader onPdfParsed={handlePdfUpload} />
          ) : (
            <div className="bg-green-50 border-2 border-green-200 border-dashed rounded-lg p-6">
              <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-center text-sm font-medium text-green-800 mb-2">PDF 파싱 완료</p>
              <div className="space-y-1 text-sm text-green-700">
                <p>✓ 청구연월: {pdfData.billYear}년 {pdfData.billMonth}월</p>
                <p>✓ 총 청구액: {pdfData.totalAmount?.toLocaleString()}원</p>
                <p>✓ 총 사용량: {pdfData.totalUsage?.toLocaleString()} kWh</p>
                {pdfData.basicFee && <p>✓ 기본료: {pdfData.basicFee.toLocaleString()}원</p>}
                {pdfData.powerFee && <p>✓ 전력량요금: {pdfData.powerFee.toLocaleString()}원</p>}
              </div>
              <button
                onClick={() => {
                  setPdfData(null);
                  setStep(1);
                }}
                className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-700"
              >
                다시 업로드
              </button>
            </div>
          )}
        </div>

        {/* Excel 업로드 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <TableCellsIcon className="inline h-5 w-5 mr-2" />
            2. 호실별 사용량 Excel
          </h3>
          {!excelData ? (
            <div className={`${step < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
              {isUploadingExcel ? (
                <div className="border-2 border-blue-300 border-dashed rounded-lg p-6 text-center bg-blue-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-blue-600">Excel 파일 처리 중...</p>
                </div>
              ) : (
                <label className="block">
                  <div
                    className="border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer"
                    onDrop={handleExcelDrop}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      클릭하여 Excel 파일을 선택하거나<br />
                      여기에 파일을 드래그하세요
                    </p>
                    <p className="text-xs text-gray-500 mt-1">.xlsx, .xls</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    disabled={step < 2 || isUploadingExcel}
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 border-dashed rounded-lg p-6">
              <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-center text-sm font-medium text-green-800 mb-2">Excel 파싱 완료</p>
              <div className="space-y-1 text-sm text-green-700">
                <p>✓ 파일명: {excelFile?.name}</p>
                <p>✓ 총 {excelData.length}개 호실 데이터 확인</p>
                <p>✓ 총 사용량: {excelData.reduce((sum, u) => sum + u.usage, 0).toLocaleString()} kWh</p>
              </div>
              <button
                onClick={() => {
                  setExcelData(null);
                  setExcelFile(null);
                  setStep(2);
                }}
                className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-700"
              >
                다시 업로드
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 처리 버튼 */}
      {pdfData && excelData && (
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">3. 데이터 확인</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">PDF 총 사용량:</p>
                <p className="font-semibold">{pdfData.totalUsage.toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-gray-600">Excel 호실 합계:</p>
                <p className="font-semibold">
                  {excelData.reduce((sum, u) => sum + u.usage, 0).toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-gray-600">공용 사용량 (추정):</p>
                <p className="font-semibold">
                  {(pdfData.totalUsage - excelData.reduce((sum, u) => sum + u.usage, 0)).toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-gray-600">호실 수:</p>
                <p className="font-semibold">{excelData.length}개</p>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={resetUpload}
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