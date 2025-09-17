/**
 * 호실별 전기료 계산 결과
 */
export interface UnitBillCalculation {
  // 호실 정보
  unitNumber: string;          // 호실 번호 (예: "201")
  moveInDate?: string;          // 이사 날짜

  // 검침 정보
  billingPeriod: string;        // 검침 기간 (예: "2025-6-10 ~ 2025-7-9")
  previousReading: number;      // 전기누적값
  currentReading: number;       // 전기기준값
  usage: number;                // 전기사용량 (kWh)

  // 비율 계산
  usageRatio: number;           // 사용 비율 (호실 사용량 / 전체 사용량)

  // 8개 요금 항목 (비례 배분)
  basicFee: number;             // 기본료
  powerFee: number;             // 전력량요금
  climateFee: number;           // 기후환경요금
  fuelFee: number;              // 연료비조정액
  powerFactorFee: number;       // 역률요금 (음수 가능)

  // 소계 및 세금
  subtotal: number;             // 5개 항목 합계
  vat: number;                  // 부가세
  powerFund: number;            // 전력기금

  // 최종 금액
  totalBeforeRound: number;     // 반올림 전 금액
  totalAmount: number;          // 최종 청구액 (10원 단위)
}

/**
 * 계산 엔진 입력 데이터
 */
export interface CalculationInput {
  // PDF에서 파싱한 총 청구 정보
  totalCharges: {
    basicFee: number;           // 총 기본료
    powerFee: number;           // 총 전력량요금
    climateFee: number;         // 총 기후환경요금
    fuelFee: number;            // 총 연료비조정액
    powerFactorFee: number;     // 총 역률요금
    vat: number;                // 총 부가세
    powerFund: number;          // 총 전력기금
    roundDown: number;          // 원단위절사
    totalAmount: number;        // 총 청구액
  };

  // Excel에서 파싱한 호실별 사용량
  unitUsages: Array<{
    unitNumber: string;         // 호실 번호
    moveInDate?: string;        // 이사 날짜
    previousReading: number;    // 전기누적값
    currentReading: number;     // 전기기준값
    usage: number;              // 사용량 (kWh)
  }>;

  // 청구 기간
  billingPeriod: {
    start: Date;
    end: Date;
    displayText: string;        // "2025-6-10 ~ 2025-7-9"
  };
}

/**
 * 계산 결과
 */
export interface CalculationResult {
  // 호실별 계산 결과
  unitBills: UnitBillCalculation[];

  // 검증 정보
  validation: {
    totalUsage: number;         // 총 사용량
    calculatedTotal: number;    // 계산된 총액
    originalTotal: number;      // 원본 총액
    difference: number;         // 차액
    isValid: boolean;           // 검증 통과 여부
  };

  // 조정 내역
  adjustments?: Array<{
    unitNumber: string;
    adjustmentAmount: number;
    reason: string;
  }>;

  // 경고 메시지
  warnings?: string[];
}

/**
 * Excel 출력용 행 데이터
 */
export interface ExcelRowData {
  호: string;
  이사일?: string;
  검침일자: string;
  전기누적값: number;
  전기기준값: number;
  전기사용량: number;
  기본료: number;
  전력량요금: number;
  기후환경요금: number;
  연료비조정액: number;
  역률요금: number;
  합계: number;
  부가세: number;
  전력기금: number;
  청구액: number;
}

/**
 * 계산 옵션
 */
export interface CalculationOptions {
  // 반올림 단위 (기본값: 10)
  roundingUnit?: number;

  // 오차 허용 범위 (기본값: 10원)
  toleranceAmount?: number;

  // 공실 제외 여부 (기본값: true)
  excludeVacant?: boolean;

  // 디버그 모드 (기본값: false)
  debug?: boolean;

  // 검증 모드 ('unit-only': 호실만, 'total': 전체 포함)
  validationMode?: 'unit-only' | 'total';

  // 호실 목표 금액 (unit-only 모드에서 사용)
  targetUnitTotal?: number;
}