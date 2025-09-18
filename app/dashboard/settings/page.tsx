'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

interface Config {
  [key: string]: any;
}

interface Notice {
  order: number;
  text: string;
  type: 'info' | 'warning' | 'important';
  active: boolean;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<{ [category: string]: Config }>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        setConfigs(data.data);

        // 납부 안내 별도 처리
        if (data.data.notices && data.data.notices.payment_notices) {
          setNotices(data.data.notices.payment_notices);
        }
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      toast.error('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (categories: string[]) => {
    const sectionName = categories.join('-');
    setSavingSection(sectionName);

    try {
      const categoryConfigs: { [key: string]: any } = {};

      // 카테고리별 설정값 수집
      categories.forEach(category => {
        Object.entries(configs[category] || {}).forEach(([key, value]) => {
          categoryConfigs[`${category}.${key}`] = value;
        });
      });

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configs: categoryConfigs }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('설정이 저장되었습니다.');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save configs:', error);
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleNoticesSave = async () => {
    setSavingSection('notices');

    try {
      const response = await fetch('/api/admin/settings/notices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notices }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('납부 안내가 저장되었습니다.');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save notices:', error);
      toast.error('납부 안내 저장에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/settings/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('설정을 내보냈습니다.');
    } catch (error) {
      console.error('Failed to export configs:', error);
      toast.error('설정 내보내기에 실패했습니다.');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/settings/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.count}개의 설정을 가져왔습니다.`);
        await fetchConfigs(); // 리로드
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to import configs:', error);
      toast.error('설정 가져오기에 실패했습니다.');
    }
  };

  const updateConfigValue = (category: string, key: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const addNotice = () => {
    setNotices(prev => [...prev, {
      order: prev.length + 1,
      text: '',
      type: 'info',
      active: true
    }]);
  };

  const updateNotice = (index: number, field: keyof Notice, value: any) => {
    setNotices(prev => prev.map((notice, i) =>
      i === index ? { ...notice, [field]: value } : notice
    ));
  };

  const deleteNotice = (index: number) => {
    setNotices(prev => prev.filter((_, i) => i !== index).map((notice, i) => ({
      ...notice,
      order: i + 1
    })));
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'important':
        return <BellAlertIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />

      {/* 페이지 헤더 */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환경설정 관리</h1>
          <p className="mt-1 text-sm text-gray-600">시스템 전체 설정을 관리합니다</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            내보내기
          </button>
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            가져오기
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 카드 기반 섹션들 */}
      <div className="space-y-6">

        {/* 기본 정보 카드 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-6">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">기본 정보</h2>
            </div>

            <div className="space-y-6">
              {/* 건물 정보 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">건물 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      건물명
                    </label>
                    <input
                      type="text"
                      value={configs.building?.name || ''}
                      onChange={(e) => updateConfigValue('building', 'name', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      건물 유형
                    </label>
                    <input
                      type="text"
                      value={configs.building?.type || ''}
                      onChange={(e) => updateConfigValue('building', 'type', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      총 호실 수
                    </label>
                    <input
                      type="number"
                      value={configs.building?.unit_count || ''}
                      onChange={(e) => updateConfigValue('building', 'unit_count', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      기본 총 사용량(kWh)
                    </label>
                    <input
                      type="number"
                      value={configs.building?.total_usage_default || ''}
                      onChange={(e) => updateConfigValue('building', 'total_usage_default', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">연락처 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <PhoneIcon className="inline h-4 w-4 mr-1 text-gray-400" />
                      관리사무소 전화번호
                    </label>
                    <input
                      type="text"
                      value={configs.contact?.management_phone || ''}
                      onChange={(e) => updateConfigValue('contact', 'management_phone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <EnvelopeIcon className="inline h-4 w-4 mr-1 text-gray-400" />
                      관리사무소 이메일
                    </label>
                    <input
                      type="email"
                      value={configs.contact?.management_email || ''}
                      onChange={(e) => updateConfigValue('contact', 'management_email', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <PhoneIcon className="inline h-4 w-4 mr-1 text-gray-400" />
                      비상 연락처
                    </label>
                    <input
                      type="text"
                      value={configs.contact?.emergency_phone || ''}
                      onChange={(e) => updateConfigValue('contact', 'emergency_phone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleSave(['building', 'contact'])}
                disabled={savingSection === 'building-contact'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingSection === 'building-contact' ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>

        {/* 결제 정보 카드 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-6">
              <CreditCardIcon className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">결제 정보</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">주 계좌 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      은행명
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.bank_name || ''}
                      onChange={(e) => updateConfigValue('payment', 'bank_name', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      계좌번호
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.account_number || ''}
                      onChange={(e) => updateConfigValue('payment', 'account_number', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      예금주
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.account_holder || ''}
                      onChange={(e) => updateConfigValue('payment', 'account_holder', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">대체 계좌 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      은행명
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.bank_name_alt || ''}
                      onChange={(e) => updateConfigValue('payment', 'bank_name_alt', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      계좌번호
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.account_number_alt || ''}
                      onChange={(e) => updateConfigValue('payment', 'account_number_alt', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      예금주
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.account_holder_alt || ''}
                      onChange={(e) => updateConfigValue('payment', 'account_holder_alt', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleSave(['payment'])}
                disabled={savingSection === 'payment'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingSection === 'payment' ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>

        {/* 요금 설정 카드 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-6">
              <CurrencyDollarIcon className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">요금 설정</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">계약 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      계약 종별
                    </label>
                    <input
                      type="text"
                      value={configs.contract?.type || ''}
                      onChange={(e) => updateConfigValue('contract', 'type', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      계약 전력(kW)
                    </label>
                    <input
                      type="number"
                      value={configs.contract?.power || ''}
                      onChange={(e) => updateConfigValue('contract', 'power', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      요금적용 전력(kW)
                    </label>
                    <input
                      type="number"
                      value={configs.contract?.applied_power || ''}
                      onChange={(e) => updateConfigValue('contract', 'applied_power', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">요금 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      kW당 기본료
                    </label>
                    <input
                      type="number"
                      value={configs.billing?.basic_fee_rate || ''}
                      onChange={(e) => updateConfigValue('billing', 'basic_fee_rate', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      연체료율(%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={configs.billing?.late_fee_rate || ''}
                      onChange={(e) => updateConfigValue('billing', 'late_fee_rate', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      납부 기한일
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={configs.billing?.payment_due_day || ''}
                      onChange={(e) => updateConfigValue('billing', 'payment_due_day', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      검침 시작일
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={configs.billing?.meter_reading_start || ''}
                      onChange={(e) => updateConfigValue('billing', 'meter_reading_start', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      검침 종료일
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={configs.billing?.meter_reading_end || ''}
                      onChange={(e) => updateConfigValue('billing', 'meter_reading_end', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      연체료 부과 시작일
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={configs.billing?.late_fee_start_day || ''}
                      onChange={(e) => updateConfigValue('billing', 'late_fee_start_day', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleSave(['billing', 'contract'])}
                disabled={savingSection === 'billing-contract'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingSection === 'billing-contract' ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>

        {/* 납부 안내 카드 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
                <h2 className="text-lg font-medium text-gray-900">납부 안내</h2>
              </div>
              <button
                onClick={addNotice}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                안내 추가
              </button>
            </div>

            {/* 템플릿 변수 안내 */}
            <div className="bg-gray-50 rounded-md p-3 mb-6">
              <p className="text-sm text-gray-600">
                <InformationCircleIcon className="inline h-4 w-4 mr-1" />
                <span className="font-medium">템플릿 변수:</span>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{관리사무소}'}</code>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{납부일}'}</code>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{연체시작일}'}</code>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{검침시작}'}</code>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{검침종료}'}</code>
                <code className="mx-1 px-2 py-1 bg-gray-200 rounded text-xs">{'{건물명}'}</code>
              </p>
            </div>

            {/* 납부 안내 목록 */}
            {notices.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">등록된 납부 안내가 없습니다.</p>
                <p className="mt-1 text-sm text-gray-500">새로운 안내를 추가해주세요.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {notices.map((notice, index) => (
                    <li key={index} className="py-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getNoticeIcon(notice.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={notice.text}
                            onChange={(e) => updateNotice(index, 'text', e.target.value)}
                            placeholder="안내 문구를 입력하세요"
                            rows={2}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={notice.type}
                            onChange={(e) => updateNotice(index, 'type', e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          >
                            <option value="info">정보</option>
                            <option value="warning">경고</option>
                            <option value="important">중요</option>
                          </select>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={notice.active}
                              onChange={(e) => updateNotice(index, 'active', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">활성</span>
                          </label>
                          <button
                            onClick={() => deleteNotice(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="삭제"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNoticesSave}
                disabled={savingSection === 'notices'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {savingSection === 'notices' ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}