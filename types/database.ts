// Database Types Definition
// Updated: 2026-02-11

// 사용자 정보
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

// 호실 정보
export interface Unit {
  id: number;
  unitNumber: string;
  tenantName: string | null;
  contact: string | null;
  email: string | null;
  status: 'occupied' | 'vacant';
  moveInDate: Date | null;
  moveOutDate: Date | null;
  meterNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 납부 정보
export interface PaymentInfo {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 월별 청구서
export interface MonthlyBill {
  id: number;
  billYear: number;
  billMonth: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;

  // 사용량 정보
  previousReading: number | null;
  currentReading: number | null;
  totalUsage: number;

  // 요금 상세
  basicFee: number | null;
  powerFee: number | null;
  climateFee: number | null;
  fuelFee: number | null;
  powerFactorFee: number | null;
  vat: number | null;
  powerFund: number | null;
  tvLicenseFee: number | null;
  roundDown: number | null;
  totalAmount: number;

  // 계약 정보
  contractType: string | null;
  contractPower: number | null;
  appliedPower: number | null;

  // 납부 정보
  dueDate: Date | null;
  paymentInfoId: number | null;

  // 파일 정보
  pdfFileName: string | null;
  excelFileName: string | null;

  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 입주자 정보 (009 추가)
export interface Tenant {
  id: number;
  unitId: number;
  name: string;
  contact: string | null;
  email: string | null;
  status: 'active' | 'moved_out';
  moveInDate: Date;
  moveOutDate: Date | null;
  moveInReading: number | null;
  moveOutReading: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 이사 정산 (009 추가)
export interface MoveSettlement {
  id: number;
  unitId: number;
  settlementDate: Date;
  billYear: number;
  billMonth: number;

  // 퇴거자 정보
  outgoingTenantId: number;
  outgoingPeriodStart: Date;
  outgoingPeriodEnd: Date;
  outgoingMeterReading: number | null;
  outgoingUsage: number | null;

  // 입주자 정보
  incomingTenantId: number | null;
  incomingPeriodStart: Date | null;
  incomingMeterReading: number | null;

  // 추정 기준 데이터
  estimatedTotalUsage: number | null;
  estimatedTotalAmount: number | null;
  estimationBaseMonths: string | null;  // JSON

  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 호실별 청구서
export interface UnitBill {
  id: number;
  monthlyBillId: number;
  unitId: number;

  // 이사 정산 관련 (009 추가)
  tenantId: number | null;
  tenantNameSnapshot: string | null;
  billType: 'regular' | 'move_out' | 'move_in';
  moveSettlementId: number | null;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  isEstimated: boolean;

  // 검침 정보
  previousReading: number | null;
  currentReading: number | null;
  usageAmount: number;
  usageRate: number;

  // 요금 상세
  basicFee: number | null;
  powerFee: number | null;
  climateFee: number | null;
  fuelFee: number | null;
  powerFactorFee: number | null;
  vat: number | null;
  powerFund: number | null;
  tvLicenseFee: number | null;
  roundDown: number | null;
  totalAmount: number;

  // 전월 대비 정보
  previousMonthTotal: number | null;

  // 미납 정보
  unpaidAmount: number;

  // 납부 정보
  dueDate: Date | null;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentDate: Date | null;
  paymentMethod: string | null;

  notes: string | null;

  // 수정 정보 (2025-11-10 추가)
  editReason: string | null;
  isManuallyEdited: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// 미납 이력
export interface UnpaidHistory {
  id: number;
  unitId: number;
  unitBillId: number | null;
  billYear: number;
  billMonth: number;
  unpaidAmount: number;
  isPaid: boolean;
  paidDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 청구서 안내사항
export interface BillingNotice {
  id: number;
  monthlyBillId: number;
  noticeContent: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 청구서 변경 이력
export interface BillHistory {
  id: number;
  unitBillId: number;
  action: 'created' | 'updated' | 'paid' | 'cancelled';
  oldValues: string | null;
  newValues: string | null;
  changedBy: number | null;
  changedAt: Date;
}

// PDF 파싱 데이터
export interface ParsedPdfData {
  id: number;
  monthlyBillId: number | null;
  fileName: string;
  fileHash: string | null;

  // 고객 정보
  customerNumber: string | null;
  invoiceNumber: string | null;

  // 청구 기간
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;

  // 검침 정보
  previousReading: number | null;
  currentReading: number | null;
  totalUsage: number | null;

  // 요금 상세
  basicFee: number | null;
  powerFee: number | null;
  climateFee: number | null;
  fuelFee: number | null;
  powerFactorFee: number | null;
  vat: number | null;
  powerFund: number | null;
  tvLicenseFee: number | null;
  roundDown: number | null;
  totalAmount: number | null;

  // 계약 정보
  contractType: string | null;
  contractPower: number | null;

  // 기타 정보
  dueDate: Date | null;
  rawText: string | null;
  parsedData: string | null;
  parseWarnings: string | null;

  parsedBy: number | null;
  parsedAt: Date;
}

// Excel 파싱 데이터
export interface ParsedExcelData {
  id: number;
  monthlyBillId: number | null;
  fileName: string;
  fileHash: string | null;
  sheetName: string | null;
  totalUnits: number | null;
  totalUsage: number | null;
  averageUsage: number | null;
  unitData: string | null;
  columnMapping: string | null;
  parseWarnings: string | null;
  parsedBy: number | null;
  parsedAt: Date;
}

// API Response Types

// 호실별 고지서 조회 응답
export interface UnitInvoiceResponse {
  // 기본 정보
  billYear: number;
  billMonth: number;
  unitNumber: string;
  tenantName: string;

  // 청구 정보
  currentCharges: {
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    subtotal: number;
    vat: number;
    powerFund: number;
    roundDown: number;
    total: number;
  };

  previousCharges: {
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    subtotal: number;
    vat: number;
    powerFund: number;
    roundDown: number;
    total: number;
  };

  // 미납 정보
  unpaidAmount: number;
  unpaidDetails: Array<{
    month: string;
    amount: number;
  }>;

  // 건물 전체 정보
  buildingTotal: {
    totalAmount: number;
    totalUsage: number;
    basicFee: number;
    powerFee: number;
    climateFee: number;
    fuelFee: number;
    powerFactorFee: number;
    vat: number;
    powerFund: number;
  };

  // 검침 정보
  meterReading: {
    previous: number;
    current: number;
    usage: number;
  };

  // 계산 기준
  usageRate: number;
  unitBaseFee: number;

  // 계약 정보
  contractInfo: {
    contractType: string;
    contractPower: number;
    appliedPower: number;
    basicFeeRate: number;
  };

  // 납부 정보
  paymentInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    dueDate: string;
  };

  // 청구 기간
  billingPeriod: {
    start: string;
    end: string;
  };

  // 안내사항
  notices: string[];
}

// 미납 내역 조회 응답
export interface UnpaidHistoryResponse {
  unitId: number;
  unitNumber: string;
  totalUnpaid: number;
  history: Array<{
    billYear: number;
    billMonth: number;
    amount: number;
    isPaid: boolean;
    paidDate: string | null;
  }>;
}

// 청구서 목록 응답
export interface BillListResponse {
  bills: Array<{
    id: number;
    billYear: number;
    billMonth: number;
    totalAmount: number;
    totalUsage: number;
    unitCount: number;
    paidCount: number;
    unpaidCount: number;
    dueDate: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}