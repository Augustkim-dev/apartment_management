'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  type: 'pdf' | 'excel';
  onUploadSuccess: (data: any) => void;
  onReset?: () => void;
}

export function FileUpload({ type, onUploadSuccess, onReset }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 동일한 파일 재업로드 경고
    if (lastUploadedFile === file.name && uploadSuccess) {
      const confirmReupload = window.confirm(
        `이미 업로드한 파일 "${file.name}"을(를) 다시 업로드하시겠습니까?\n기존 데이터는 새로운 데이터로 대체됩니다.`
      );
      if (!confirmReupload) {
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }

    // 상태 초기화
    setError('');
    setWarnings([]);
    setFileName(file.name);
    setIsUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append(type, file);

    try {
      const response = await fetch(`/api/parse/${type}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadSuccess(true);
        setLastUploadedFile(file.name);
        onUploadSuccess(result);
        if (result.warnings) {
          setWarnings(result.warnings);
        }
        // 교체 메시지 추가
        if (result.isReplacement) {
          setWarnings(prev => [...(prev || []), '기존 데이터가 새로운 데이터로 교체되었습니다.']);
        }
      } else {
        setError(result.error);
        setUploadSuccess(false);
      }
    } catch (error) {
      setError('파일 업로드 중 오류가 발생했습니다.');
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    // 모든 상태 초기화
    setError('');
    setWarnings([]);
    setFileName('');
    setUploadSuccess(false);
    setIsUploading(false);
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // 부모 컴포넌트에 리셋 알림
    if (onReset) {
      onReset();
    }
  };

  const accept = type === 'pdf' ? '.pdf' : '.xlsx,.xls';
  const label = type === 'pdf' ? 'PDF 청구서' : 'Excel 사용량';

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-500"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-4">
          <label htmlFor={`file-upload-${type}`} className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              {label} 업로드
            </span>
            <input
              ref={fileInputRef}
              id={`file-upload-${type}`}
              name={`file-upload-${type}`}
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <span className="mt-1 block text-xs text-gray-600">
              {type === 'pdf' ? 'PDF 파일만' : 'Excel 파일만'} (최대 10MB)
            </span>
          </label>
        </div>

        {fileName && (
          <div className="mt-4">
            <div className="flex items-center justify-center">
              <svg
                className="h-5 w-5 text-gray-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h-.293a1 1 0 00-.707.293l-2 2a1 1 0 101.414 1.414l2-2A1 1 0 0012 5V3a1 1 0 10-2 0v2H8V3a1 1 0 10-2 0v2H4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-600">{fileName}</span>
            </div>
            {uploadSuccess && !isUploading && (
              <button
                onClick={handleReset}
                className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="h-3 w-3 mr-1"
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
                다시 업로드
              </button>
            )}
          </div>
        )}

        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">파일 처리 중...</p>
          </div>
        )}

        {uploadSuccess && !isUploading && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-green-800">업로드 성공!</p>
                <p className="text-xs text-green-600 mt-1">
                  파일을 다시 업로드하려면 "다시 업로드" 버튼을 클릭하세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                {!uploadSuccess && fileName && (
                  <button
                    onClick={handleReset}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    다른 파일 선택
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">경고</p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}