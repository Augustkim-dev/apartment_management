import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';
import { estimationService } from '@/lib/services/estimation.service';

interface MoveSettlementRow extends RowDataPacket {
  id: number;
  unit_number: string;
  bill_year: number;
  bill_month: number;
  settlement_date: string | null;
  outgoing_name: string;
  outgoing_usage: number;
  estimated_charge: number | null;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user.unitId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 입주일 기준 필터: 본인 입주 기간의 정산만 조회
    const moveInDate = session.user.moveInDate ? new Date(session.user.moveInDate) : null;
    const dateFilter = moveInDate ? 'AND ms.settlement_date >= ?' : '';
    const params: any[] = moveInDate
      ? [session.user.unitId, moveInDate.toISOString().split('T')[0]]
      : [session.user.unitId];

    const settlements = await query<MoveSettlementRow[]>(
      `SELECT ms.id, ms.bill_year, ms.bill_month, ms.settlement_date,
              ms.outgoing_usage, ms.status,
              u.unit_number, ot.name AS outgoing_name,
              COALESCE(
                ub.total_amount,
                NULLIF(
                  COALESCE(ms.estimated_basic_fee, 0) + COALESCE(ms.estimated_power_fee, 0) +
                  COALESCE(ms.estimated_climate_fee, 0) + COALESCE(ms.estimated_fuel_fee, 0) +
                  COALESCE(ms.estimated_power_factor_fee, 0) + COALESCE(ms.estimated_vat, 0) +
                  COALESCE(ms.estimated_power_fund, 0), 0
                )
              ) AS estimated_charge
       FROM move_settlements ms
       JOIN units u ON ms.unit_id = u.id
       JOIN tenants ot ON ms.outgoing_tenant_id = ot.id
       LEFT JOIN unit_bills ub ON ub.move_settlement_id = ms.id AND ub.bill_type = 'move_out'
       WHERE ms.unit_id = ? AND ms.status != 'cancelled'
       ${dateFilter}
       ORDER BY ms.created_at DESC`,
      params
    );

    // estimated_charge가 NULL인 정산은 estimationService로 재계산
    const result = await Promise.all(settlements.map(async (row) => {
      let charge = row.estimated_charge != null ? Number(row.estimated_charge) : null;

      if (charge == null) {
        try {
          const outgoingUsage = Number(row.outgoing_usage) || 0;
          const monthsData = await estimationService.getLast3MonthsData(row.bill_year, row.bill_month);
          const estimatedCharges = estimationService.calculateAverage(monthsData);
          const result = estimationService.calculateMoveOutBill(outgoingUsage, estimatedCharges);
          charge = result.calculatedBill.totalAmount;
        } catch {
          charge = 0;
        }
      }

      return {
        id: row.id,
        unitNumber: row.unit_number,
        billYear: row.bill_year,
        billMonth: row.bill_month,
        settlementDate: row.settlement_date,
        outgoingName: row.outgoing_name,
        outgoingUsage: row.outgoing_usage,
        estimatedTotalAmount: charge,
        status: row.status,
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user move settlements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch move settlements' },
      { status: 500 }
    );
  }
}
