/**
 * 정산 관리 관련 타입 정의
 */

export interface SettlementRecord {
  id: number;
  unitBillId: number;
  billYear: number;
  billMonth: number;
  unitNumber: string;
  tenantName: string;
  contact: string;
  email: string | null;
  usageAmount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentDate: string | null;
  paymentMethod: string | null;
  dueDate: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
}

export interface SettlementSummary {
  totalBilled: number;      // 총 부과액
  totalPaid: number;         // 총 납부액
  totalUnpaid: number;       // 총 미납액
  recordCount: number;       // 전체 레코드 수
  paidCount: number;         // 납부 완료 건수
  unpaidCount: number;       // 미납 건수
}

export interface SettlementFilters {
  unitNumber?: string;
  userName?: string;
  phoneNumber?: string;
  startDate?: string;        // YYYY-MM
  endDate?: string;          // YYYY-MM
  paymentStatus?: 'all' | 'pending' | 'paid' | 'overdue';
  page?: number;
  limit?: number;
}

export interface SettlementResponse {
  success: boolean;
  data: SettlementRecord[];
  summary: SettlementSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentUpdateRequest {
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentDate?: string | null;
  paymentMethod?: string | null;
}
