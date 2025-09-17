'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  currentMonth: {
    totalAmount: number;
    totalUsage: number;
    unitCount: number;
    unpaidCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    amount: number;
    usage: number;
  }>;
  topUsageUnits: Array<{
    unitNumber: string;
    usage: number;
    amount: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // 샘플 데이터 표시 (API 구현 전)
      setStats({
        currentMonth: {
          totalAmount: 5625260,
          totalUsage: 25231,
          unitCount: 58,
          unpaidCount: 5,
        },
        monthlyTrend: [
          { month: '2024-10', amount: 4532100, usage: 20150 },
          { month: '2024-11', amount: 4987300, usage: 22340 },
          { month: '2024-12', amount: 5234500, usage: 23890 },
          { month: '2025-01', amount: 5625260, usage: 25231 },
        ],
        topUsageUnits: [
          { unitNumber: '413호', usage: 720.5, amount: 160660 },
          { unitNumber: '415호', usage: 575.9, amount: 128420 },
          { unitNumber: '502호', usage: 456.3, amount: 101780 },
          { unitNumber: '603호', usage: 412.7, amount: 92040 },
          { unitNumber: '201호', usage: 208.6, amount: 46510 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: '이번 달 총 청구액',
      value: `${stats?.currentMonth.totalAmount.toLocaleString()}원`,
      icon: CurrencyDollarIcon,
      color: 'bg-blue-500',
    },
    {
      title: '총 사용량',
      value: `${stats?.currentMonth.totalUsage.toLocaleString()} kWh`,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
    },
    {
      title: '입주 호실',
      value: `${stats?.currentMonth.unitCount}개`,
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500',
    },
    {
      title: '미납 호실',
      value: `${stats?.currentMonth.unpaidCount}개`,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-600">
          {format(new Date(), 'yyyy년 MM월', { locale: ko })} 전기료 현황
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 차트 섹션 */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 월별 추이 차트 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">월별 청구액 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${value.toLocaleString()}원`} />
              <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 상위 사용 호실 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">사용량 상위 호실</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.topUsageUnits}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="unitNumber" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${value.toLocaleString()} kWh`} />
              <Bar dataKey="usage" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          <li className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">2025년 1월 청구서 생성</p>
                <p className="text-sm text-gray-500">관리자 • 2시간 전</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                완료
              </span>
            </div>
          </li>
          <li className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">203호 전기료 납부</p>
                <p className="text-sm text-gray-500">5시간 전</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                납부
              </span>
            </div>
          </li>
          <li className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">PDF 파일 업로드</p>
                <p className="text-sm text-gray-500">1일 전</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                업로드
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}