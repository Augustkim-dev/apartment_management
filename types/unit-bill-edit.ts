// Unit Bill Edit Types
// Created: 2025-11-10
// Description: Types for editing individual unit bills (for mid-month move-out settlements, etc.)

import { UnitBill } from './database';

// 편집 모드 타입
export type EditMode = 'proportional' | 'manual';

// 수정 사유 타입
export type EditReason = '이사정산' | '계량기 오류 수정' | '기타 조정';

// 호실별 청구서 편집 요청
export interface UnitBillEditRequest {
  // 검침 정보
  previousReading?: number;
  currentReading?: number;
  usageAmount: number;
  usageRate?: number;  // 비율재계산 시 사용되는 사용 비율

  // 요금 항목
  basicFee?: number;
  powerFee?: number;
  climateFee?: number;
  fuelFee?: number;
  powerFactorFee?: number;
  vat?: number;
  powerFund?: number;
  tvLicenseFee?: number;
  roundDown?: number;

  // 총액
  totalAmount: number;

  // 메타정보
  editReason: string;
  notes?: string;

  // 편집 모드
  editMode: EditMode;
}

// 호실별 청구서 편집 응답
export interface UnitBillEditResponse {
  success: boolean;
  message: string;
  updatedBill?: UnitBill;
  historyId?: number;
}

// 편집 페이지용 데이터 (GET 응답)
export interface UnitBillEditData {
  // 현재 호실 청구서 데이터
  unitBill: UnitBill & {
    unitNumber: string;
    tenantName: string;
  };

  // 건물 전체 데이터 (비율 계산용)
  buildingData: {
    id: number;
    billYear: number;
    billMonth: number;
    totalUsage: number;
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    vat: number;
    powerFund: number;
    tvLicenseFee: number;
    roundDown: number;
    totalAmount: number;
  };

  // 해당 월의 전체 호실 사용량 합계 (비율 계산용)
  totalUnitUsage: number;
}

// 비율 재계산 결과
export interface ProportionalCalculationResult {
  usageRate: number;
  basicFee: number;
  powerFee: number;
  climateFee: number;
  fuelFee: number;
  powerFactorFee: number;
  vat: number;
  powerFund: number;
  tvLicenseFee: number;
  roundDown: number;
  totalAmount: number;
}

// 유효성 검사 에러
export interface ValidationError {
  field: string;
  message: string;
}

// 편집 이력 조회 응답
export interface UnitBillEditHistory {
  id: number;
  unitBillId: number;
  action: 'created' | 'updated' | 'paid' | 'cancelled';
  editReason?: string;
  oldValues: {
    usageAmount?: number;
    totalAmount?: number;
    basicFee?: number;
    powerFee?: number;
    climateFee?: number;
    fuelFee?: number;
    powerFactorFee?: number;
    vat?: number;
    powerFund?: number;
    tvLicenseFee?: number;
    roundDown?: number;
  };
  newValues: {
    usageAmount?: number;
    totalAmount?: number;
    basicFee?: number;
    powerFee?: number;
    climateFee?: number;
    fuelFee?: number;
    powerFactorFee?: number;
    vat?: number;
    powerFund?: number;
    tvLicenseFee?: number;
    roundDown?: number;
    editMode?: EditMode;
    editReason?: string;
  };
  changedBy: number | null;
  changedByName?: string;
  changedAt: Date;
}
