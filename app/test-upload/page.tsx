'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';

export default function TestUploadPage() {
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [excelResult, setExcelResult] = useState<any>(null);
  const [linkResult, setLinkResult] = useState<any>(null);

  const handlePdfUpload = (result: any) => {
    setPdfResult(result);
    setLinkResult(null); // 링크 결과 초기화
    console.log('PDF Upload Result:', result);
  };

  const handleExcelUpload = (result: any) => {
    setExcelResult(result);
    setLinkResult(null); // 링크 결과 초기화
    console.log('Excel Upload Result:', result);
  };

  const handlePdfReset = () => {
    setPdfResult(null);
    setLinkResult(null);
    console.log('PDF data reset');
  };

  const handleExcelReset = () => {
    setExcelResult(null);
    setLinkResult(null);
    console.log('Excel data reset');
  };

  const handleLink = async () => {
    if (!pdfResult?.pdfId || !excelResult?.excelId) {
      alert('먼저 PDF와 Excel 파일을 모두 업로드해주세요.');
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const response = await fetch('/api/parse/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: pdfResult.pdfId,
          excelId: excelResult.excelId,
          year,
          month,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLinkResult(result);
        alert(`월별 청구서가 생성되었습니다. ID: ${result.monthlyBillId}`);
      } else {
        alert(`오류: ${result.error}`);
      }
    } catch (error) {
      alert('연결 중 오류가 발생했습니다.');
    }
  };

  const handleResetAll = () => {
    setPdfResult(null);
    setExcelResult(null);
    setLinkResult(null);
    window.location.reload(); // 전체 페이지 새로고침으로 컴포넌트 상태 초기화
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            파일 업로드 테스트
          </h1>
          {(pdfResult || excelResult) && (
            <button
              onClick={handleResetAll}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              전체 초기화
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF 업로드 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">한전 청구서 (PDF)</h2>
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
                    <p>청구금액: {pdfResult.data.totalAmount?.toLocaleString()}원</p>
                    <p>총 사용량: {pdfResult.data.totalUsage?.toLocaleString()} kWh</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Excel 업로드 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">호실별 사용량 (Excel)</h2>
            <FileUpload 
              type="excel" 
              onUploadSuccess={handleExcelUpload}
              onReset={handleExcelReset}
            />
            {excelResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium text-green-800">
                  Excel 파싱 완료 (ID: {excelResult.excelId})
                </p>
                {excelResult.summary && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>총 호실 수: {excelResult.summary.totalUnits}개</p>
                    <p>총 사용량: {excelResult.summary.totalUsage?.toLocaleString()} kWh</p>
                    <p>평균 사용량: {excelResult.summary.averageUsage?.toFixed(2)} kWh</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 월별 청구서 연결 버튼 */}
        {pdfResult && excelResult && (
          <div className="mt-8 text-center">
            {!linkResult ? (
              <button
                onClick={handleLink}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                월별 청구서 생성
              </button>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md max-w-md mx-auto">
                <p className="text-sm font-medium text-blue-800">
                  ✅ 월별 청구서 생성 완료
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  청구서 ID: {linkResult.monthlyBillId}
                </p>
                <button
                  onClick={handleResetAll}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  새로운 파일 업로드
                </button>
              </div>
            )}
          </div>
        )}

        {/* 파싱 이력 조회 */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">파싱 이력 조회</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                const port = window.location.port || '3000';
                const response = await fetch(`/api/parse/history?type=pdf&limit=5`);
                const result = await response.json();
                console.log('PDF History:', result);
                if (result.data && result.data.length > 0) {
                  alert(`최근 PDF 파싱 이력:\n${result.data.map((item: any, idx: number) => 
                    `${idx + 1}. ${item.file_name} (ID: ${item.id})`
                  ).join('\n')}`);
                } else {
                  alert('PDF 파싱 이력이 없습니다.');
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              PDF 이력 조회
            </button>
            <button
              onClick={async () => {
                const response = await fetch(`/api/parse/history?type=excel&limit=5`);
                const result = await response.json();
                console.log('Excel History:', result);
                if (result.data && result.data.length > 0) {
                  alert(`최근 Excel 파싱 이력:\n${result.data.map((item: any, idx: number) => 
                    `${idx + 1}. ${item.file_name} (ID: ${item.id})`
                  ).join('\n')}`);
                } else {
                  alert('Excel 파싱 이력이 없습니다.');
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Excel 이력 조회
            </button>
          </div>
        </div>

        {/* 사용 안내 */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 사용 안내</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• PDF와 Excel 파일을 각각 업로드하세요.</li>
            <li>• 업로드 성공 후 "다시 업로드" 버튼으로 파일을 변경할 수 있습니다.</li>
            <li>• 동일한 파일을 다시 업로드하면 경고 메시지가 표시됩니다.</li>
            <li>• 두 파일 모두 업로드 후 "월별 청구서 생성"으로 데이터를 연결합니다.</li>
            <li>• "전체 초기화" 버튼으로 모든 데이터를 초기화할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}