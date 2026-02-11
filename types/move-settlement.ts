// 이사 정산 관련 타입 정의
// Created: 2026-02-11 (009. 이사 정산 기능)

// ============================================
// 추정 계산 관련
// ============================================

// 추정 계산에 사용할 건물 전체 평균 데이터
export interface EstimatedBuildingCharges {
  avgTotalUsage: number;
  avgBasicFee: number;
  avgPowerFee: number;
  avgClimateFee: number;
  avgFuelFee: number;
  avgPowerFactorFee: number;
  avgVat: number;
  avgPowerFund: number;
  avgTotalAmount: number;
  baseMonths: { year: number; month: number }[];
}

// 추정 결과 (미리보기 + 저장 시 사용)
export interface EstimationResult {
  outgoingUsage: number;
  estimatedCharges: EstimatedBuildingCharges;
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

// ============================================
// API 요청/응답 타입
// ============================================

// 이사 정산 생성 요청
export interface MoveOutSettlementRequest {
  unitId: number;
  settlementDate: string;          // ISO datetime (퇴거 일시)
  meterReading: number;            // 퇴거 시 계량기값
  incomingTenant?: {               // 즉시 입주자 등록 (선택)
    name: string;
    contact?: string;
    email?: string;
    moveInDate: string;            // ISO datetime (입주 일시)
    moveInReading: number;         // 입주 시 계량기값
  };
  notes?: string;
}

// 추정 금액 미리보기 요청
export interface EstimatePreviewRequest {
  unitId: number;
  meterReading: number;            // 퇴거 시 계량기값
}

// 입주자 등록 요청 (나중에 등록하는 경우)
export interface RegisterIncomingTenantRequest {
  name: string;
  contact?: string;
  email?: string;
  moveInDate: string;
  moveInReading: number;
}

// 이사 정산 생성 응답
export interface MoveSettlementResponse {
  success: boolean;
  message: string;
  settlementId?: number;
  unitBillId?: number;
  estimationResult?: EstimationResult;
}

// 이사 정산 목록 조회 필터
export interface MoveSettlementListFilters {
  unitNumber?: string;
  startDate?: string;              // YYYY-MM 형식
  endDate?: string;                // YYYY-MM 형식
  status?: 'pending' | 'completed' | 'cancelled' | 'all';
  page?: number;
  limit?: number;
}

// 이사 정산 목록 항목
export interface MoveSettlementListItem {
  id: number;
  unitNumber: string;
  settlementDate: string;
  billYear: number;
  billMonth: number;
  outgoingTenantName: string;
  incomingTenantName: string | null;
  outgoingUsage: number | null;
  estimatedAmount: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// 이사 정산 상세
export interface MoveSettlementDetail {
  id: number;
  unitId: number;
  unitNumber: string;
  settlementDate: string;
  billYear: number;
  billMonth: number;
  status: 'pending' | 'completed' | 'cancelled';

  // 퇴거자 정보
  outgoingTenant: {
    id: number;
    name: string;
    contact: string | null;
    periodStart: string;
    periodEnd: string;
    meterReading: number | null;
    usage: number | null;
  };

  // 입주자 정보
  incomingTenant: {
    id: number;
    name: string;
    contact: string | null;
    periodStart: string;
    meterReading: number | null;
  } | null;

  // 추정 데이터
  estimation: {
    totalUsage: number | null;
    totalAmount: number | null;
    baseMonths: { year: number; month: number }[];
  };

  // 퇴거자 청구서 (unit_bill)
  outgoingBill: {
    id: number;
    totalAmount: number;
    isEstimated: boolean;
    paymentStatus: 'pending' | 'paid' | 'overdue';
  } | null;

  notes: string | null;
  createdAt: string;
}
