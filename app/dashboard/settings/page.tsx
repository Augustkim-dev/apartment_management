'use client';

import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="mt-1 text-sm text-gray-600">시스템 설정을 관리합니다</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">설정 페이지</h3>
          <p className="mt-1 text-sm text-gray-500">
            이 페이지는 Phase 5 (인증 시스템)에서 구현될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}