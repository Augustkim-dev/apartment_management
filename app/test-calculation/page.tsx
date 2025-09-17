'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';

// 클라이언트 사이드에서만 로드
const PdfUploader = dynamic(() => import('@/components/PdfUploader'), {
  ssr: false,
  loading: () => <div>Loading PDF uploader...</div>
});

export default function TestCalculationPage() {
  const [pdfData, setPdfData] = useState<any>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'sample' | 'upload'>('upload');

  // 샘플 PDF 데이터 로드
  const loadSamplePdfData = () => {
    const sampleData = {
      basicFee: 1397760,
      powerFee: 3238894,
      climateFee: 227079,
      fuelFee: 126155,
      powerFactorFee: -13977,
      vat: 497591,
      powerFund: 151760,
      roundDown: -2,
      totalAmount: 5625260,
      totalUsage: 25231,  // PDF의 전체 사용량 (공용 포함)
      billingPeriod: {
        year: 2025,
        month: 7
      }
    };
    setPdfData(sampleData);
  };

  // Excel 파일 업로드 처리
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // 첫 번째 행이 합계인 경우 제외
      const filtered = jsonData.slice(1).filter((row: any) =>
        row['호'] && row['전기사용량']
      );

      setExcelData(filtered);
    };
    reader.readAsArrayBuffer(file);
  };

  // 계산 실행
  const runCalculation = async () => {
    if (!pdfData || excelData.length === 0) {
      alert('PDF 데이터와 Excel 데이터를 먼저 로드하세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData,
          excelData,
          billingPeriod: '2025-6-10 ~ 2025-7-9',
          buildingName: '아르노빌리지',
          generateExcel: true
        }),
      });

      const data = await response.json();
      setResult(data);

      // Excel 파일 다운로드
      if (data.excelFile) {
        const blob = new Blob(
          [Buffer.from(data.excelFile, 'base64')],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `계산결과_${Date.now()}.xlsx`;
        a.click();
      }
    } catch (error) {
      console.error('Calculation error:', error);
      alert('계산 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">전기료 계산 엔진 테스트</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PDF 데이터 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">PDF 데이터 (총 청구 정보)</h2>

          {/* 업로드 모드 선택 */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setUploadMode('upload')}
              className={`px-4 py-2 rounded ${
                uploadMode === 'upload'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              PDF 업로드
            </button>
            <button
              onClick={() => setUploadMode('sample')}
              className={`px-4 py-2 rounded ${
                uploadMode === 'sample'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              샘플 데이터
            </button>
          </div>

          {/* PDF 업로드 또는 샘플 데이터 */}
          {uploadMode === 'upload' ? (
            <PdfUploader onPdfParsed={setPdfData} />
          ) : (
            <button
              onClick={loadSamplePdfData}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              샘플 데이터 로드
            </button>
          )}

          {pdfData && (
            <div className="mt-4 bg-gray-50 p-4 rounded space-y-2">
              <p className="font-bold text-blue-600">총 사용량: {pdfData.totalUsage?.toLocaleString()} kWh (공용 포함)</p>
              <p>기본료: {pdfData.basicFee?.toLocaleString()}원</p>
              <p>전력량요금: {pdfData.powerFee?.toLocaleString()}원</p>
              <p>기후환경요금: {pdfData.climateFee?.toLocaleString()}원</p>
              <p>연료비조정액: {pdfData.fuelFee?.toLocaleString()}원</p>
              <p>역률요금: {pdfData.powerFactorFee?.toLocaleString()}원</p>
              <p>부가세: {pdfData.vat?.toLocaleString()}원</p>
              <p>전력기금: {pdfData.powerFund?.toLocaleString()}원</p>
              <p className="font-bold text-lg">
                총액: {pdfData.totalAmount?.toLocaleString()}원
              </p>
            </div>
          )}
        </div>

        {/* Excel 데이터 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Excel 데이터 (호실별 사용량)</h2>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="mb-4"
          />

          {excelData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded">
              <p>총 호실 수: {excelData.length}개</p>
              <p>총 사용량: {
                excelData.reduce((sum, row) =>
                  sum + (Number(row['전기사용량']) || 0), 0
                ).toFixed(1)
              } kWh</p>

              <div className="mt-4 max-h-48 overflow-y-auto">
                {excelData.slice(0, 5).map((row, i) => (
                  <div key={i} className="text-sm py-1">
                    {row['호']}호: {row['전기사용량']} kWh
                  </div>
                ))}
                {excelData.length > 5 && <p className="text-sm text-gray-500">...</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계산 버튼 */}
      <div className="mt-8 text-center">
        <button
          onClick={runCalculation}
          disabled={loading || !pdfData || excelData.length === 0}
          className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? '계산 중...' : '계산 실행'}
        </button>
      </div>

      {/* 계산 결과 */}
      {result && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">계산 결과</h2>

          {result.summary && (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {result.summary}
            </pre>
          )}

          {result.result?.unitBills && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">상위 5개 호실</h3>
              <div className="space-y-2">
                {result.result.unitBills
                  .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
                  .slice(0, 5)
                  .map((bill: any, i: number) => (
                    <div key={i} className="flex justify-between bg-gray-50 p-2 rounded">
                      <span>{bill.unitNumber}호</span>
                      <span>{bill.usage} kWh</span>
                      <span className="font-semibold">
                        {bill.totalAmount.toLocaleString()}원
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.result?.validation && (
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">검증 결과</h3>
              <p>원본 총액: {result.result.validation.originalTotal.toLocaleString()}원</p>
              <p>계산 총액: {result.result.validation.calculatedTotal.toLocaleString()}원</p>
              <p>차액: {result.result.validation.difference}원</p>
              <p className={result.result.validation.isValid ? 'text-green-600' : 'text-red-600'}>
                {result.result.validation.isValid ? '✅ 검증 통과' : '❌ 검증 실패'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}