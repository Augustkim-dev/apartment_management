import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            아르노빌리지 전기료 관리 시스템
          </h1>
          <p className="text-xl text-gray-600">
            효율적인 전기료 분배 및 관리를 위한 통합 솔루션
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">시스템 특징</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">자동 PDF 파싱</h3>
                  <p className="text-gray-600 text-sm">한전 청구서 PDF를 자동으로 분석하여 데이터 추출</p>
                </div>
              </div>
              <div className="flex items-start">
                <ChartBarIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">정확한 비례 배분</h3>
                  <p className="text-gray-600 text-sm">호실별 사용량에 따른 공정한 요금 계산</p>
                </div>
              </div>
              <div className="flex items-start">
                <BuildingOfficeIcon className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">호실 관리</h3>
                  <p className="text-gray-600 text-sm">60개 호실의 입주 현황 및 납부 상태 관리</p>
                </div>
              </div>
              <div className="flex items-start">
                <CurrencyDollarIcon className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">실시간 통계</h3>
                  <p className="text-gray-600 text-sm">월별 사용량 추이 및 납부 현황 대시보드</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              대시보드 시작하기
              <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/test-upload" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <DocumentTextIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">파일 업로드 테스트</p>
            </Link>
            <Link href="/test-calculation" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <ChartBarIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">계산 엔진 테스트</p>
            </Link>
            <Link href="/api/test-db" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <CurrencyDollarIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">DB 연결 테스트</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
