'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface StatsData {
  yearlyTrend: Array<{
    month: string;
    usage: number;
    amount: number;
  }>;
  unitComparison: Array<{
    unitNumber: string;
    usage: number;
    avgUsage: number;
  }>;
  usageDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  paymentStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStats();
  }, [selectedYear]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/stats?year=${selectedYear}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // 샘플 데이터
      setStats({
        yearlyTrend: [
          { month: '1월', usage: 21500, amount: 4832000 },
          { month: '2월', usage: 22100, amount: 4976000 },
          { month: '3월', usage: 20800, amount: 4680000 },
          { month: '4월', usage: 19500, amount: 4387500 },
          { month: '5월', usage: 18900, amount: 4252500 },
          { month: '6월', usage: 21200, amount: 4770000 },
          { month: '7월', usage: 25231, amount: 5625260 },
          { month: '8월', usage: 26500, amount: 5912500 },
          { month: '9월', usage: 24300, amount: 5418000 },
          { month: '10월', usage: 22150, amount: 4938750 },
          { month: '11월', usage: 22340, amount: 4987300 },
          { month: '12월', usage: 23890, amount: 5234500 },
        ],
        unitComparison: [
          { unitNumber: '201호', usage: 208.6, avgUsage: 350 },
          { unitNumber: '202호', usage: 312.4, avgUsage: 350 },
          { unitNumber: '301호', usage: 425.8, avgUsage: 350 },
          { unitNumber: '413호', usage: 720.5, avgUsage: 350 },
          { unitNumber: '415호', usage: 575.9, avgUsage: 350 },
          { unitNumber: '502호', usage: 456.3, avgUsage: 350 },
          { unitNumber: '603호', usage: 412.7, avgUsage: 350 },
          { unitNumber: '701호', usage: 289.5, avgUsage: 350 },
        ],
        usageDistribution: [
          { range: '0-200 kWh', count: 8, percentage: 13.8 },
          { range: '200-400 kWh', count: 25, percentage: 43.1 },
          { range: '400-600 kWh', count: 20, percentage: 34.5 },
          { range: '600+ kWh', count: 5, percentage: 8.6 },
        ],
        paymentStatus: [
          { status: '완납', count: 53, percentage: 91.4 },
          { status: '미납', count: 5, percentage: 8.6 },
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

  return (
    <div>
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">통계</h1>
            <p className="mt-1 text-sm text-gray-600">전기 사용량 및 납부 현황 통계</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value={2025}>2025년</option>
              <option value={2024}>2024년</option>
              <option value={2023}>2023년</option>
            </select>
          </div>
        </div>
      </div>

      {/* 연간 추이 차트 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">연간 사용량 추이</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats?.yearlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="usage" stroke="#3B82F6" name="사용량 (kWh)" />
            <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#10B981" name="금액 (원)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 호실별 비교 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">호실별 사용량 비교 (평균 대비)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.unitComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="unitNumber" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="usage" fill="#3B82F6" name="실제 사용량" />
              <Bar dataKey="avgUsage" fill="#E5E7EB" name="평균 사용량" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 사용량 분포 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">사용량 분포</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.usageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, percentage }) => `${range} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats?.usageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 납부 현황 */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">납부 현황</h3>
        <div className="grid grid-cols-2 gap-4">
          {stats?.paymentStatus.map((status, index) => (
            <div key={status.status} className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                index === 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className={`text-2xl font-bold ${
                  index === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.count}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{status.status}</p>
              <p className="text-xs text-gray-500">{status.percentage}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-500">평균 월 사용량</p>
          <p className="text-xl font-semibold text-gray-900">
            {(stats?.yearlyTrend.reduce((sum, m) => sum + m.usage, 0) / stats?.yearlyTrend.length || 0).toFixed(0)} kWh
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-500">평균 월 청구액</p>
          <p className="text-xl font-semibold text-gray-900">
            {((stats?.yearlyTrend.reduce((sum, m) => sum + m.amount, 0) / stats?.yearlyTrend.length || 0)).toLocaleString()}원
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-500">최대 사용 월</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats?.yearlyTrend.reduce((max, m) => m.usage > max.usage ? m : max, stats.yearlyTrend[0])?.month || '-'}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-500">최소 사용 월</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats?.yearlyTrend.reduce((min, m) => m.usage < min.usage ? m : min, stats.yearlyTrend[0])?.month || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}