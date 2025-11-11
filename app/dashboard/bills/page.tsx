'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  EyeIcon,
  PrinterIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface MonthlyBill {
  id: number;
  billYear: number;
  billMonth: number;
  totalAmount: number;
  totalUsage: number;
  unitCount: number;
  paidCount: number;
  createdAt: string;
}

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills');
      const data = await response.json();
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      // 샘플 데이터
      setBills([
        {
          id: 1,
          billYear: 2025,
          billMonth: 1,
          totalAmount: 5625260,
          totalUsage: 25231,
          unitCount: 58,
          paidCount: 53,
          createdAt: '2025-01-15T10:00:00Z',
        },
        {
          id: 2,
          billYear: 2024,
          billMonth: 12,
          totalAmount: 5234500,
          totalUsage: 23890,
          unitCount: 58,
          paidCount: 58,
          createdAt: '2024-12-15T10:00:00Z',
        },
        {
          id: 3,
          billYear: 2024,
          billMonth: 11,
          totalAmount: 4987300,
          totalUsage: 22340,
          unitCount: 58,
          paidCount: 58,
          createdAt: '2024-11-15T10:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async (billId: number) => {
    if (!confirm('청구서를 재계산하시겠습니까?')) return;

    try {
      const response = await fetch('/api/calculate/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId }),
      });

      if (response.ok) {
        toast.success('재계산이 완료되었습니다.');
        fetchBills();
      } else {
        toast.error('재계산 중 오류가 발생했습니다.');
      }
    } catch (error) {
      toast.error('재계산 중 오류가 발생했습니다.');
    }
  };

  const filteredBills = bills.filter(bill => {
    const searchString = `${bill.billYear}년 ${bill.billMonth}월`;
    return searchString.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">청구서 관리</h1>
          <p className="mt-1 text-sm text-gray-600">월별 전기료 청구서를 관리합니다</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            새 청구서 생성
          </Link>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="연월로 검색 (예: 2025년 1월)"
            className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 청구서 목록 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">청구서가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-600">새 청구서를 생성해주세요.</p>
            <div className="mt-6">
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                새 청구서 생성
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredBills.map((bill) => (
              <li key={bill.id}>
                <div
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/bills/${bill.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-10 w-10 text-gray-500 mr-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {bill.billYear}년 {bill.billMonth}월 청구서
                        </p>
                        <p className="text-sm text-gray-600">
                          총 {bill.totalAmount.toLocaleString()}원 • {bill.totalUsage.toLocaleString()} kWh
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {bill.paidCount}/{bill.unitCount} 호실 납부 완료
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecalculate(bill.id);
                        }}
                        className="p-2 text-gray-500 hover:text-green-600"
                        title="재계산"
                      >
                        <CalculatorIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/bills/${bill.id}/print`);
                        }}
                        className="p-2 text-gray-500 hover:text-purple-600"
                        title="출력"
                      >
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}