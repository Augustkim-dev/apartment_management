'use client';

import { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Unit {
  id: number;
  unitNumber: string;
  tenantName: string;
  contact: string;
  email: string;
  status: 'occupied' | 'vacant';
  unpaidAmount: number;
  lastPaymentDate: string | null;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units');
      const data = await response.json();
      setUnits(data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
      // 샘플 데이터
      setUnits([
        {
          id: 1,
          unitNumber: '201호',
          tenantName: '김철수',
          contact: '010-1234-5678',
          email: 'kim@example.com',
          status: 'occupied',
          unpaidAmount: 0,
          lastPaymentDate: '2025-01-10',
        },
        {
          id: 2,
          unitNumber: '202호',
          tenantName: '이영희',
          contact: '010-2345-6789',
          email: 'lee@example.com',
          status: 'occupied',
          unpaidAmount: 45230,
          lastPaymentDate: '2024-12-15',
        },
        {
          id: 3,
          unitNumber: '203호',
          tenantName: '박민수',
          contact: '010-3456-7890',
          email: 'park@example.com',
          status: 'occupied',
          unpaidAmount: 0,
          lastPaymentDate: '2025-01-12',
        },
        {
          id: 4,
          unitNumber: '204호',
          tenantName: '',
          contact: '',
          email: '',
          status: 'vacant',
          unpaidAmount: 0,
          lastPaymentDate: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unitNumber.includes(searchTerm) ||
                          unit.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || unit.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const occupiedCount = units.filter(u => u.status === 'occupied').length;
  const vacantCount = units.filter(u => u.status === 'vacant').length;
  const unpaidCount = units.filter(u => u.unpaidAmount > 0).length;

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
        <h1 className="text-2xl font-bold text-gray-900">호실 관리</h1>
        <p className="mt-1 text-sm text-gray-600">전체 호실 정보를 관리합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">입주</dt>
                  <dd className="text-lg font-semibold text-gray-900">{occupiedCount}호실</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">공실</dt>
                  <dd className="text-lg font-semibold text-gray-900">{vacantCount}호실</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">미납</dt>
                  <dd className="text-lg font-semibold text-gray-900">{unpaidCount}호실</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="호실번호 또는 입주자명으로 검색"
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilterStatus('occupied')}
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'occupied'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            입주
          </button>
          <button
            onClick={() => setFilterStatus('vacant')}
            className={`px-4 py-2 rounded-md ${
              filterStatus === 'vacant'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            공실
          </button>
        </div>
      </div>

      {/* 호실 목록 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredUnits.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">다른 검색어를 시도해보세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUnits.map((unit) => (
              <li key={unit.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className={`h-10 w-10 ${
                        unit.status === 'occupied' ? 'text-green-400' : 'text-gray-400'
                      } mr-4`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{unit.unitNumber}</p>
                        {unit.status === 'occupied' ? (
                          <>
                            <p className="text-sm text-gray-500">{unit.tenantName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {unit.contact && (
                                <span className="flex items-center text-xs text-gray-400">
                                  <PhoneIcon className="h-3 w-3 mr-1" />
                                  {unit.contact}
                                </span>
                              )}
                              {unit.email && (
                                <span className="flex items-center text-xs text-gray-400">
                                  <EnvelopeIcon className="h-3 w-3 mr-1" />
                                  {unit.email}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">공실</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {unit.unpaidAmount > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-red-600">
                            미납: {unit.unpaidAmount.toLocaleString()}원
                          </p>
                          <p className="text-xs text-gray-500">
                            마지막 납부: {unit.lastPaymentDate || '없음'}
                          </p>
                        </div>
                      ) : unit.status === 'occupied' ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">완납</p>
                          <p className="text-xs text-gray-500">
                            마지막 납부: {unit.lastPaymentDate || '없음'}
                          </p>
                        </div>
                      ) : null}
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