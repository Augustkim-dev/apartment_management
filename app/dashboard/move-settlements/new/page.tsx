'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface UnitInfo {
  id: number;
  unit_number: string;
  tenant_name: string | null;
  status: string;
}

interface EstimationPreview {
  outgoingUsage: number;
  estimatedCharges: {
    avgTotalUsage: number;
    avgTotalAmount: number;
    baseMonths: { year: number; month: number }[];
  };
  calculatedBill: {
    usageRatio: number;
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    vat: number;
    powerFund: number;
    totalAmount: number;
  };
}

export default function NewMoveSettlementPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <NewMoveSettlementContent />
    </Suspense>
  );
}

function NewMoveSettlementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedUnitId = searchParams.get('unitId');

  const [step, setStep] = useState(1);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: 호실 선택
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(
    preselectedUnitId ? parseInt(preselectedUnitId) : null
  );
  const [selectedUnit, setSelectedUnit] = useState<UnitInfo | null>(null);

  // Step 2: 퇴거 정보
  const [settlementDate, setSettlementDate] = useState('');
  const [meterReading, setMeterReading] = useState('');

  // Step 3: 추정 결과
  const [estimation, setEstimation] = useState<EstimationPreview | null>(null);

  // Step 4: 입주자 (선택)
  const [registerIncoming, setRegisterIncoming] = useState(false);
  const [incomingName, setIncomingName] = useState('');
  const [incomingContact, setIncomingContact] = useState('');
  const [incomingEmail, setIncomingEmail] = useState('');
  const [incomingMoveInDate, setIncomingMoveInDate] = useState('');
  const [incomingMoveInReading, setIncomingMoveInReading] = useState('');

  // Step 5: 비고
  const [notes, setNotes] = useState('');

  // 호실 목록 로드
  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (selectedUnitId && units.length > 0) {
      const unit = units.find((u) => u.id === selectedUnitId);
      setSelectedUnit(unit || null);
    }
  }, [selectedUnitId, units]);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      // occupied 호실만 (tenant_name이 있는)
      const occupiedUnits = (data as UnitInfo[]).filter(
        (u: any) => u.status === 'occupied' || u.tenantName
      );
      // API 응답의 camelCase → 내부 snake_case 매핑
      setUnits(
        occupiedUnits.map((u: any) => ({
          id: u.id,
          unit_number: u.unitNumber || u.unit_number,
          tenant_name: u.tenantName || u.tenant_name,
          status: u.status,
        }))
      );
    } catch {
      toast.error('호실 목록을 불러오는데 실패했습니다.');
    }
  };

  // Step 2 → Step 3: 추정 미리보기
  const handleEstimatePreview = async () => {
    if (!selectedUnitId || !meterReading) {
      toast.error('계량기값을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/move-settlements/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: selectedUnitId,
          meterReading: parseFloat(meterReading),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || data.error || '추정 계산에 실패했습니다.');
        return;
      }

      setEstimation(data.estimation);
      setStep(3);
    } catch {
      toast.error('추정 계산 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 최종 제출
  const handleSubmit = async () => {
    if (!selectedUnitId || !settlementDate || !meterReading) return;

    setSubmitting(true);
    try {
      const body: any = {
        unitId: selectedUnitId,
        settlementDate,
        meterReading: parseFloat(meterReading),
        notes: notes || undefined,
      };

      if (registerIncoming && incomingName && incomingMoveInDate && incomingMoveInReading) {
        body.incomingTenant = {
          name: incomingName,
          contact: incomingContact || undefined,
          email: incomingEmail || undefined,
          moveInDate: incomingMoveInDate,
          moveInReading: parseFloat(incomingMoveInReading),
        };
      }

      const res = await fetch('/api/move-settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || '이사 정산 생성에 실패했습니다.');
        return;
      }

      toast.success('이사 정산이 성공적으로 생성되었습니다.');
      router.push(`/dashboard/move-settlements/${data.settlementId}`);
    } catch {
      toast.error('이사 정산 생성 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtNumber = (n: number) => Math.floor(n).toLocaleString();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/move-settlements"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <ArrowsRightLeftIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">이사 정산 등록</h1>
            <p className="text-sm text-gray-500">퇴거 처리 및 추정 청구서 생성</p>
          </div>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: '호실 선택' },
          { num: 2, label: '퇴거 정보' },
          { num: 3, label: '추정 미리보기' },
          { num: 4, label: '입주자 등록' },
          { num: 5, label: '확인 및 저장' },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            {i > 0 && (
              <div className={`h-px flex-1 ${step >= s.num ? 'bg-blue-400' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step > s.num
                  ? 'bg-blue-600 text-white'
                  : step === s.num
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step > s.num ? <CheckCircleIcon className="h-5 w-5" /> : s.num}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: 호실 선택 */}
      {step === 1 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Step 1. 호실 선택
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            퇴거 처리할 호실을 선택하세요. 현재 입주 중인 호실만 표시됩니다.
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className={`rounded-lg border p-3 text-center text-sm transition ${
                  selectedUnitId === unit.id
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="font-bold">{unit.unit_number}</div>
                <div className="truncate text-xs text-gray-500">
                  {unit.tenant_name || '-'}
                </div>
              </button>
            ))}
          </div>
          {selectedUnit && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm">
                <strong>{selectedUnit.unit_number}호</strong> -{' '}
                현재 입주자: <strong>{selectedUnit.tenant_name || '-'}</strong>
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => selectedUnitId && setStep(2)}
              disabled={!selectedUnitId}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 퇴거 정보 */}
      {step === 2 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Step 2. 퇴거 정보 입력
          </h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                퇴거 일시 *
              </label>
              <input
                type="datetime-local"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                퇴거 시 계량기값 (kWh) *
              </label>
              <input
                type="number"
                step="0.01"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                placeholder="예: 12345.67"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={handleEstimatePreview}
              disabled={!settlementDate || !meterReading || loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '계산 중...' : '추정 계산'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 추정 미리보기 */}
      {step === 3 && estimation && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Step 3. 추정 금액 미리보기
          </h2>
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            직전 {estimation.estimatedCharges.baseMonths.length}개월 평균 데이터 기반 추정입니다.
            실제 KEPCO 청구서와 차이가 있을 수 있으며, 차액은 건물 관리비로 흡수됩니다.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 사용량 정보 */}
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium text-gray-700">퇴거자 사용량</h3>
              <p className="text-2xl font-bold text-blue-600">
                {fmtNumber(estimation.outgoingUsage)} kWh
              </p>
              <p className="mt-1 text-xs text-gray-500">
                비율: {(estimation.calculatedBill.usageRatio * 100).toFixed(2)}%
              </p>
            </div>

            {/* 추정 총액 */}
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium text-gray-700">추정 청구 금액</h3>
              <p className="text-2xl font-bold text-red-600">
                {fmtNumber(estimation.calculatedBill.totalAmount)}원
              </p>
              <p className="mt-1 text-xs text-gray-500">
                건물 평균 전체 요금: {fmtNumber(estimation.estimatedCharges.avgTotalAmount)}원
              </p>
            </div>
          </div>

          {/* 요금 상세 */}
          <div className="mt-4">
            <h3 className="mb-2 font-medium text-gray-700">요금 상세 (추정)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {[
                  ['기본료', estimation.calculatedBill.basicFee],
                  ['전력량요금', estimation.calculatedBill.powerFee],
                  ['기후환경요금', estimation.calculatedBill.climateFee],
                  ['연료비조정액', estimation.calculatedBill.fuelFee],
                  ['역률요금', estimation.calculatedBill.powerFactorFee],
                  ['부가세', estimation.calculatedBill.vat],
                  ['전력기금', estimation.calculatedBill.powerFund],
                ].map(([label, value]) => (
                  <tr key={label as string}>
                    <td className="py-1 text-gray-600">{label}</td>
                    <td className="py-1 text-right font-medium">
                      {fmtNumber(value as number)}원
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 text-gray-900">합계</td>
                  <td className="py-2 text-right text-red-600">
                    {fmtNumber(estimation.calculatedBill.totalAmount)}원
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 참조 월 */}
          <div className="mt-3 text-xs text-gray-400">
            참조 월:{' '}
            {estimation.estimatedCharges.baseMonths
              .map((m) => `${m.year}년 ${m.month}월`)
              .join(', ')}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={() => setStep(4)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 입주자 등록 (선택) */}
      {step === 4 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Step 4. 입주자 등록 (선택)
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            새 입주자가 확정된 경우 지금 등록할 수 있습니다. 나중에 등록할 수도 있습니다.
          </p>

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={registerIncoming}
              onChange={(e) => setRegisterIncoming(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              새 입주자 지금 등록
            </span>
          </label>

          {registerIncoming && (
            <div className="space-y-4 max-w-md rounded-lg border border-gray-200 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  입주자 이름 *
                </label>
                <input
                  type="text"
                  value={incomingName}
                  onChange={(e) => setIncomingName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  연락처
                </label>
                <input
                  type="text"
                  value={incomingContact}
                  onChange={(e) => setIncomingContact(e.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  type="email"
                  value={incomingEmail}
                  onChange={(e) => setIncomingEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  입주 일시 *
                </label>
                <input
                  type="datetime-local"
                  value={incomingMoveInDate}
                  onChange={(e) => setIncomingMoveInDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  입주 시 계량기값 (kWh) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={incomingMoveInReading}
                  onChange={(e) => setIncomingMoveInReading(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={() => setStep(5)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 확인 및 저장 */}
      {step === 5 && estimation && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Step 5. 확인 및 저장
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium text-gray-700 mb-2">퇴거 정보</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">호실</dt>
                <dd className="font-medium">{selectedUnit?.unit_number}</dd>
                <dt className="text-gray-500">퇴거자</dt>
                <dd className="font-medium">{selectedUnit?.tenant_name}</dd>
                <dt className="text-gray-500">퇴거 일시</dt>
                <dd className="font-medium">
                  {settlementDate.replace('T', ' ')}
                </dd>
                <dt className="text-gray-500">계량기값</dt>
                <dd className="font-medium">{meterReading} kWh</dd>
                <dt className="text-gray-500">사용량</dt>
                <dd className="font-medium">
                  {fmtNumber(estimation.outgoingUsage)} kWh
                </dd>
                <dt className="text-gray-500">추정 청구 금액</dt>
                <dd className="font-bold text-red-600">
                  {fmtNumber(estimation.calculatedBill.totalAmount)}원
                </dd>
              </dl>
            </div>

            {registerIncoming && incomingName && (
              <div className="rounded-lg bg-green-50 p-4">
                <h3 className="font-medium text-gray-700 mb-2">입주자 정보</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500">이름</dt>
                  <dd className="font-medium">{incomingName}</dd>
                  <dt className="text-gray-500">입주 일시</dt>
                  <dd className="font-medium">
                    {incomingMoveInDate.replace('T', ' ')}
                  </dd>
                  <dt className="text-gray-500">계량기값</dt>
                  <dd className="font-medium">{incomingMoveInReading} kWh</dd>
                </dl>
              </div>
            )}

            {notes && (
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-700 mb-1">비고</h3>
                <p className="text-sm text-gray-600">{notes}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비고 (선택)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="메모 사항이 있으면 입력하세요..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(4)}
              className="rounded-lg border px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-8 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? '처리 중...' : '정산 실행'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
