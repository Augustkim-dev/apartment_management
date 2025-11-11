'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnitBillEditRequest, UnitBillEditData, EditMode } from '@/types/unit-bill-edit';

export default function UnitBillEditPage({
  params
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const router = useRouter();
  const [billId, setBillId] = useState('');
  const [unitId, setUnitId] = useState('');

  // State
  const [editMode, setEditMode] = useState<EditMode>('proportional');
  const [formData, setFormData] = useState<Partial<UnitBillEditRequest>>({
    editMode: 'proportional',
    editReason: ''
  });
  const [buildingData, setBuildingData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 데이터 로드
  useEffect(() => {
    params.then((p) => {
      setBillId(p.id);
      setUnitId(p.unitId);
      fetchBillData(p.id, p.unitId);
    });
  }, [params]);

  const fetchBillData = async (id: string, unitId: string) => {
    try {
      const response = await fetch(`/api/bills/${id}/units/${unitId}/edit`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log('Fetched data:', data);

      if (!data.unitBill) {
        throw new Error('청구서 데이터를 찾을 수 없습니다.');
      }

      if (!data.buildingData) {
        throw new Error('건물 데이터를 찾을 수 없습니다.');
      }

      const unitBill = data.unitBill;
      const building = data.buildingData;

      setOriginalData(unitBill);
      setBuildingData(building);

      // 폼 데이터 초기화 (snake_case에서 camelCase로 변환)
      setFormData({
        previousReading: unitBill.previous_reading || 0,
        currentReading: unitBill.current_reading || 0,
        usageAmount: unitBill.usage_amount || 0,
        basicFee: unitBill.basic_fee || 0,
        powerFee: unitBill.power_fee || 0,
        climateFee: unitBill.climate_fee || 0,
        fuelFee: unitBill.fuel_fee || 0,
        powerFactorFee: unitBill.power_factor_fee || 0,
        vat: unitBill.vat || 0,
        powerFund: unitBill.power_fund || 0,
        tvLicenseFee: unitBill.tv_license_fee || 0,
        roundDown: unitBill.round_down || 0,
        totalAmount: unitBill.total_amount || 0,
        notes: unitBill.notes || '',
        editReason: '',
        editMode: 'proportional'
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('데이터를 불러오는데 실패했습니다.');
      router.back();
    }
  };

  // 사용량 변경 시 비율 재계산
  const handleUsageChange = (newUsage: number) => {
    if (editMode === 'proportional' && buildingData) {
      const usageRate = newUsage / buildingData.total_usage;

      const basicFee = Math.round((buildingData.basic_fee * usageRate) / 10) * 10;
      const powerFee = Math.round((buildingData.power_fee * usageRate) / 10) * 10;
      const climateFee = Math.round((buildingData.climate_fee * usageRate) / 10) * 10;
      const fuelFee = Math.round((buildingData.fuel_fee * usageRate) / 10) * 10;
      const powerFactorFee = Math.round((buildingData.power_factor_fee * usageRate) / 10) * 10;
      const vat = Math.round((buildingData.vat * usageRate) / 10) * 10;
      const powerFund = Math.round((buildingData.power_fund * usageRate) / 10) * 10;
      const tvLicenseFee = Math.round((buildingData.tv_license_fee * usageRate) / 10) * 10;

      const totalAmount = basicFee + powerFee + climateFee + fuelFee + powerFactorFee + vat + powerFund + tvLicenseFee;

      console.log('비율재계산 모드 - 계산 결과:', {
        newUsage,
        usageRate,
        totalAmount,
        breakdown: { basicFee, powerFee, climateFee, fuelFee, powerFactorFee, vat, powerFund, tvLicenseFee }
      });

      setFormData({
        ...formData,
        usageAmount: newUsage,
        usageRate,  // usageRate 추가
        basicFee,
        powerFee,
        climateFee,
        fuelFee,
        powerFactorFee,
        vat,
        powerFund,
        tvLicenseFee,
        roundDown: 0,
        totalAmount
      });
    } else {
      setFormData({ ...formData, usageAmount: newUsage });
    }
  };

  // 편집 모드 변경
  const handleEditModeChange = (mode: EditMode) => {
    setEditMode(mode);
    setFormData({ ...formData, editMode: mode });

    // 비율 재계산 모드로 전환 시 자동 계산
    if (mode === 'proportional' && formData.usageAmount) {
      handleUsageChange(formData.usageAmount);
    }
  };

  // 유효성 검사
  const validate = (): boolean => {
    const validationErrors: string[] = [];

    if (!formData.usageAmount || formData.usageAmount <= 0) {
      validationErrors.push('사용량을 입력해주세요.');
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      validationErrors.push('총 청구액을 입력해주세요.');
    }

    if (!formData.editReason || formData.editReason.trim() === '') {
      validationErrors.push('수정 사유를 선택해주세요.');
    }

    if (formData.currentReading !== undefined && formData.previousReading !== undefined) {
      if (formData.currentReading < formData.previousReading) {
        validationErrors.push('당월 지침이 전월 지침보다 작을 수 없습니다.');
      }
    }

    // 직접 입력 모드의 경우 합계 검증
    if (editMode === 'manual') {
      const sum =
        (formData.basicFee || 0) +
        (formData.powerFee || 0) +
        (formData.climateFee || 0) +
        (formData.fuelFee || 0) +
        (formData.powerFactorFee || 0) +
        (formData.vat || 0) +
        (formData.powerFund || 0) +
        (formData.tvLicenseFee || 0) +
        (formData.roundDown || 0);

      if (Math.abs(sum - (formData.totalAmount || 0)) > 100) {
        validationErrors.push('개별 요금 항목의 합계와 총 청구액이 일치하지 않습니다. (허용 오차: ±100원)');
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // 저장
  const handleSubmit = async () => {
    console.log('저장 시도 - 현재 formData:', formData);

    if (!validate()) {
      console.log('유효성 검증 실패:', errors);
      return;
    }

    if (!confirm('정말 수정하시겠습니까?\n수정 내역은 청구서 이력에 기록됩니다.')) {
      return;
    }

    setSaving(true);

    try {
      console.log('API 요청 전송:', {
        url: `/api/bills/${billId}/units/${unitId}/edit`,
        method: 'PATCH',
        body: formData
      });

      const response = await fetch(`/api/bills/${billId}/units/${unitId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      console.log('API 응답:', { status: response.status, result });

      if (response.ok && result.success) {
        alert('청구서가 수정되었습니다.');
        router.push(`/dashboard/bills/${billId}`);
      } else {
        console.error('수정 실패:', result);
        alert(`수정 실패: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="text-2xl font-bold text-gray-900">호실별 청구서 수정</h1>
        {originalData && buildingData && (
          <p className="text-gray-600 mt-1">
            {buildingData.bill_year}년 {buildingData.bill_month}월 - {originalData.unit_number}호 ({originalData.tenant_name})
          </p>
        )}
      </div>

      {/* 에러 메시지 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold mb-2">다음 항목을 확인해주세요:</h3>
          <ul className="list-disc list-inside text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 편집 모드 선택 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">편집 모드 선택</h2>
        <div className="space-y-3">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="editMode"
              value="proportional"
              checked={editMode === 'proportional'}
              onChange={(e) => handleEditModeChange('proportional')}
              className="mt-1 mr-3"
            />
            <div>
              <span className="font-medium text-gray-900">비율 재계산 (사용량만 수정)</span>
              <p className="text-sm text-gray-600 mt-1">
                사용량을 수정하면 건물 전체 요금 대비 비율로 모든 요금 항목이 자동 재계산됩니다.
                <br />
                (예: 월 중간 이사로 인한 사용량 조정)
              </p>
            </div>
          </label>
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="editMode"
              value="manual"
              checked={editMode === 'manual'}
              onChange={(e) => handleEditModeChange('manual')}
              className="mt-1 mr-3"
            />
            <div>
              <span className="font-medium text-gray-900">직접 입력 (모든 항목 수정)</span>
              <p className="text-sm text-gray-600 mt-1">
                모든 요금 항목을 직접 입력할 수 있습니다.
                <br />
                (예: 계량기 오류 수정, 특별 할인 적용)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 검침 정보 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">검침 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전월 지침 (kWh)</label>
            <input
              type="number"
              step="0.1"
              value={formData.previousReading || ''}
              onChange={(e) => setFormData({ ...formData, previousReading: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">당월 지침 (kWh)</label>
            <input
              type="number"
              step="0.1"
              value={formData.currentReading || ''}
              onChange={(e) => setFormData({ ...formData, currentReading: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용량 (kWh) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.usageAmount || ''}
              onChange={(e) => handleUsageChange(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 요금 상세 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">요금 상세</h2>
        <div className="space-y-3">
          {[
            { key: 'basicFee', label: '기본료' },
            { key: 'powerFee', label: '전력량요금' },
            { key: 'climateFee', label: '기후환경요금' },
            { key: 'fuelFee', label: '연료비조정액' },
            { key: 'powerFactorFee', label: '역률요금' },
            { key: 'vat', label: '부가가치세' },
            { key: 'powerFund', label: '전력기금' },
            { key: 'tvLicenseFee', label: 'TV수신료' },
            { key: 'roundDown', label: '단수처리' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-32">{label}:</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={formData[key as keyof typeof formData] as number || 0}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, [key]: newValue });
                  }}
                  disabled={editMode === 'proportional'}
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <span className="ml-2 text-gray-600">원</span>
              </div>
            </div>
          ))}
          <div className="border-t pt-3">
            {/* 직접 입력 모드일 때 실시간 합계 표시 */}
            {editMode === 'manual' && (() => {
              const calculatedSum =
                (formData.basicFee || 0) +
                (formData.powerFee || 0) +
                (formData.climateFee || 0) +
                (formData.fuelFee || 0) +
                (formData.powerFactorFee || 0) +
                (formData.vat || 0) +
                (formData.powerFund || 0) +
                (formData.tvLicenseFee || 0) +
                (formData.roundDown || 0);
              const difference = calculatedSum - (formData.totalAmount || 0);
              const isValid = Math.abs(difference) <= 100;

              return (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">개별 항목 합계:</span>
                    <span className="font-semibold text-gray-900">{calculatedSum.toLocaleString()}원</span>
                  </div>
                  {difference !== 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-700">차액:</span>
                      <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {difference > 0 ? '+' : ''}{difference.toLocaleString()}원
                        {isValid ? ' ✓' : ' ✗ (허용 범위 초과)'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between font-bold text-lg">
              <span>총 청구액:</span>
              {editMode === 'manual' ? (
                <div className="flex items-center">
                  <input
                    type="number"
                    value={formData.totalAmount || 0}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-right font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="ml-2 text-gray-600">원</span>
                </div>
              ) : (
                <span className="text-blue-600">{(formData.totalAmount || 0).toLocaleString()}원</span>
              )}
            </div>
            {editMode === 'manual' && (
              <p className="text-sm text-gray-500 mt-2 text-right">
                직접입력 모드에서는 총 청구액을 직접 수정할 수 있습니다. (차액 허용 범위: ±100원)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 수정 정보 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">수정 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수정 사유 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.editReason || ''}
              onChange={(e) => setFormData({ ...formData, editReason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">선택하세요</option>
              <option value="이사정산">이사정산</option>
              <option value="계량기 오류 수정">계량기 오류 수정</option>
              <option value="기타 조정">기타 조정</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="상세한 수정 내역을 입력하세요..."
            />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => router.back()}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          취소
        </button>
        {(() => {
          // 유효성 검증 사전 체크
          const hasUsageAmount = formData.usageAmount && formData.usageAmount > 0;
          const hasTotalAmount = formData.totalAmount && formData.totalAmount > 0;
          const hasEditReason = formData.editReason && formData.editReason.trim() !== '';

          let sumValid = true;
          if (editMode === 'manual') {
            const calculatedSum =
              (formData.basicFee || 0) +
              (formData.powerFee || 0) +
              (formData.climateFee || 0) +
              (formData.fuelFee || 0) +
              (formData.powerFactorFee || 0) +
              (formData.vat || 0) +
              (formData.powerFund || 0) +
              (formData.tvLicenseFee || 0) +
              (formData.roundDown || 0);
            const difference = Math.abs(calculatedSum - (formData.totalAmount || 0));
            sumValid = difference <= 100;
          }

          const canSave = hasUsageAmount && hasTotalAmount && hasEditReason && sumValid;

          return (
            <button
              onClick={handleSubmit}
              disabled={saving || !canSave}
              className={`px-6 py-2 rounded-lg flex items-center transition-all ${
                canSave
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } disabled:opacity-50`}
              title={!canSave ? '필수 항목을 모두 입력하고 유효성 검증을 통과해야 저장할 수 있습니다.' : ''}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
                </>
              ) : (
                <>
                  저장
                  {!canSave && (
                    <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </>
              )}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
