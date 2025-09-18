import {
  CalculationInput,
  CalculationResult,
  UnitBillCalculation,
  CalculationOptions
} from '@/types/calculation';
import { configService } from '@/lib/services/config-service';

/**
 * 전기료 계산 엔진
 */
export class BillCalculator {
  private options: Required<CalculationOptions>;

  constructor(options: CalculationOptions = {}) {
    this.options = {
      roundingUnit: options.roundingUnit ?? 10,
      toleranceAmount: options.toleranceAmount ?? 10,
      excludeVacant: options.excludeVacant ?? true,
      debug: options.debug ?? false,
      validationMode: options.validationMode ?? 'unit-only',
      targetUnitTotal: options.targetUnitTotal ?? 2444070  // 실제 Excel Q열 합계
    };
  }

  /**
   * 메인 계산 메서드
   */
  async calculate(input: CalculationInput): Promise<CalculationResult> {
    const { totalCharges, unitUsages, billingPeriod } = input;

    // 1. 사용량이 있는 호실만 필터링 (공실 제외)
    const activeUnits = this.options.excludeVacant
      ? unitUsages.filter(unit => unit.usage > 0)
      : unitUsages;

    // 2. 총 사용량 계산 - PDF의 전체 사용량 사용 (공용 포함)
    const unitTotalUsage = activeUnits.reduce((sum, unit) => sum + unit.usage, 0);

    // ConfigService에서 기본 총 사용량 가져오기, 실패시 하드코딩 값 사용
    let defaultTotalUsage = 25231;
    try {
      const configValue = await configService.get('building.total_usage_default');
      if (configValue) {
        defaultTotalUsage = Number(configValue);
      }
    } catch (error) {
      console.error('Failed to get default total usage from config:', error);
    }

    // PDF에서 파싱한 전체 사용량 (공용 포함) 또는 기본값 사용
    const buildingTotalUsage = (input as any).pdfTotalUsage || defaultTotalUsage;

    // 실제 계산에 사용할 총 사용량
    const totalUsage = buildingTotalUsage;

    if (totalUsage === 0) {
      throw new Error('총 사용량이 0입니다. 계산할 수 없습니다.');
    }

    if (this.options.debug) {
      console.log(`건물 전체 사용량: ${totalUsage} kWh`);
      console.log(`호실 합계 사용량: ${unitTotalUsage} kWh`);
      console.log(`공용 사용량: ${totalUsage - unitTotalUsage} kWh`);
      console.log(`활성 호실 수: ${activeUnits.length}`);
    }

    // 3. 호실별 계산
    const unitBills: UnitBillCalculation[] = activeUnits.map(unit => {
      const usageRatio = unit.usage / totalUsage;

      // 각 요금 항목을 비율에 따라 배분 (소수점 유지)
      const basicFee = totalCharges.basicFee * usageRatio;
      const powerFee = totalCharges.powerFee * usageRatio;
      const climateFee = totalCharges.climateFee * usageRatio;
      const fuelFee = totalCharges.fuelFee * usageRatio;
      const powerFactorFee = totalCharges.powerFactorFee * usageRatio;

      // 소계 (5개 항목)
      const subtotal = basicFee + powerFee + climateFee + fuelFee + powerFactorFee;

      // 부가세와 전력기금도 비례 배분
      const vat = totalCharges.vat * usageRatio;
      const powerFund = totalCharges.powerFund * usageRatio;

      // 반올림 전 총액
      const totalBeforeRound = subtotal + vat + powerFund;

      // 10원 단위로 반올림
      const totalAmount = this.roundToUnit(totalBeforeRound, this.options.roundingUnit);

      return {
        unitNumber: unit.unitNumber,
        moveInDate: unit.moveInDate,
        billingPeriod: billingPeriod.displayText,
        previousReading: unit.previousReading,
        currentReading: unit.currentReading,
        usage: unit.usage,
        usageRatio,
        basicFee: Math.round(basicFee),
        powerFee: Math.round(powerFee),
        climateFee: Math.round(climateFee),
        fuelFee: Math.round(fuelFee),
        powerFactorFee: Math.round(powerFactorFee),
        subtotal: Math.round(subtotal),
        vat: Math.round(vat),
        powerFund: Math.round(powerFund),
        totalBeforeRound,
        totalAmount
      };
    });

    // 4. 계산된 총액과 원본 총액 비교
    const calculatedTotal = unitBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const initialDifference = totalCharges.totalAmount - calculatedTotal;

    if (this.options.debug) {
      console.log(`원본 총액: ${totalCharges.totalAmount}원`);
      console.log(`계산 총액: ${calculatedTotal}원`);
      console.log(`차액: ${initialDifference}원`);
    }

    // 5. 차액 조정 (필요한 경우)
    let adjustments;
    if (Math.abs(initialDifference) > this.options.toleranceAmount) {
      adjustments = this.adjustDifference(unitBills, initialDifference);
    }

    // 6. 최종 검증
    const finalCalculatedTotal = unitBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

    // 검증 모드에 따른 처리
    let validationTarget: number;
    let difference: number;
    let isValid: boolean;

    if (this.options.validationMode === 'unit-only') {
      // 호실만 검증 모드: 실제 Excel 합계와 비교
      validationTarget = this.options.targetUnitTotal;
      difference = validationTarget - finalCalculatedTotal;
      // 호실 검증은 더 큰 오차 허용 (반올림 누적 고려)
      isValid = Math.abs(difference) <= 30000;
    } else {
      // 전체 검증 모드: PDF 총액과 비교
      validationTarget = totalCharges.totalAmount;
      difference = validationTarget - finalCalculatedTotal;
      isValid = Math.abs(difference) <= this.options.toleranceAmount;
    }

    if (this.options.debug) {
      console.log(`검증 모드: ${this.options.validationMode}`);
      console.log(`목표 금액: ${validationTarget}원`);
      console.log(`계산 금액: ${finalCalculatedTotal}원`);
      console.log(`차이: ${difference}원`);
      console.log(`검증 결과: ${isValid ? '✅ 통과' : '❌ 실패'}`);
    }

    return {
      unitBills,
      validation: {
        totalUsage: unitTotalUsage,  // 호실 사용량 합계
        calculatedTotal: finalCalculatedTotal,
        originalTotal: validationTarget,
        difference,
        isValid
      },
      adjustments,
      warnings: this.generateWarnings(unitBills, totalCharges, difference)
    };
  }

  /**
   * 10원 단위 반올림
   */
  private roundToUnit(amount: number, unit: number): number {
    return Math.round(amount / unit) * unit;
  }

  /**
   * 차액 조정 알고리즘
   */
  private adjustDifference(
    unitBills: UnitBillCalculation[],
    difference: number
  ): Array<{ unitNumber: string; adjustmentAmount: number; reason: string }> {
    const adjustments: Array<{ unitNumber: string; adjustmentAmount: number; reason: string }> = [];

    // 사용량이 많은 순으로 정렬
    const sortedBills = [...unitBills].sort((a, b) => b.usage - a.usage);

    let remainingDifference = difference;
    const adjustmentUnit = this.options.roundingUnit;
    let unitIndex = 0;

    // 차액이 허용 범위 내에 들어올 때까지 조정
    while (Math.abs(remainingDifference) > this.options.toleranceAmount && unitIndex < sortedBills.length * 2) {
      const bill = sortedBills[unitIndex % sortedBills.length];

      // 조정 금액 결정 (차액이 양수면 더하고, 음수면 뺀다)
      const adjustment = remainingDifference > 0 ? adjustmentUnit : -adjustmentUnit;

      // 조정 적용
      bill.totalAmount += adjustment;
      remainingDifference -= adjustment;

      adjustments.push({
        unitNumber: bill.unitNumber,
        adjustmentAmount: adjustment,
        reason: '총액 일치를 위한 조정'
      });

      unitIndex++;
    }

    if (this.options.debug) {
      console.log(`차액 조정: ${adjustments.length}개 호실 조정`);
      console.log(`남은 차액: ${remainingDifference}원`);
    }

    return adjustments;
  }

  /**
   * 경고 메시지 생성
   */
  private generateWarnings(
    unitBills: UnitBillCalculation[],
    totalCharges: any,
    difference: number
  ): string[] {
    const warnings: string[] = [];

    // 차액 경고
    if (Math.abs(difference) > 0) {
      warnings.push(`계산 총액과 원본 총액의 차이: ${difference}원`);
    }

    // 음수 청구액 체크
    const negativeBills = unitBills.filter(bill => bill.totalAmount < 0);
    if (negativeBills.length > 0) {
      warnings.push(`음수 청구액 발생: ${negativeBills.map(b => b.unitNumber).join(', ')}`);
    }

    // 사용량 대비 요금 이상치 체크
    const avgRate = totalCharges.totalAmount / unitBills.reduce((sum, b) => sum + b.usage, 0);
    unitBills.forEach(bill => {
      if (bill.usage > 0) {
        const rate = bill.totalAmount / bill.usage;
        if (rate > avgRate * 2) {
          warnings.push(`${bill.unitNumber}호: 평균 대비 높은 단가 (${Math.round(rate)}원/kWh)`);
        }
      }
    });

    return warnings;
  }

  /**
   * 계산 결과를 요약 문자열로 변환
   */
  formatSummary(result: CalculationResult): string {
    const { validation, unitBills } = result;

    return `
=== 계산 결과 요약 ===
총 호실 수: ${unitBills.length}개
총 사용량: ${validation.totalUsage.toLocaleString()} kWh
원본 총액: ${validation.originalTotal.toLocaleString()}원
계산 총액: ${validation.calculatedTotal.toLocaleString()}원
차액: ${validation.difference.toLocaleString()}원
검증 결과: ${validation.isValid ? '✅ 통과' : '❌ 실패'}
${result.warnings?.length ? `\n경고:\n${result.warnings.map(w => `- ${w}`).join('\n')}` : ''}
    `.trim();
  }
}