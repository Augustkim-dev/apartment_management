import { execute, query, transaction } from '@/lib/db-utils';
import { CalculationResult, UnitBillCalculation } from '@/types/calculation';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class UnitBillsService {
  /**
   * 계산 결과를 unit_bills 테이블에 저장
   */
  async saveCalculationResults(
    monthlyBillId: number,
    calculationResult: CalculationResult,
    options?: {
      userId?: number;
      notes?: string;
    }
  ) {
    return await transaction(async (conn) => {
      // 기존 데이터 삭제 (재계산 시)
      await conn.execute(
        'DELETE FROM unit_bills WHERE monthly_bill_id = ?',
        [monthlyBillId]
      );

      // 각 호실별 청구서 저장
      const savedBills = [];

      for (const unitBill of calculationResult.unitBills) {
        // units 테이블에서 unit_id 조회
        const [units] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM units WHERE unit_number = ?',
          [unitBill.unitNumber]
        );

        if (units.length === 0) {
          console.warn(`Unit ${unitBill.unitNumber} not found in database, skipping...`);
          continue;
        }

        const unitId = units[0].id;

        // unit_bills 테이블에 삽입
        const [result] = await conn.execute<ResultSetHeader>(
          `INSERT INTO unit_bills (
            monthly_bill_id, unit_id,
            previous_reading, current_reading,
            usage_amount, usage_rate,
            basic_fee, power_fee, climate_fee, fuel_fee,
            vat, power_fund, tv_license_fee, round_down,
            total_amount, payment_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            monthlyBillId,
            unitId,
            unitBill.previousReading || null,
            unitBill.currentReading || null,
            unitBill.usage,
            unitBill.usageRatio,
            unitBill.basicFee,
            unitBill.powerFee,
            unitBill.climateFee,
            unitBill.fuelFee,
            unitBill.vat,
            unitBill.powerFund,
            0, // tv_license_fee (현재 계산에 포함되지 않음)
            0, // round_down (원단위절사는 전체에만 적용)
            unitBill.totalAmount,
            'pending',
            options?.notes || null
          ]
        );

        savedBills.push({
          unitBillId: result.insertId,
          unitNumber: unitBill.unitNumber,
          totalAmount: unitBill.totalAmount
        });
      }

      return {
        success: true,
        savedCount: savedBills.length,
        totalAmount: savedBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        bills: savedBills
      };
    });
  }

  /**
   * 월별 호실 청구서 조회
   */
  async getMonthlyUnitBills(monthlyBillId: number) {
    const bills = await query<RowDataPacket[]>(
      `SELECT
        ub.*,
        u.unit_number,
        u.tenant_name,
        u.contact,
        u.email
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      WHERE ub.monthly_bill_id = ?
      ORDER BY u.unit_number`,
      [monthlyBillId]
    );

    return bills;
  }

  /**
   * 특정 호실의 청구 이력 조회
   */
  async getUnitBillHistory(unitNumber: string, limit: number = 12) {
    const bills = await query<RowDataPacket[]>(
      `SELECT
        ub.*,
        mb.bill_year,
        mb.bill_month,
        mb.billing_period_start,
        mb.billing_period_end
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE u.unit_number = ?
      ORDER BY mb.bill_year DESC, mb.bill_month DESC
      LIMIT ?`,
      [unitNumber, limit]
    );

    return bills;
  }

  /**
   * 미납 호실 조회
   */
  async getUnpaidBills() {
    const bills = await query<RowDataPacket[]>(
      `SELECT
        ub.*,
        u.unit_number,
        u.tenant_name,
        u.contact,
        mb.bill_year,
        mb.bill_month
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE ub.payment_status IN ('pending', 'overdue')
      ORDER BY mb.bill_year DESC, mb.bill_month DESC, u.unit_number`
    );

    return bills;
  }

  /**
   * 납부 상태 업데이트
   */
  async updatePaymentStatus(
    unitBillId: number,
    status: 'pending' | 'paid' | 'overdue',
    paymentDate?: Date
  ) {
    const result = await execute(
      `UPDATE unit_bills
       SET payment_status = ?, payment_date = ?
       WHERE id = ?`,
      [status, paymentDate || null, unitBillId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 호실별 사용량 통계
   */
  async getUnitUsageStats(unitNumber: string, months: number = 12) {
    const stats = await query<RowDataPacket[]>(
      `SELECT
        mb.bill_year,
        mb.bill_month,
        ub.usage_amount,
        ub.total_amount,
        ub.payment_status
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE u.unit_number = ?
      ORDER BY mb.bill_year DESC, mb.bill_month DESC
      LIMIT ?`,
      [unitNumber, months]
    );

    // 평균, 최대, 최소 계산
    if (stats.length > 0) {
      const usages = stats.map(s => parseFloat(s.usage_amount));
      const amounts = stats.map(s => parseFloat(s.total_amount));

      return {
        history: stats,
        statistics: {
          averageUsage: usages.reduce((a, b) => a + b, 0) / usages.length,
          maxUsage: Math.max(...usages),
          minUsage: Math.min(...usages),
          averageAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
          maxAmount: Math.max(...amounts),
          minAmount: Math.min(...amounts),
          totalMonths: stats.length
        }
      };
    }

    return {
      history: [],
      statistics: null
    };
  }
}