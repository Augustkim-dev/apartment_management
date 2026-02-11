import { execute, query, transaction } from '@/lib/db-utils';
import { CalculationResult, UnitBillCalculation } from '@/types/calculation';
import { ResultSetHeader, RowDataPacket, PoolConnection } from 'mysql2';
import {
  UnitBillEditRequest,
  UnitBillEditResponse,
  UnitBillEditData,
  ProportionalCalculationResult
} from '@/types/unit-bill-edit';

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
      // 이사정산 청구서(move_out)는 보호하고 regular, move_in만 삭제
      await conn.execute(
        "DELETE FROM unit_bills WHERE monthly_bill_id = ? AND bill_type IN ('regular', 'move_in')",
        [monthlyBillId]
      );

      // 이사 정산 호실 조회 (해당 월에 move_settlements가 있는 호실)
      const [monthlyBillInfo] = await conn.execute<RowDataPacket[]>(
        'SELECT bill_year, bill_month FROM monthly_bills WHERE id = ?',
        [monthlyBillId]
      );
      const billYear = monthlyBillInfo.length > 0 ? monthlyBillInfo[0].bill_year : null;
      const billMonth = monthlyBillInfo.length > 0 ? monthlyBillInfo[0].bill_month : null;

      // 이사 정산이 있는 호실 목록 (unitId → settlement 정보)
      const moveSettlementUnits = new Map<number, RowDataPacket>();
      if (billYear && billMonth) {
        const [settlements] = await conn.execute<RowDataPacket[]>(
          `SELECT ms.*, it.name AS incoming_tenant_name
           FROM move_settlements ms
           LEFT JOIN tenants it ON ms.incoming_tenant_id = it.id
           WHERE ms.bill_year = ? AND ms.bill_month = ?
             AND ms.status != 'cancelled'`,
          [billYear, billMonth]
        );
        for (const s of settlements) {
          moveSettlementUnits.set(s.unit_id, s);
        }
      }

      // monthly_bills에서 due_date 및 건물 전체 요금 데이터 조회
      const [monthlyBills] = await conn.execute<RowDataPacket[]>(
        `SELECT due_date, total_usage, basic_fee, power_fee, climate_fee,
                fuel_fee, power_factor_fee, vat, power_fund
         FROM monthly_bills WHERE id = ?`,
        [monthlyBillId]
      );

      const dueDate = monthlyBills.length > 0 ? monthlyBills[0].due_date : null;
      const buildingData = monthlyBills.length > 0 ? monthlyBills[0] : null;

      // 각 호실별 청구서 저장
      const savedBills = [];

      for (const unitBill of calculationResult.unitBills) {
        // units 테이블에서 unit_id + active tenant 조회
        const [units] = await conn.execute<RowDataPacket[]>(
          `SELECT u.id, t.id AS tenant_id, t.name AS tenant_name
           FROM units u
           LEFT JOIN tenants t ON t.unit_id = u.id AND t.status = 'active'
           WHERE u.unit_number = ?`,
          [unitBill.unitNumber]
        );

        if (units.length === 0) {
          console.warn(`Unit ${unitBill.unitNumber} not found in database, skipping...`);
          continue;
        }

        const unitId = units[0].id;
        const tenantId = units[0].tenant_id || null;
        const tenantName = units[0].tenant_name || null;

        // 이사 정산 호실 체크
        const settlement = moveSettlementUnits.get(unitId);

        if (settlement) {
          // 이사 정산 호실: move_in 청구서 생성
          // 입주자 사용량 = 전체 사용량 - 퇴거자 사용량
          const outgoingUsage = parseFloat(settlement.outgoing_usage) || 0;
          const moveInUsage = unitBill.usage - outgoingUsage;

          // 건물 전체 사용량 기준 입주자 비율 (monthly_bills 실제 데이터 사용)
          const bldgTotalUsage = buildingData ? (parseFloat(buildingData.total_usage) || 1) : 1;
          const moveInRatio = moveInUsage / bldgTotalUsage;

          // 각 요금항목 비례 계산 (10원 단위 반올림) - recalculateFees() 패턴 동일
          const moveInBasicFee = Math.round(((parseFloat(buildingData?.basic_fee) || 0) * moveInRatio) / 10) * 10;
          const moveInPowerFee = Math.round(((parseFloat(buildingData?.power_fee) || 0) * moveInRatio) / 10) * 10;
          const moveInClimateFee = Math.round(((parseFloat(buildingData?.climate_fee) || 0) * moveInRatio) / 10) * 10;
          const moveInFuelFee = Math.round(((parseFloat(buildingData?.fuel_fee) || 0) * moveInRatio) / 10) * 10;
          const moveInPowerFactorFee = Math.round(((parseFloat(buildingData?.power_factor_fee) || 0) * moveInRatio) / 10) * 10;
          const moveInVat = Math.round(((parseFloat(buildingData?.vat) || 0) * moveInRatio) / 10) * 10;
          const moveInPowerFund = Math.round(((parseFloat(buildingData?.power_fund) || 0) * moveInRatio) / 10) * 10;
          const moveInTotal = moveInBasicFee + moveInPowerFee + moveInClimateFee + moveInFuelFee + moveInPowerFactorFee + moveInVat + moveInPowerFund;

          const incomingTenantId = settlement.incoming_tenant_id || null;
          const incomingTenantName = settlement.incoming_tenant_name || null;

          const [result] = await conn.execute<ResultSetHeader>(
            `INSERT INTO unit_bills (
              monthly_bill_id, unit_id,
              tenant_id, tenant_name_snapshot,
              bill_type, move_settlement_id,
              billing_period_start, billing_period_end,
              is_estimated,
              previous_reading, current_reading,
              usage_amount, usage_rate,
              basic_fee, power_fee, climate_fee, fuel_fee,
              power_factor_fee, vat, power_fund,
              tv_license_fee, round_down,
              total_amount, unpaid_amount,
              payment_status, due_date, notes
            ) VALUES (?, ?, ?, ?, 'move_in', ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 'pending', ?, ?)`,
            [
              monthlyBillId,
              unitId,
              incomingTenantId,
              incomingTenantName,
              settlement.id,
              settlement.incoming_period_start || settlement.outgoing_period_end,
              null, // billing_period_end는 월말 검침시 확정
              settlement.incoming_meter_reading || unitBill.previousReading || null,
              unitBill.currentReading || null,
              moveInUsage,
              moveInRatio,
              moveInBasicFee,
              moveInPowerFee,
              moveInClimateFee,
              moveInFuelFee,
              moveInPowerFactorFee,
              moveInVat,
              moveInPowerFund,
              moveInTotal,
              dueDate,
              options?.notes || null,
            ]
          );

          savedBills.push({
            unitBillId: result.insertId,
            unitNumber: unitBill.unitNumber,
            totalAmount: moveInTotal,
          });
        } else {
          // 일반 호실: regular 청구서 생성 (기존 로직)
          const [result] = await conn.execute<ResultSetHeader>(
            `INSERT INTO unit_bills (
              monthly_bill_id, unit_id,
              tenant_id, tenant_name_snapshot,
              bill_type,
              previous_reading, current_reading,
              usage_amount, usage_rate,
              basic_fee, power_fee, climate_fee, fuel_fee,
              vat, power_fund, tv_license_fee, round_down,
              total_amount, unpaid_amount,
              payment_status, due_date, notes
            ) VALUES (?, ?, ?, ?, 'regular', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
            [
              monthlyBillId,
              unitId,
              tenantId,
              tenantName,
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
              dueDate,
              options?.notes || null,
            ]
          );

          savedBills.push({
            unitBillId: result.insertId,
            unitNumber: unitBill.unitNumber,
            totalAmount: unitBill.totalAmount,
          });
        }
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
        COALESCE(ub.tenant_name_snapshot, u.tenant_name) AS tenant_name,
        u.contact,
        u.email
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      WHERE ub.monthly_bill_id = ?
      ORDER BY u.unit_number, ub.bill_type`,
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

  /**
   * 호실별 청구서 편집을 위한 데이터 조회
   */
  async getUnitBillEditData(monthlyBillId: number, unitBillId: number): Promise<UnitBillEditData | null> {
    // 호실 청구서 데이터 조회
    const unitBills = await query<RowDataPacket[]>(
      `SELECT
        ub.*,
        u.unit_number,
        u.tenant_name
      FROM unit_bills ub
      JOIN units u ON ub.unit_id = u.id
      WHERE ub.id = ? AND ub.monthly_bill_id = ?`,
      [unitBillId, monthlyBillId]
    );

    if (unitBills.length === 0) {
      return null;
    }

    // 건물 전체 데이터 조회
    const buildingData = await query<RowDataPacket[]>(
      `SELECT
        id,
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
        tv_license_fee,
        round_down,
        total_amount
      FROM monthly_bills
      WHERE id = ?`,
      [monthlyBillId]
    );

    if (buildingData.length === 0) {
      return null;
    }

    // 해당 월의 전체 호실 사용량 합계
    const usageSum = await query<RowDataPacket[]>(
      `SELECT SUM(usage_amount) as total_unit_usage
      FROM unit_bills
      WHERE monthly_bill_id = ?`,
      [monthlyBillId]
    );

    return {
      unitBill: unitBills[0],
      buildingData: buildingData[0],
      totalUnitUsage: parseFloat(usageSum[0]?.total_unit_usage || '0')
    };
  }

  /**
   * 비율 재계산
   */
  async recalculateFees(
    conn: PoolConnection,
    monthlyBillId: number,
    unitBillId: number,
    newUsage: number
  ): Promise<ProportionalCalculationResult> {
    // 건물 전체 데이터 조회
    const [buildingData] = await conn.execute<RowDataPacket[]>(
      `SELECT
        total_usage,
        basic_fee,
        power_fee,
        climate_fee,
        fuel_fee,
        power_factor_fee,
        vat,
        power_fund,
        tv_license_fee
      FROM monthly_bills
      WHERE id = ?`,
      [monthlyBillId]
    );

    if (buildingData.length === 0) {
      throw new Error('건물 전체 데이터를 찾을 수 없습니다.');
    }

    const building = buildingData[0];
    const totalUsage = parseFloat(building.total_usage) || 0;

    // 사용량 비율 계산
    const usageRate = newUsage / totalUsage;

    // 각 요금 항목 비율 계산 (10원 단위 반올림)
    // null 또는 undefined 값을 0으로 처리
    const basicFee = Math.round(((parseFloat(building.basic_fee) || 0) * usageRate) / 10) * 10;
    const powerFee = Math.round(((parseFloat(building.power_fee) || 0) * usageRate) / 10) * 10;
    const climateFee = Math.round(((parseFloat(building.climate_fee) || 0) * usageRate) / 10) * 10;
    const fuelFee = Math.round(((parseFloat(building.fuel_fee) || 0) * usageRate) / 10) * 10;
    const powerFactorFee = Math.round(((parseFloat(building.power_factor_fee) || 0) * usageRate) / 10) * 10;
    const vat = Math.round(((parseFloat(building.vat) || 0) * usageRate) / 10) * 10;
    const powerFund = Math.round(((parseFloat(building.power_fund) || 0) * usageRate) / 10) * 10;
    const tvLicenseFee = Math.round(((parseFloat(building.tv_license_fee) || 0) * usageRate) / 10) * 10;

    // 총액 계산
    const totalAmount = basicFee + powerFee + climateFee + fuelFee + powerFactorFee + vat + powerFund + tvLicenseFee;

    console.log('recalculateFees - 계산 완료:', {
      usageRate,
      totalAmount,
      breakdown: { basicFee, powerFee, climateFee, fuelFee, powerFactorFee, vat, powerFund, tvLicenseFee }
    });

    return {
      usageRate,
      basicFee,
      powerFee,
      climateFee,
      fuelFee,
      powerFactorFee,
      vat,
      powerFund,
      tvLicenseFee,
      roundDown: 0,
      totalAmount
    };
  }

  /**
   * 호실별 청구서 업데이트
   */
  async updateUnitBill(
    unitBillId: number,
    monthlyBillId: number,
    updates: UnitBillEditRequest,
    userId: number = 1
  ): Promise<UnitBillEditResponse> {
    return await transaction(async (conn) => {
      try {
        // 1. 현재 청구서 데이터 조회
        const [currentBills] = await conn.execute<RowDataPacket[]>(
          'SELECT * FROM unit_bills WHERE id = ?',
          [unitBillId]
        );

        if (currentBills.length === 0) {
          return {
            success: false,
            message: '청구서를 찾을 수 없습니다.'
          };
        }

        const currentBill = currentBills[0];

        // 2. 비율 재계산 모드인 경우
        let finalUpdates = { ...updates };
        console.log('서비스 - 받은 updates:', updates);

        if (updates.editMode === 'proportional') {
          console.log('비율재계산 모드 - recalculateFees 호출');
          const calculated = await this.recalculateFees(
            conn,
            monthlyBillId,
            unitBillId,
            updates.usageAmount
          );
          console.log('비율재계산 결과:', calculated);

          finalUpdates = {
            ...updates,
            usageRate: calculated.usageRate,
            basicFee: calculated.basicFee,
            powerFee: calculated.powerFee,
            climateFee: calculated.climateFee,
            fuelFee: calculated.fuelFee,
            powerFactorFee: calculated.powerFactorFee,
            vat: calculated.vat,
            powerFund: calculated.powerFund,
            tvLicenseFee: calculated.tvLicenseFee,
            roundDown: calculated.roundDown,
            totalAmount: calculated.totalAmount
          };
          console.log('finalUpdates (비율재계산):', finalUpdates);
        } else {
          console.log('직접입력 모드 - finalUpdates:', finalUpdates);
        }

        // 3. unit_bills 업데이트
        const updateParams = [
          finalUpdates.previousReading ?? currentBill.previous_reading,
          finalUpdates.currentReading ?? currentBill.current_reading,
          finalUpdates.usageAmount,
          finalUpdates.usageRate ?? currentBill.usage_rate,
          finalUpdates.basicFee ?? currentBill.basic_fee,
          finalUpdates.powerFee ?? currentBill.power_fee,
          finalUpdates.climateFee ?? currentBill.climate_fee,
          finalUpdates.fuelFee ?? currentBill.fuel_fee,
          finalUpdates.powerFactorFee ?? currentBill.power_factor_fee,
          finalUpdates.vat ?? currentBill.vat,
          finalUpdates.powerFund ?? currentBill.power_fund,
          finalUpdates.tvLicenseFee ?? currentBill.tv_license_fee,
          finalUpdates.roundDown ?? currentBill.round_down,
          finalUpdates.totalAmount,
          finalUpdates.editReason,
          finalUpdates.notes ?? currentBill.notes,
          unitBillId
        ];

        console.log('DB UPDATE 실행 - 파라미터:', {
          totalAmount: finalUpdates.totalAmount,
          usageRate: finalUpdates.usageRate,
          unitBillId
        });

        const [updateResult] = await conn.execute<ResultSetHeader>(
          `UPDATE unit_bills SET
            previous_reading = ?,
            current_reading = ?,
            usage_amount = ?,
            usage_rate = ?,
            basic_fee = ?,
            power_fee = ?,
            climate_fee = ?,
            fuel_fee = ?,
            power_factor_fee = ?,
            vat = ?,
            power_fund = ?,
            tv_license_fee = ?,
            round_down = ?,
            total_amount = ?,
            edit_reason = ?,
            notes = ?,
            is_manually_edited = TRUE,
            updated_at = NOW()
          WHERE id = ?`,
          updateParams
        );

        console.log('DB UPDATE 결과:', {
          affectedRows: updateResult.affectedRows,
          changedRows: updateResult.changedRows
        });

        if (updateResult.affectedRows === 0) {
          return {
            success: false,
            message: '청구서 업데이트에 실패했습니다.'
          };
        }

        // 4. bill_history에 감사 기록 생성
        const oldValues = {
          usageAmount: currentBill.usage_amount,
          totalAmount: currentBill.total_amount,
          basicFee: currentBill.basic_fee,
          powerFee: currentBill.power_fee,
          climateFee: currentBill.climate_fee,
          fuelFee: currentBill.fuel_fee,
          powerFactorFee: currentBill.power_factor_fee,
          vat: currentBill.vat,
          powerFund: currentBill.power_fund,
          tvLicenseFee: currentBill.tv_license_fee,
          roundDown: currentBill.round_down
        };

        const newValues = {
          usageAmount: finalUpdates.usageAmount,
          totalAmount: finalUpdates.totalAmount,
          basicFee: finalUpdates.basicFee,
          powerFee: finalUpdates.powerFee,
          climateFee: finalUpdates.climateFee,
          fuelFee: finalUpdates.fuelFee,
          powerFactorFee: finalUpdates.powerFactorFee,
          vat: finalUpdates.vat,
          powerFund: finalUpdates.powerFund,
          tvLicenseFee: finalUpdates.tvLicenseFee,
          roundDown: finalUpdates.roundDown,
          editMode: finalUpdates.editMode,
          editReason: finalUpdates.editReason
        };

        const [historyResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO bill_history
            (unit_bill_id, action, old_values, new_values, changed_by)
          VALUES (?, 'updated', ?, ?, ?)`,
          [
            unitBillId,
            JSON.stringify(oldValues),
            JSON.stringify(newValues),
            userId
          ]
        );

        // 5. 업데이트된 청구서 조회
        const [updatedBills] = await conn.execute<RowDataPacket[]>(
          'SELECT * FROM unit_bills WHERE id = ?',
          [unitBillId]
        );

        return {
          success: true,
          message: '청구서가 수정되었습니다.',
          updatedBill: updatedBills[0],
          historyId: historyResult.insertId
        };
      } catch (error) {
        console.error('Error updating unit bill:', error);
        return {
          success: false,
          message: `청구서 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        };
      }
    });
  }
}