export interface KepcoInvoiceData {
  // 계약 정보
  contractType?: string;         // 계약종별 (예: "일반용(을)고압A")
  contractPower?: number;        // 계약전력 (kW)
  appliedPower?: number;         // 요금적용전력 (kW)
  
  // 기본 정보
  customerNumber: string;        // 고객번호
  invoiceNumber: string;         // 청구서번호
  billingPeriod: {
    start: Date;
    end: Date;
    year?: number;              // 청구 연도
    month?: number;             // 청구 월
  };
  
  // 사용량 정보 (시간대별)
  usageByTime?: {
    night: number;              // 심야(경부하) 사용량 (kWh)
    day: number;                // 주간(중간부하) 사용량 (kWh)
    evening: number;            // 저녁(최대부하) 사용량 (kWh)
  };
  
  // 사용량 정보 (기본)
  previousReading: number;       // 전월 지침
  currentReading: number;        // 당월 지침
  totalUsage: number;           // 총 사용량 (kWh)
  
  // 요금 상세
  basicFee: number;             // 기본요금
  powerFee: number;             // 전력량요금
  powerFeeDetails?: {           // 전력량요금 상세
    night: number;              // 심야 요금
    day: number;                // 주간 요금
    evening: number;            // 저녁 요금
  };
  climateFee: number;           // 기후환경요금
  fuelFee: number;              // 연료비조정액
  powerFactorFee?: number;      // 역률요금 (할인/할증)
  vat: number;                  // 부가가치세
  powerFund: number;            // 전력산업기반기금
  tvLicenseFee: number;         // TV수신료
  roundDown: number;            // 원단위절사
  
  // 총액
  totalAmount: number;          // 청구금액
  
  // 기타
  dueDate: Date;                // 납기일
  issueDate: Date;              // 발행일
}

export interface UnitUsageData {
  unitNumber: string;
  previousReading: number;
  currentReading: number;
  usage: number;
  notes?: string;
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface ParsedPdfRecord {
  id: number;
  file_name: string;
  file_hash: string;
  customer_number?: string;
  invoice_number?: string;
  billing_period_start?: Date;
  billing_period_end?: Date;
  total_usage?: number;
  total_amount?: number;
  parsed_at: Date;
  parse_warnings?: string;
}

export interface ParsedExcelRecord {
  id: number;
  file_name: string;
  file_hash: string;
  sheet_name?: string;
  total_units?: number;
  total_usage?: number;
  average_usage?: number;
  parsed_at: Date;
  parse_warnings?: string;
}