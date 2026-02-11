// 이사 정산 - 추정 계산 엔진
// Created: 2026-02-11 (009. 이사 정산 기능 - Step 2)
//
// 퇴거 시점에 건물 전체 요금이 확정되지 않으므로
// 직전 3개월 monthly_bills 평균 데이터로 추정하여 퇴거자에게 부과한다.
// 차액은 건물 관리비로 흡수.

import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';
import { EstimatedBuildingCharges, EstimationResult } from '@/types/move-settlement';

export class EstimationService {
  /**
   * 직전 N개월 monthly_bills 데이터 조회 (기본 3개월)
   * 해당 year/month 이전 데이터를 최근순으로 가져온다.
   */
  async getLast3MonthsData(
    year: number,
    month: number,
    count: number = 3
  ): Promise<RowDataPacket[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT
        bill_year,
        bill_month,
        total_usage,
        basic_fee,
        power_fee,
        climate_fee,
        fuel_fee,
        power_factor_fee,
        vat,
        power_fund,
        total_amount
      FROM monthly_bills
      WHERE (bill_year < ? OR (bill_year = ? AND bill_month < ?))
      ORDER BY bill_year DESC, bill_month DESC
      LIMIT ?`,
      [year, year, month, count]
    );

    return rows;
  }

  /**
   * 건물 전체 요금의 평균 계산
   * 최소 1개월 데이터가 필요하다.
   */
  calculateAverage(monthsData: RowDataPacket[]): EstimatedBuildingCharges {
    if (monthsData.length === 0) {
      throw new Error('추정 계산에 사용할 월별 데이터가 없습니다. 최소 1개월의 청구 데이터가 필요합니다.');
    }

    const n = monthsData.length;

    const sum = {
      totalUsage: 0,
      basicFee: 0,
      powerFee: 0,
      climateFee: 0,
      fuelFee: 0,
      powerFactorFee: 0,
      vat: 0,
      powerFund: 0,
      totalAmount: 0,
    };

    for (const row of monthsData) {
      sum.totalUsage += parseFloat(row.total_usage) || 0;
      sum.basicFee += parseFloat(row.basic_fee) || 0;
      sum.powerFee += parseFloat(row.power_fee) || 0;
      sum.climateFee += parseFloat(row.climate_fee) || 0;
      sum.fuelFee += parseFloat(row.fuel_fee) || 0;
      sum.powerFactorFee += parseFloat(row.power_factor_fee) || 0;
      sum.vat += parseFloat(row.vat) || 0;
      sum.powerFund += parseFloat(row.power_fund) || 0;
      sum.totalAmount += parseFloat(row.total_amount) || 0;
    }

    const baseMonths = monthsData.map(row => ({
      year: row.bill_year as number,
      month: row.bill_month as number,
    }));

    return {
      avgTotalUsage: sum.totalUsage / n,
      avgBasicFee: sum.basicFee / n,
      avgPowerFee: sum.powerFee / n,
      avgClimateFee: sum.climateFee / n,
      avgFuelFee: sum.fuelFee / n,
      avgPowerFactorFee: sum.powerFactorFee / n,
      avgVat: sum.vat / n,
      avgPowerFund: sum.powerFund / n,
      avgTotalAmount: sum.totalAmount / n,
      baseMonths,
    };
  }

  /**
   * 퇴거자 추정 청구서 계산
   *
   * usageRatio = outgoingUsage / avgTotalUsage
   * 각 요금항목 = avg항목 × usageRatio (10원 단위 반올림)
   *
   * recalculateFees()와 동일한 비율 계산 패턴 사용
   */
  calculateMoveOutBill(
    outgoingUsage: number,
    estimatedCharges: EstimatedBuildingCharges
  ): EstimationResult {
    if (estimatedCharges.avgTotalUsage <= 0) {
      throw new Error('추정 건물 전체 사용량이 0 이하입니다. 추정 계산을 수행할 수 없습니다.');
    }

    const usageRatio = outgoingUsage / estimatedCharges.avgTotalUsage;

    // 각 요금 항목 비율 계산 (10원 단위 반올림) - recalculateFees() 패턴 동일
    const basicFee = Math.round((estimatedCharges.avgBasicFee * usageRatio) / 10) * 10;
    const powerFee = Math.round((estimatedCharges.avgPowerFee * usageRatio) / 10) * 10;
    const climateFee = Math.round((estimatedCharges.avgClimateFee * usageRatio) / 10) * 10;
    const fuelFee = Math.round((estimatedCharges.avgFuelFee * usageRatio) / 10) * 10;
    const powerFactorFee = Math.round((estimatedCharges.avgPowerFactorFee * usageRatio) / 10) * 10;
    const vat = Math.round((estimatedCharges.avgVat * usageRatio) / 10) * 10;
    const powerFund = Math.round((estimatedCharges.avgPowerFund * usageRatio) / 10) * 10;

    const totalAmount = basicFee + powerFee + climateFee + fuelFee + powerFactorFee + vat + powerFund;

    return {
      outgoingUsage,
      estimatedCharges,
      calculatedBill: {
        usageRatio,
        basicFee,
        powerFee,
        climateFee,
        fuelFee,
        powerFactorFee,
        vat,
        powerFund,
        totalAmount,
      },
    };
  }

  /**
   * 추정 금액 미리보기 (저장 없이)
   *
   * 호실의 퇴거 시 계량기값과 이전 검침값으로 사용량을 계산하고
   * 3개월 평균 데이터로 추정 요금을 산출한다.
   */
  async estimatePreview(
    unitId: number,
    meterReading: number
  ): Promise<EstimationResult> {
    // 1. 해당 호실의 이전 검침값 조회 (최근 unit_bill의 current_reading)
    const previousReadingRow = await query<RowDataPacket[]>(
      `SELECT ub.current_reading, mb.bill_year, mb.bill_month
       FROM unit_bills ub
       JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
       WHERE ub.unit_id = ?
         AND ub.bill_type = 'regular'
         AND ub.current_reading IS NOT NULL
       ORDER BY mb.bill_year DESC, mb.bill_month DESC
       LIMIT 1`,
      [unitId]
    );

    let previousReading = 0;
    let refYear: number;
    let refMonth: number;

    if (previousReadingRow.length > 0) {
      previousReading = parseFloat(previousReadingRow[0].current_reading) || 0;
      refYear = previousReadingRow[0].bill_year;
      refMonth = previousReadingRow[0].bill_month;
    } else {
      // unit_bill이 없으면 tenant의 move_in_reading 사용
      const tenantRow = await query<RowDataPacket[]>(
        `SELECT move_in_reading FROM tenants
         WHERE unit_id = ? AND status = 'active'
         LIMIT 1`,
        [unitId]
      );
      previousReading = tenantRow.length > 0
        ? (parseFloat(tenantRow[0].move_in_reading) || 0)
        : 0;

      // 기준 월: 현재 날짜 기준
      const now = new Date();
      refYear = now.getFullYear();
      refMonth = now.getMonth() + 1;
    }

    // 2. 퇴거자 사용량 계산
    const outgoingUsage = meterReading - previousReading;
    if (outgoingUsage < 0) {
      throw new Error(
        `퇴거 시 계량기값(${meterReading})이 이전 검침값(${previousReading})보다 작습니다.`
      );
    }

    // 3. 직전 3개월 평균 데이터 조회 및 계산
    // refYear/refMonth 다음 달 기준으로 조회 (현재 청구 기간 포함하지 않기 위해)
    let queryYear = refYear;
    let queryMonth = refMonth + 1;
    if (queryMonth > 12) {
      queryYear += 1;
      queryMonth = 1;
    }

    const monthsData = await this.getLast3MonthsData(queryYear, queryMonth);
    const estimatedCharges = this.calculateAverage(monthsData);

    // 4. 추정 청구서 계산
    return this.calculateMoveOutBill(outgoingUsage, estimatedCharges);
  }

  /**
   * 정산에 사용할 청구 기간(year, month) 결정
   * 검침일 기준: 매월 9일
   *
   * 예: 정산일이 1/16이면 → 청구월 = 1월 (1/9 ~ 2/9 기간)
   *     정산일이 1/5이면 → 청구월 = 12월 전년도 (12/9 ~ 1/9 기간)
   */
  determineBillingPeriod(settlementDate: Date): { year: number; month: number } {
    const day = settlementDate.getDate();
    const month = settlementDate.getMonth() + 1; // 1-based
    const year = settlementDate.getFullYear();

    if (day >= 9) {
      // 9일 이후면 해당 월의 청구기간
      return { year, month };
    } else {
      // 9일 이전이면 전월 청구기간
      if (month === 1) {
        return { year: year - 1, month: 12 };
      }
      return { year, month: month - 1 };
    }
  }
}

// 싱글턴 인스턴스
export const estimationService = new EstimationService();
