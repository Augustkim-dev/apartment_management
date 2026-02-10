'use client';

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// 호실 목록 (2층~4층, 각 16실)
const UNIT_NUMBERS = [
  '201','202','203','204','205','206','207','208',
  '209','210','211','212','213','214','215','216',
  '301','302','303','304','305','306','307','308',
  '309','310','311','312','313','314','315','316',
  '401','402','403','404','405','406','407','408',
  '409','410','411','412','413','414','415','416',
];

const FLOORS = [
  { label: '2층', units: UNIT_NUMBERS.filter(u => u.startsWith('2')) },
  { label: '3층', units: UNIT_NUMBERS.filter(u => u.startsWith('3')) },
  { label: '4층', units: UNIT_NUMBERS.filter(u => u.startsWith('4')) },
];

type TabType = 'pdf' | 'excel';

interface PdfFormData {
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalUsage: string;
  basicFee: string;
  powerFee: string;
  climateFee: string;
  fuelFee: string;
  powerFactorFee: string;
  vat: string;
  powerFund: string;
  tvLicenseFee: string;
  roundDown: string;
  totalAmount: string;
  contractType: string;
  contractPower: string;
}

const emptyPdfForm: PdfFormData = {
  billingPeriodStart: '',
  billingPeriodEnd: '',
  totalUsage: '',
  basicFee: '',
  powerFee: '',
  climateFee: '',
  fuelFee: '',
  powerFactorFee: '',
  vat: '',
  powerFund: '',
  tvLicenseFee: '',
  roundDown: '',
  totalAmount: '',
  contractType: '',
  contractPower: '',
};

export default function DataEntryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pdf');

  // 공통 상태
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // PDF 탭 상태
  const [pdfForm, setPdfForm] = useState<PdfFormData>(emptyPdfForm);
  const [pdfEditId, setPdfEditId] = useState<number | null>(null);

  // Excel 탭 상태
  const [unitUsages, setUnitUsages] = useState<Record<string, string>>(
    () => Object.fromEntries(UNIT_NUMBERS.map(u => [u, '']))
  );
  const [excelEditId, setExcelEditId] = useState<number | null>(null);

  // PDF 자동 합계 계산
  const calculatedTotal = useMemo(() => {
    const fields = [
      'basicFee', 'powerFee', 'climateFee', 'fuelFee', 'powerFactorFee',
      'vat', 'powerFund', 'tvLicenseFee', 'roundDown',
    ] as const;
    return fields.reduce((sum, key) => sum + (Number(pdfForm[key]) || 0), 0);
  }, [pdfForm]);

  // Excel 합계/평균 계산
  const excelSummary = useMemo(() => {
    const values = Object.values(unitUsages).map(v => Number(v) || 0);
    const filled = values.filter(v => v > 0);
    const totalUsage = values.reduce((s, v) => s + v, 0);
    return {
      totalUnits: filled.length,
      totalUsage: Math.round(totalUsage * 100) / 100,
      averageUsage: filled.length > 0
        ? Math.round((totalUsage / filled.length) * 100) / 100
        : 0,
    };
  }, [unitUsages]);

  // 연/월 변경 시 날짜 자동 설정
  const updateBillingPeriod = useCallback((year: number, month: number) => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setPdfForm(prev => ({
      ...prev,
      billingPeriodStart: start,
      billingPeriodEnd: end,
    }));
  }, []);

  // 기존 데이터 불러오기
  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pdf') {
        const res = await fetch(
          `/api/parsed-pdf-data?year=${selectedYear}&month=${selectedMonth}`
        );
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          setPdfForm({
            billingPeriodStart: d.billing_period_start
              ? new Date(d.billing_period_start).toISOString().split('T')[0]
              : '',
            billingPeriodEnd: d.billing_period_end
              ? new Date(d.billing_period_end).toISOString().split('T')[0]
              : '',
            totalUsage: String(d.total_usage || ''),
            basicFee: String(d.basic_fee || ''),
            powerFee: String(d.power_fee || ''),
            climateFee: String(d.climate_fee || ''),
            fuelFee: String(d.fuel_fee || ''),
            powerFactorFee: String(d.power_factor_fee || ''),
            vat: String(d.vat || ''),
            powerFund: String(d.power_fund || ''),
            tvLicenseFee: String(d.tv_license_fee || ''),
            roundDown: String(d.round_down || ''),
            totalAmount: String(d.total_amount || ''),
            contractType: d.contract_type || '',
            contractPower: String(d.contract_power || ''),
          });
          setPdfEditId(d.id);
          toast.success(`${selectedYear}년 ${selectedMonth}월 데이터를 불러왔습니다. (ID: ${d.id})`);
        } else {
          toast('해당 월의 데이터가 없습니다. 신규 입력 모드입니다.', { icon: 'ℹ️' });
          resetPdfForm();
          updateBillingPeriod(selectedYear, selectedMonth);
        }
      } else {
        const res = await fetch(
          `/api/parsed-excel-data?year=${selectedYear}&month=${selectedMonth}`
        );
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          const newUsages: Record<string, string> = {};
          UNIT_NUMBERS.forEach(u => { newUsages[u] = ''; });
          if (Array.isArray(d.unit_data)) {
            d.unit_data.forEach((item: any) => {
              if (item.unitNumber && UNIT_NUMBERS.includes(item.unitNumber)) {
                newUsages[item.unitNumber] = String(item.usage || '');
              }
            });
          }
          setUnitUsages(newUsages);
          setExcelEditId(d.id);
          toast.success(`${selectedYear}년 ${selectedMonth}월 데이터를 불러왔습니다. (ID: ${d.id})`);
        } else {
          toast('해당 월의 데이터가 없습니다. 신규 입력 모드입니다.', { icon: 'ℹ️' });
          resetExcelForm();
        }
      }
    } catch (error) {
      toast.error('데이터 조회 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPdfForm = () => {
    setPdfForm(emptyPdfForm);
    setPdfEditId(null);
  };

  const resetExcelForm = () => {
    setUnitUsages(Object.fromEntries(UNIT_NUMBERS.map(u => [u, ''])));
    setExcelEditId(null);
  };

  // PDF 데이터 저장
  const savePdfData = async () => {
    if (!pdfForm.totalUsage || !pdfForm.totalAmount) {
      toast.error('총 사용량과 총 청구액은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        year: selectedYear,
        month: selectedMonth,
        billingPeriodStart: pdfForm.billingPeriodStart || null,
        billingPeriodEnd: pdfForm.billingPeriodEnd || null,
        totalUsage: Number(pdfForm.totalUsage) || 0,
        basicFee: Number(pdfForm.basicFee) || 0,
        powerFee: Number(pdfForm.powerFee) || 0,
        climateFee: Number(pdfForm.climateFee) || 0,
        fuelFee: Number(pdfForm.fuelFee) || 0,
        powerFactorFee: Number(pdfForm.powerFactorFee) || 0,
        vat: Number(pdfForm.vat) || 0,
        powerFund: Number(pdfForm.powerFund) || 0,
        tvLicenseFee: Number(pdfForm.tvLicenseFee) || 0,
        roundDown: Number(pdfForm.roundDown) || 0,
        totalAmount: Number(pdfForm.totalAmount) || 0,
        contractType: pdfForm.contractType || null,
        contractPower: pdfForm.contractPower ? Number(pdfForm.contractPower) : null,
      };

      let res;
      if (pdfEditId) {
        res = await fetch(`/api/parsed-pdf-data/${pdfEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/parsed-pdf-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        if (result.id) setPdfEditId(result.id);
      } else {
        toast.error(result.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      toast.error('서버 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Excel 데이터 저장
  const saveExcelData = async () => {
    const filledCount = Object.values(unitUsages).filter(v => Number(v) > 0).length;
    if (filledCount === 0) {
      toast.error('최소 1개 호실의 사용량을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const unitData = UNIT_NUMBERS.map(unitNumber => ({
        unitNumber,
        previousReading: 0,
        currentReading: 0,
        usage: Number(unitUsages[unitNumber]) || 0,
      }));

      const payload = {
        year: selectedYear,
        month: selectedMonth,
        unitData,
      };

      let res;
      if (excelEditId) {
        res = await fetch(`/api/parsed-excel-data/${excelEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/parsed-excel-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        if (result.id) setExcelEditId(result.id);
      } else {
        toast.error(result.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      toast.error('서버 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfChange = (field: keyof PdfFormData, value: string) => {
    setPdfForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUnitUsageChange = (unitNumber: string, value: string) => {
    setUnitUsages(prev => ({ ...prev, [unitNumber]: value }));
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <PencilSquareIcon className="inline h-7 w-7 mr-2 -mt-1" />
          수동 데이터 입력
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          한전 청구서와 호실별 사용량 데이터를 수동으로 입력하거나 기존 데이터를 수정합니다
        </p>
      </div>

      {/* 연/월 선택 + 불러오기 */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadExistingData}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
            )}
            기존 데이터 불러오기
          </button>
          <div className="ml-auto">
            {activeTab === 'pdf' ? (
              pdfEditId ? (
                <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  수정 모드 (ID: {pdfEditId})
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  신규 입력
                </span>
              )
            ) : (
              excelEditId ? (
                <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  수정 모드 (ID: {excelEditId})
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  신규 입력
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'pdf'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            한전 청구서 데이터
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'excel'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TableCellsIcon className="h-5 w-5 mr-2" />
            호실별 사용량 데이터
          </button>
        </nav>
      </div>

      {/* 한전 청구서 폼 */}
      {activeTab === 'pdf' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* 청구 기간 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">청구 기간</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={pdfForm.billingPeriodStart}
                  onChange={(e) => handlePdfChange('billingPeriodStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={pdfForm.billingPeriodEnd}
                  onChange={(e) => handlePdfChange('billingPeriodEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 사용량 정보 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">사용량 정보</h3>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">총 사용량 (kWh)</label>
              <input
                type="number"
                step="0.01"
                value={pdfForm.totalUsage}
                onChange={(e) => handlePdfChange('totalUsage', e.target.value)}
                placeholder="예: 25231"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 요금 상세 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">요금 상세</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'basicFee' as const, label: '기본요금' },
                { key: 'powerFee' as const, label: '전력량요금' },
                { key: 'climateFee' as const, label: '기후환경요금' },
                { key: 'fuelFee' as const, label: '연료비조정액' },
                { key: 'powerFactorFee' as const, label: '역률요금' },
                { key: 'vat' as const, label: '부가가치세' },
                { key: 'powerFund' as const, label: '전력산업기반기금' },
                { key: 'tvLicenseFee' as const, label: 'TV수신료' },
                { key: 'roundDown' as const, label: '원단위절사' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={pdfForm[key]}
                      onChange={(e) => handlePdfChange(key, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-gray-400">원</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 합계 영역 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">자동 합계 (요금 항목 합)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {calculatedTotal.toLocaleString()} 원
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    총 청구액 (한전 실제 청구액)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={pdfForm.totalAmount}
                      onChange={(e) => handlePdfChange('totalAmount', e.target.value)}
                      placeholder="자동 합계와 다를 수 있습니다"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-8 text-lg font-semibold"
                    />
                    <span className="absolute right-3 top-3 text-sm text-gray-400">원</span>
                  </div>
                  {pdfForm.totalAmount && calculatedTotal !== Number(pdfForm.totalAmount) && (
                    <p className="mt-1 text-xs text-yellow-600">
                      자동 합계와 {Math.abs(calculatedTotal - Number(pdfForm.totalAmount)).toLocaleString()}원 차이가 있습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 계약 정보 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">계약 정보 (선택)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계약종별</label>
                <input
                  type="text"
                  value={pdfForm.contractType}
                  onChange={(e) => handlePdfChange('contractType', e.target.value)}
                  placeholder="예: 일반용(을)고압A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계약전력 (kW)</label>
                <input
                  type="number"
                  value={pdfForm.contractPower}
                  onChange={(e) => handlePdfChange('contractPower', e.target.value)}
                  placeholder="예: 700"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 저장/초기화 버튼 */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={resetPdfForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              onClick={savePdfData}
              disabled={isSaving}
              className="flex-1 max-w-xs inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : pdfEditId ? (
                '수정 저장'
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 호실별 사용량 폼 */}
      {activeTab === 'excel' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">호실별 사용량 입력</h3>

          {/* 3열 레이아웃 (층별) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FLOORS.map(floor => (
              <div key={floor.label}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 bg-gray-100 px-3 py-2 rounded">
                  {floor.label}
                </h4>
                <div className="space-y-2">
                  {floor.units.map(unitNumber => (
                    <div key={unitNumber} className="flex items-center gap-2">
                      <label className="w-12 text-sm font-medium text-gray-600 text-right">
                        {unitNumber}
                      </label>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          value={unitUsages[unitNumber]}
                          onChange={(e) => handleUnitUsageChange(unitNumber, e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">kWh</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 합계 요약 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">입력 호실</p>
                <p className="text-xl font-bold text-blue-700">
                  {excelSummary.totalUnits}개
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">총 사용량</p>
                <p className="text-xl font-bold text-green-700">
                  {excelSummary.totalUsage.toLocaleString()} kWh
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">평균 사용량</p>
                <p className="text-xl font-bold text-purple-700">
                  {excelSummary.averageUsage.toLocaleString()} kWh
                </p>
              </div>
            </div>
          </div>

          {/* 저장/초기화 버튼 */}
          <div className="flex gap-4 pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={resetExcelForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              onClick={saveExcelData}
              disabled={isSaving}
              className="flex-1 max-w-xs inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : excelEditId ? (
                '수정 저장'
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
