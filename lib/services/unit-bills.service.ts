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

  /**
   * 정산 관리: 전체 호실의 청구 내역 조회 (필터링 및 페이지네이션 지원)
   */
  async getAllSettlements(filters: {
    unitNumber?: string;
    userName?: string;
    phoneNumber?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      unitNumber,
      userName,
      phoneNumber,
      startDate,
      endDate,
      paymentStatus,
      page = 1,
      limit = 50
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];

    // 필터 조건 추가
    if (unitNumber) {
      conditions.push('u.unit_number LIKE ?');
      params.push(`%${unitNumber}%`);
    }

    if (userName) {
      conditions.push('u.tenant_name LIKE ?');
      params.push(`%${userName}%`);
    }

    if (phoneNumber) {
      conditions.push('u.contact LIKE ?');
      params.push(`%${phoneNumber}%`);
    }

    if (startDate) {
      const [year, month] = startDate.split('-');
      conditions.push('(mb.bill_year > ? OR (mb.bill_year = ? AND mb.bill_month >= ?))');
      params.push(parseInt(year), parseInt(year), parseInt(month));
    }

    if (endDate) {
      const [year, month] = endDate.split('-');
      conditions.push('(mb.bill_year < ? OR (mb.bill_year = ? AND mb.bill_month <= ?))');
      params.push(parseInt(year), parseInt(year), parseInt(month));
    }

    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push('ub.payment_status = ?');
      params.push(paymentStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 데이터 조회
    const dataQuery = `
      SELECT
        ub.id as unitBillId,
        mb.bill_year as billYear,
        mb.bill_month as billMonth,
        u.unit_number as unitNumber,
        u.tenant_name as tenantName,
        u.contact,
        u.email,
        ub.usage_amount as usageAmount,
        ub.total_amount as totalAmount,
        ub.payment_status as paymentStatus,
        ub.payment_date as paymentDate,
        ub.payment_method as paymentMethod,
        ub.due_date as dueDate,
        mb.billing_period_start as billingPeriodStart,
        mb.billing_period_end as billingPeriodEnd,
        ub.created_at as createdAt
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      ${whereClause}
      ORDER BY mb.bill_year DESC, mb.bill_month DESC, u.unit_number ASC
      LIMIT ? OFFSET ?
    `;

    const data = await query<RowDataPacket[]>(dataQuery, [...params, limit, offset]);

    // 전체 카운트 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      ${whereClause}
    `;

    const [countResult] = await query<RowDataPacket[]>(countQuery, params);
    const total = countResult.total;

    // 통계 조회
    const statsQuery = `
      SELECT
        SUM(ub.total_amount) as totalBilled,
        SUM(CASE WHEN ub.payment_status = 'paid' THEN ub.total_amount ELSE 0 END) as totalPaid,
        SUM(CASE WHEN ub.payment_status IN ('pending', 'overdue') THEN ub.total_amount ELSE 0 END) as totalUnpaid,
        COUNT(*) as recordCount,
        SUM(CASE WHEN ub.payment_status = 'paid' THEN 1 ELSE 0 END) as paidCount,
        SUM(CASE WHEN ub.payment_status IN ('pending', 'overdue') THEN 1 ELSE 0 END) as unpaidCount
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      ${whereClause}
    `;

    const [statsResult] = await query<RowDataPacket[]>(statsQuery, params);

    return {
      data,
      summary: {
        totalBilled: parseFloat(statsResult.totalBilled || '0'),
        totalPaid: parseFloat(statsResult.totalPaid || '0'),
        totalUnpaid: parseFloat(statsResult.totalUnpaid || '0'),
        recordCount: parseInt(statsResult.recordCount || '0'),
        paidCount: parseInt(statsResult.paidCount || '0'),
        unpaidCount: parseInt(statsResult.unpaidCount || '0')
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 납부 정보 업데이트 (상태 + 날짜 + 방법)
   */
  async updatePaymentDetails(
    unitBillId: number,
    updates: {
      paymentStatus?: 'pending' | 'paid' | 'overdue';
      paymentDate?: string | null;
      paymentMethod?: string | null;
    }
  ) {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.paymentStatus !== undefined) {
      fields.push('payment_status = ?');
      params.push(updates.paymentStatus);
    }

    if (updates.paymentDate !== undefined) {
      fields.push('payment_date = ?');
      params.push(updates.paymentDate);
    }

    if (updates.paymentMethod !== undefined) {
      fields.push('payment_method = ?');
      params.push(updates.paymentMethod);
    }

    if (fields.length === 0) {
      return false;
    }

    params.push(unitBillId);

    const result = await execute(
      `UPDATE unit_bills SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return result.affectedRows > 0;
  }
}