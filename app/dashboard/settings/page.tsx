'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<{ [category: string]: Config }>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      setMessage('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category: string) => {
    setSaving(true);
    setMessage('');

    try {
      const categoryConfigs: { [key: string]: any } = {};

      // 카테고리별 설정값 수집
      Object.entries(configs[category] || {}).forEach(([key, value]) => {
        categoryConfigs[`${category}.${key}`] = value;
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
        setMessage('설정이 저장되었습니다.');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save configs:', error);
      setMessage('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleNoticesSave = async () => {
    setSaving(true);
    setMessage('');

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
        setMessage('납부 안내가 저장되었습니다.');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to save notices:', error);
      setMessage('납부 안내 저장에 실패했습니다.');
    } finally {
      setSaving(false);
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
      setMessage('설정을 내보냈습니다.');
    } catch (error) {
      console.error('Failed to export configs:', error);
      setMessage('설정 내보내기에 실패했습니다.');
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
        setMessage(`${data.count}개의 설정을 가져왔습니다.`);
        await fetchConfigs(); // 리로드
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to import configs:', error);
      setMessage('설정 가져오기에 실패했습니다.');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">설정을 불러오는 중...</div>
      </div>
    );
  }

  const tabs = [
    { name: '기본 정보', icon: BuildingOfficeIcon, category: ['building', 'contact'] },
    { name: '결제 정보', icon: CreditCardIcon, category: ['payment'] },
    { name: '요금 설정', icon: CurrencyDollarIcon, category: ['billing', 'contract'] },
    { name: '납부 안내', icon: DocumentTextIcon, category: ['notices'] },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">환경설정 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            시스템 전체 설정을 관리합니다.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            내보내기
          </button>
          <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
            <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
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

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.includes('실패') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          {message}
        </div>
      )}

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              <div className="flex items-center justify-center">
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {/* 기본 정보 탭 */}
          <Tab.Panel className="rounded-xl bg-white p-3">
            <div className="space-y-6">
              {/* 건물 정보 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">건물 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      건물명
                    </label>
                    <input
                      type="text"
                      value={configs.building?.name || ''}
                      onChange={(e) => updateConfigValue('building', 'name', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">연락처 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      관리사무소 전화번호
                    </label>
                    <input
                      type="text"
                      value={configs.contact?.management_phone || ''}
                      onChange={(e) => updateConfigValue('contact', 'management_phone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      관리사무소 이메일
                    </label>
                    <input
                      type="email"
                      value={configs.contact?.management_email || ''}
                      onChange={(e) => updateConfigValue('contact', 'management_email', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      비상 연락처
                    </label>
                    <input
                      type="text"
                      value={configs.contact?.emergency_phone || ''}
                      onChange={(e) => updateConfigValue('contact', 'emergency_phone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    handleSave('building');
                    handleSave('contact');
                  }}
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* 결제 정보 탭 */}
          <Tab.Panel className="rounded-xl bg-white p-3">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">주 계좌 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      은행명
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.bank_name || ''}
                      onChange={(e) => updateConfigValue('payment', 'bank_name', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">대체 계좌 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      은행명
                    </label>
                    <input
                      type="text"
                      value={configs.payment?.bank_name_alt || ''}
                      onChange={(e) => updateConfigValue('payment', 'bank_name_alt', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleSave('payment')}
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* 요금 설정 탭 */}
          <Tab.Panel className="rounded-xl bg-white p-3">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">계약 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      계약 종별
                    </label>
                    <input
                      type="text"
                      value={configs.contract?.type || ''}
                      onChange={(e) => updateConfigValue('contract', 'type', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">요금 정보</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      kW당 기본료
                    </label>
                    <input
                      type="number"
                      value={configs.billing?.basic_fee_rate || ''}
                      onChange={(e) => updateConfigValue('billing', 'basic_fee_rate', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    handleSave('billing');
                    handleSave('contract');
                  }}
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* 납부 안내 탭 */}
          <Tab.Panel className="rounded-xl bg-white p-3">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">납부 안내 문구</h3>
                <p className="text-sm text-gray-600 mb-4">
                  템플릿 변수: {'{관리사무소}'}, {'{납부일}'}, {'{연체시작일}'}, {'{검침시작}'}, {'{검침종료}'}, {'{건물명}'}
                </p>

                <div className="space-y-4">
                  {notices.map((notice, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <textarea
                          value={notice.text}
                          onChange={(e) => updateNotice(index, 'text', e.target.value)}
                          placeholder="안내 문구를 입력하세요"
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <select
                        value={notice.type}
                        onChange={(e) => updateNotice(index, 'type', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">활성</span>
                      </label>
                      <button
                        onClick={() => deleteNotice(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addNotice}
                  className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  안내 문구 추가
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNoticesSave}
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}