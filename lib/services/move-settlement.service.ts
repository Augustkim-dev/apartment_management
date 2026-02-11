// 이사 정산 서비스
// Created: 2026-02-11 (009. 이사 정산 기능 - Step 3)
//
// 퇴거 처리 + 추정 청구서 생성 + 입주자 등록의 전체 비즈니스 로직

import { query, execute, transaction } from '@/lib/db-utils';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2';
import { estimationService } from './estimation.service';
import {
  MoveOutSettlementRequest,
  MoveSettlementResponse,
  RegisterIncomingTenantRequest,
  MoveSettlementListFilters,
  MoveSettlementListItem,
  MoveSettlementDetail,
  EstimationResult,
} from '@/types/move-settlement';

export class MoveSettlementService {
  /**
   * 이사 정산 생성 (퇴거 처리 + 추정 청구서)
   *
   * 전체 흐름:
   * 1. 현재 active tenant 조회
   * 2. 이전 검침값 조회 → 사용량 계산
   * 3. 3개월 평균으로 추정 요금 계산
   * 4. 트랜잭션: move_settlement 생성, unit_bill(move_out) 삽입,
   *    tenant 상태 변경, 입주자 등록(선택), units 테이블 업데이트
   */
  async createMoveOutSettlement(
    request: MoveOutSettlementRequest,
    userId?: number
  ): Promise<MoveSettlementResponse> {
    const { unitId, settlementDate, meterReading, incomingTenant, notes } = request;
    const settlementDateObj = new Date(settlementDate);

    // 1. 현재 active tenant 조회
    const activeTenant = await this.getActiveTenant(unitId);
    if (!activeTenant) {
      return {
        success: false,
        message: '해당 호실에 현재 입주자가 없습니다.',
      };
    }

    // 2. 이전 검침값 조회 (최근 unit_bill 또는 tenant의 move_in_reading)
    const previousReading = await this.getPreviousReading(unitId, activeTenant.id);

    // 3. 퇴거자 사용량 계산
    const outgoingUsage = meterReading - previousReading;
    if (outgoingUsage < 0) {
      return {
        success: false,
        message: `퇴거 시 계량기값(${meterReading})이 이전 검침값(${previousReading})보다 작습니다.`,
      };
    }

    // 4. 청구 기간 결정 (매월 9일 기준)
    const { year: billYear, month: billMonth } =
      estimationService.determineBillingPeriod(settlementDateObj);

    // 5. 3개월 평균으로 추정 요금 계산
    let estimationResult: EstimationResult;
    try {
      const monthsData = await estimationService.getLast3MonthsData(billYear, billMonth);
      const estimatedCharges = estimationService.calculateAverage(monthsData);
      estimationResult = estimationService.calculateMoveOutBill(outgoingUsage, estimatedCharges);
    } catch (error: any) {
      return {
        success: false,
        message: `추정 계산 실패: ${error.message}`,
      };
    }

    // 6. 청구기간 시작일 결정 (해당 월 9일)
    const periodStart = new Date(billYear, billMonth - 1, 9);

    // 7. 트랜잭션으로 모든 데이터 저장
    return await transaction(async (conn) => {
      // 7-a. 해당 월의 monthly_bill 조회 (없으면 null)
      const [monthlyBills] = await conn.execute<RowDataPacket[]>(
        `SELECT id, due_date FROM monthly_bills
         WHERE bill_year = ? AND bill_month = ?
         LIMIT 1`,
        [billYear, billMonth]
      );
      const monthlyBillId = monthlyBills.length > 0 ? monthlyBills[0].id : null;
      const dueDate = monthlyBills.length > 0 ? monthlyBills[0].due_date : null;

      // 7-b. move_settlements 레코드 생성
      const [settlementResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO move_settlements (
          unit_id, settlement_date, bill_year, bill_month,
          outgoing_tenant_id, outgoing_period_start, outgoing_period_end,
          outgoing_meter_reading, outgoing_usage,
          estimated_total_usage, estimated_total_amount,
          estimation_base_months,
          status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          unitId,
          settlementDate,
          billYear,
          billMonth,
          activeTenant.id,
          this.formatDate(periodStart),
          settlementDate,
          meterReading,
          outgoingUsage,
          estimationResult.estimatedCharges.avgTotalUsage,
          estimationResult.estimatedCharges.avgTotalAmount,
          JSON.stringify(estimationResult.estimatedCharges.baseMonths),
          notes || null,
          userId || null,
        ]
      );
      const settlementId = settlementResult.insertId;

      // 7-c. unit_bills에 move_out 청구서 삽입
      let unitBillId: number | null = null;
      if (monthlyBillId) {
        const bill = estimationResult.calculatedBill;
        const [billResult] = await conn.execute<ResultSetHeader>(
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
            payment_status, due_date
          ) VALUES (?, ?, ?, ?, 'move_out', ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 'pending', ?)`,
          [
            monthlyBillId,
            unitId,
            activeTenant.id,
            activeTenant.name,
            settlementId,
            this.formatDate(periodStart),
            this.formatDate(settlementDateObj),
            previousReading,
            meterReading,
            outgoingUsage,
            bill.usageRatio,
            bill.basicFee,
            bill.powerFee,
            bill.climateFee,
            bill.fuelFee,
            bill.powerFactorFee,
            bill.vat,
            bill.powerFund,
            bill.totalAmount,
            dueDate,
          ]
        );
        unitBillId = billResult.insertId;
      }

      // 7-d. 퇴거 tenant 상태 변경
      await conn.execute(
        `UPDATE tenants SET
          status = 'moved_out',
          move_out_date = ?,
          move_out_reading = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [this.formatDate(settlementDateObj), meterReading, activeTenant.id]
      );

      // 7-e. 입주자 등록 (선택사항)
      let incomingTenantId: number | null = null;
      if (incomingTenant) {
        const [tenantResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO tenants (
            unit_id, name, contact, email,
            status, move_in_date, move_in_reading
          ) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
          [
            unitId,
            incomingTenant.name,
            incomingTenant.contact || null,
            incomingTenant.email || null,
            incomingTenant.moveInDate,
            incomingTenant.moveInReading,
          ]
        );
        incomingTenantId = tenantResult.insertId;

        // move_settlement에 입주자 정보 업데이트
        await conn.execute(
          `UPDATE move_settlements SET
            incoming_tenant_id = ?,
            incoming_period_start = ?,
            incoming_meter_reading = ?
          WHERE id = ?`,
          [
            incomingTenantId,
            incomingTenant.moveInDate,
            incomingTenant.moveInReading,
            settlementId,
          ]
        );

        // units 테이블 업데이트 (새 입주자)
        await conn.execute(
          `UPDATE units SET
            tenant_name = ?,
            contact = ?,
            email = ?,
            status = 'occupied',
            move_in_date = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            incomingTenant.name,
            incomingTenant.contact || null,
            incomingTenant.email || null,
            incomingTenant.moveInDate,
            unitId,
          ]
        );
      } else {
        // 입주자 미등록 → 호실 공실 처리
        await conn.execute(
          `UPDATE units SET
            tenant_name = NULL,
            contact = NULL,
            email = NULL,
            status = 'vacant',
            move_out_date = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [this.formatDate(settlementDateObj), unitId]
        );
      }

      return {
        success: true,
        message: '이사 정산이 성공적으로 생성되었습니다.',
        settlementId,
        unitBillId: unitBillId || undefined,
        estimationResult,
      };
    });
  }

  /**
   * 입주자 나중에 등록 (정산 생성 시 입주자를 등록하지 않은 경우)
   */
  async registerIncomingTenant(
    settlementId: number,
    request: RegisterIncomingTenantRequest
  ): Promise<MoveSettlementResponse> {
    // 정산 조회
    const settlement = await query<RowDataPacket[]>(
      `SELECT * FROM move_settlements WHERE id = ? AND status != 'cancelled'`,
      [settlementId]
    );

    if (settlement.length === 0) {
      return { success: false, message: '이사 정산을 찾을 수 없습니다.' };
    }

    if (settlement[0].incoming_tenant_id) {
      return { success: false, message: '이미 입주자가 등록되어 있습니다.' };
    }

    return await transaction(async (conn) => {
      const unitId = settlement[0].unit_id;

      // 입주자 생성
      const [tenantResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO tenants (
          unit_id, name, contact, email,
          status, move_in_date, move_in_reading
        ) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [
          unitId,
          request.name,
          request.contact || null,
          request.email || null,
          request.moveInDate,
          request.moveInReading,
        ]
      );
      const incomingTenantId = tenantResult.insertId;

      // move_settlement 업데이트
      await conn.execute(
        `UPDATE move_settlements SET
          incoming_tenant_id = ?,
          incoming_period_start = ?,
          incoming_meter_reading = ?
        WHERE id = ?`,
        [incomingTenantId, request.moveInDate, request.moveInReading, settlementId]
      );

      // units 테이블 업데이트
      await conn.execute(
        `UPDATE units SET
          tenant_name = ?,
          contact = ?,
          email = ?,
          status = 'occupied',
          move_in_date = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          request.name,
          request.contact || null,
          request.email || null,
          request.moveInDate,
          unitId,
        ]
      );

      return {
        success: true,
        message: '입주자가 성공적으로 등록되었습니다.',
        settlementId,
      };
    });
  }

  /**
   * 이사 정산 목록 조회
   */
  async getSettlements(
    filters: MoveSettlementListFilters
  ): Promise<{ items: MoveSettlementListItem[]; total: number }> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (filters.unitNumber) {
      whereClause += ' AND u.unit_number LIKE ?';
      params.push(`%${filters.unitNumber}%`);
    }

    if (filters.startDate) {
      const [startYear, startMonth] = filters.startDate.split('-').map(Number);
      whereClause += ' AND (ms.bill_year > ? OR (ms.bill_year = ? AND ms.bill_month >= ?))';
      params.push(startYear, startYear, startMonth);
    }

    if (filters.endDate) {
      const [endYear, endMonth] = filters.endDate.split('-').map(Number);
      whereClause += ' AND (ms.bill_year < ? OR (ms.bill_year = ? AND ms.bill_month <= ?))';
      params.push(endYear, endYear, endMonth);
    }

    if (filters.status && filters.status !== 'all') {
      whereClause += ' AND ms.status = ?';
      params.push(filters.status);
    }

    // 전체 건수
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM move_settlements ms
       JOIN units u ON ms.unit_id = u.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 목록 조회
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const listParams = [...params, limit, offset];
    const rows = await query<RowDataPacket[]>(
      `SELECT
        ms.id,
        u.unit_number AS unitNumber,
        ms.settlement_date AS settlementDate,
        ms.bill_year AS billYear,
        ms.bill_month AS billMonth,
        ot.name AS outgoingTenantName,
        it.name AS incomingTenantName,
        ms.outgoing_usage AS outgoingUsage,
        ms.estimated_total_amount AS estimatedAmount,
        ms.status,
        ms.created_at AS createdAt
      FROM move_settlements ms
      JOIN units u ON ms.unit_id = u.id
      JOIN tenants ot ON ms.outgoing_tenant_id = ot.id
      LEFT JOIN tenants it ON ms.incoming_tenant_id = it.id
      WHERE ${whereClause}
      ORDER BY ms.created_at DESC
      LIMIT ? OFFSET ?`,
      listParams
    );

    const items: MoveSettlementListItem[] = rows.map((row) => ({
      id: row.id,
      unitNumber: row.unitNumber,
      settlementDate: row.settlementDate,
      billYear: row.billYear,
      billMonth: row.billMonth,
      outgoingTenantName: row.outgoingTenantName,
      incomingTenantName: row.incomingTenantName || null,
      outgoingUsage: row.outgoingUsage != null ? parseFloat(row.outgoingUsage) : null,
      estimatedAmount: row.estimatedAmount != null ? parseFloat(row.estimatedAmount) : null,
      status: row.status,
      createdAt: row.createdAt,
    }));

    return { items, total };
  }

  /**
   * 이사 정산 상세 조회
   */
  async getSettlementDetail(id: number): Promise<MoveSettlementDetail | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT
        ms.*,
        u.unit_number,
        ot.name AS outgoing_name,
        ot.contact AS outgoing_contact,
        ot.move_in_date AS outgoing_move_in_date,
        it.name AS incoming_name,
        it.contact AS incoming_contact
      FROM move_settlements ms
      JOIN units u ON ms.unit_id = u.id
      JOIN tenants ot ON ms.outgoing_tenant_id = ot.id
      LEFT JOIN tenants it ON ms.incoming_tenant_id = it.id
      WHERE ms.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    // 퇴거자 청구서 조회
    const billRows = await query<RowDataPacket[]>(
      `SELECT id, total_amount, is_estimated, payment_status
       FROM unit_bills
       WHERE move_settlement_id = ? AND bill_type = 'move_out'
       LIMIT 1`,
      [id]
    );

    const outgoingBill = billRows.length > 0
      ? {
          id: billRows[0].id,
          totalAmount: parseFloat(billRows[0].total_amount),
          isEstimated: !!billRows[0].is_estimated,
          paymentStatus: billRows[0].payment_status,
        }
      : null;

    // baseMonths 파싱
    let baseMonths: { year: number; month: number }[] = [];
    try {
      if (row.estimation_base_months) {
        baseMonths = JSON.parse(row.estimation_base_months);
      }
    } catch {
      baseMonths = [];
    }

    return {
      id: row.id,
      unitId: row.unit_id,
      unitNumber: row.unit_number,
      settlementDate: row.settlement_date,
      billYear: row.bill_year,
      billMonth: row.bill_month,
      status: row.status,

      outgoingTenant: {
        id: row.outgoing_tenant_id,
        name: row.outgoing_name,
        contact: row.outgoing_contact,
        periodStart: row.outgoing_period_start,
        periodEnd: row.outgoing_period_end,
        meterReading: row.outgoing_meter_reading != null
          ? parseFloat(row.outgoing_meter_reading) : null,
        usage: row.outgoing_usage != null
          ? parseFloat(row.outgoing_usage) : null,
      },

      incomingTenant: row.incoming_tenant_id
        ? {
            id: row.incoming_tenant_id,
            name: row.incoming_name,
            contact: row.incoming_contact,
            periodStart: row.incoming_period_start,
            meterReading: row.incoming_meter_reading != null
              ? parseFloat(row.incoming_meter_reading) : null,
          }
        : null,

      estimation: {
        totalUsage: row.estimated_total_usage != null
          ? parseFloat(row.estimated_total_usage) : null,
        totalAmount: row.estimated_total_amount != null
          ? parseFloat(row.estimated_total_amount) : null,
        baseMonths,
      },

      outgoingBill,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  /**
   * 이사 정산 상태 변경 (완료 등)
   */
  async updateSettlementStatus(
    id: number,
    status: 'completed' | 'cancelled'
  ): Promise<MoveSettlementResponse> {
    const result = await execute(
      `UPDATE move_settlements SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: '이사 정산을 찾을 수 없습니다.' };
    }

    return {
      success: true,
      message: status === 'cancelled'
        ? '이사 정산이 취소되었습니다.'
        : '이사 정산이 완료 처리되었습니다.',
      settlementId: id,
    };
  }

  /**
   * 이사 정산 롤백 (되돌리기)
   *
   * 정산 생성 시 수행된 모든 변경을 역순으로 되돌립니다:
   * 1. unit_bills에서 move_out, move_in 청구서 삭제
   * 2. 퇴거 tenant → active로 복원
   * 3. 입주 tenant 삭제 (정산으로 생성된 경우)
   * 4. units 테이블에 원래 퇴거자 정보 복원
   * 5. move_settlements status → cancelled
   */
  async rollbackSettlement(id: number): Promise<MoveSettlementResponse> {
    // 1. 정산 조회
    const settlements = await query<RowDataPacket[]>(
      `SELECT ms.*, u.unit_number
       FROM move_settlements ms
       JOIN units u ON ms.unit_id = u.id
       WHERE ms.id = ?`,
      [id]
    );

    if (settlements.length === 0) {
      return { success: false, message: '이사 정산을 찾을 수 없습니다.' };
    }

    const settlement = settlements[0];

    if (settlement.status === 'cancelled') {
      return { success: false, message: '이미 취소된 정산입니다.' };
    }

    // 2. 퇴거자 청구서의 납부 상태 확인
    const paidBills = await query<RowDataPacket[]>(
      `SELECT id, payment_status FROM unit_bills
       WHERE move_settlement_id = ? AND payment_status = 'paid'`,
      [id]
    );

    if (paidBills.length > 0) {
      return {
        success: false,
        message: '이미 납부 완료된 청구서가 있어 롤백할 수 없습니다. 먼저 납부 상태를 변경해주세요.',
      };
    }

    // 3. 퇴거 tenant 정보 조회
    const outgoingTenantId = settlement.outgoing_tenant_id;
    const outgoingTenants = await query<RowDataPacket[]>(
      `SELECT * FROM tenants WHERE id = ?`,
      [outgoingTenantId]
    );

    if (outgoingTenants.length === 0) {
      return { success: false, message: '퇴거자 정보를 찾을 수 없습니다.' };
    }

    const outgoingTenant = outgoingTenants[0];
    const unitId = settlement.unit_id;
    const incomingTenantId = settlement.incoming_tenant_id;

    // 4. 트랜잭션으로 롤백 실행
    return await transaction(async (conn) => {
      // 4-a. unit_bills에서 이 정산과 관련된 모든 청구서 삭제
      //      (move_out 청구서 + 재계산으로 생성된 move_in 청구서)
      await conn.execute(
        `DELETE FROM unit_bills WHERE move_settlement_id = ?`,
        [id]
      );

      // move_in 청구서가 move_settlement_id 없이 생성된 경우도 처리
      // (입주 tenant_id + bill_type='move_in'으로 조회)
      if (incomingTenantId) {
        await conn.execute(
          `DELETE FROM unit_bills
           WHERE unit_id = ? AND tenant_id = ? AND bill_type = 'move_in'`,
          [unitId, incomingTenantId]
        );
      }

      // 4-b. 퇴거 tenant를 active로 복원
      await conn.execute(
        `UPDATE tenants SET
          status = 'active',
          move_out_date = NULL,
          move_out_reading = NULL,
          updated_at = NOW()
        WHERE id = ?`,
        [outgoingTenantId]
      );

      // 4-c. 입주 tenant 삭제 (있는 경우)
      if (incomingTenantId) {
        // 입주자에게 다른 청구서가 있는지 확인 (안전장치)
        const otherBills = await conn.execute<RowDataPacket[]>(
          `SELECT COUNT(*) as cnt FROM unit_bills WHERE tenant_id = ?`,
          [incomingTenantId]
        );
        const billCount = (otherBills as any)[0][0]?.cnt || 0;

        if (billCount === 0) {
          // 다른 청구서가 없으면 삭제 가능
          await conn.execute(
            `DELETE FROM tenants WHERE id = ?`,
            [incomingTenantId]
          );
        } else {
          // 다른 청구서가 있으면 삭제하지 않고 상태만 변경
          await conn.execute(
            `UPDATE tenants SET
              status = 'moved_out',
              notes = CONCAT(COALESCE(notes, ''), '\n[롤백] 정산 #${id} 롤백으로 인한 상태 변경'),
              updated_at = NOW()
            WHERE id = ?`,
            [incomingTenantId]
          );
        }
      }

      // 4-d. units 테이블에 퇴거자 정보 복원
      await conn.execute(
        `UPDATE units SET
          tenant_name = ?,
          contact = ?,
          email = ?,
          status = 'occupied',
          move_out_date = NULL,
          updated_at = NOW()
        WHERE id = ?`,
        [
          outgoingTenant.name,
          outgoingTenant.contact,
          outgoingTenant.email,
          unitId,
        ]
      );

      // 4-e. move_settlements 상태를 cancelled로 변경
      await conn.execute(
        `UPDATE move_settlements SET
          status = 'cancelled',
          notes = CONCAT(COALESCE(notes, ''), '\n[롤백] ', NOW(), ' 정산이 롤백되었습니다.'),
          updated_at = NOW()
        WHERE id = ?`,
        [id]
      );

      return {
        success: true,
        message: `${settlement.unit_number}호 이사 정산이 롤백되었습니다. 퇴거자(${outgoingTenant.name})가 다시 active 상태로 복원되었습니다.`,
        settlementId: id,
      };
    });
  }

  // ============================================
  // Private helpers
  // ============================================

  /**
   * 호실의 현재 active tenant 조회
   */
  private async getActiveTenant(unitId: number): Promise<RowDataPacket | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, name, contact, email, move_in_date, move_in_reading
       FROM tenants
       WHERE unit_id = ? AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [unitId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 이전 검침값 조회
   * 1순위: 최근 regular unit_bill의 current_reading
   * 2순위: tenant의 move_in_reading
   */
  private async getPreviousReading(
    unitId: number,
    tenantId: number
  ): Promise<number> {
    // 최근 regular unit_bill에서 조회
    const billRows = await query<RowDataPacket[]>(
      `SELECT ub.current_reading
       FROM unit_bills ub
       JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
       WHERE ub.unit_id = ?
         AND ub.bill_type = 'regular'
         AND ub.current_reading IS NOT NULL
       ORDER BY mb.bill_year DESC, mb.bill_month DESC
       LIMIT 1`,
      [unitId]
    );

    if (billRows.length > 0 && billRows[0].current_reading != null) {
      return parseFloat(billRows[0].current_reading);
    }

    // tenant의 move_in_reading
    const tenantRows = await query<RowDataPacket[]>(
      `SELECT move_in_reading FROM tenants WHERE id = ?`,
      [tenantId]
    );

    if (tenantRows.length > 0 && tenantRows[0].move_in_reading != null) {
      return parseFloat(tenantRows[0].move_in_reading);
    }

    return 0;
  }

  /**
   * Date를 YYYY-MM-DD 문자열로 변환
   */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// 싱글턴 인스턴스
export const moveSettlementService = new MoveSettlementService();
