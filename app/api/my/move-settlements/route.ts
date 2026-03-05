import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';

interface MoveSettlementRow extends RowDataPacket {
  id: number;
  unit_number: string;
  bill_year: number;
  bill_month: number;
  settlement_date: string | null;
  outgoing_name: string;
  outgoing_usage: number;
  estimated_total_amount: number;
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

    const settlements = await query<MoveSettlementRow[]>(
      `SELECT ms.*, u.unit_number, ot.name AS outgoing_name
       FROM move_settlements ms
       JOIN units u ON ms.unit_id = u.id
       JOIN tenants ot ON ms.outgoing_tenant_id = ot.id
       WHERE ms.unit_id = ? AND ms.status != 'cancelled'
       ORDER BY ms.created_at DESC`,
      [session.user.unitId]
    );

    const result = settlements.map((row) => ({
      id: row.id,
      unitNumber: row.unit_number,
      billYear: row.bill_year,
      billMonth: row.bill_month,
      settlementDate: row.settlement_date,
      outgoingName: row.outgoing_name,
      outgoingUsage: row.outgoing_usage,
      estimatedTotalAmount: row.estimated_total_amount,
      status: row.status,
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
