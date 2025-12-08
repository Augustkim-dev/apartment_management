import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db-utils';

interface UnitBill {
  id: number;
  bill_year: number;
  bill_month: number;
  total_amount: number;
  basic_fee: number;
  power_fee: number;
  vat: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  due_date: string;
  unit_number: string;
}

interface SummaryRow {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  total_count: number;
  paid_count: number;
  unpaid_count: number;
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

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const status = searchParams.get('status') || 'all'; // 'all', 'paid', 'unpaid'

    // 사용자의 입주/퇴거일
    const moveInDate = session.user.moveInDate || '2024-01-01';
    const moveOutDate = session.user.moveOutDate || '2099-12-31';

    // 상태 필터 조건 생성
    let statusCondition = '';
    if (status === 'paid') {
      statusCondition = "AND ub.payment_status = 'paid'";
    } else if (status === 'unpaid') {
      statusCondition = "AND ub.payment_status != 'paid'";
    }

    // 1. 전체 요약 통계 조회 (필터와 무관하게 전체 기준)
    const summaryResult = await query<SummaryRow[]>(`
      SELECT
        COALESCE(SUM(ub.total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN ub.payment_status = 'paid' THEN ub.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN ub.payment_status != 'paid' THEN ub.total_amount ELSE 0 END), 0) as unpaid_amount,
        COUNT(*) as total_count,
        SUM(CASE WHEN ub.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN ub.payment_status != 'paid' THEN 1 ELSE 0 END) as unpaid_count
      FROM unit_bills ub
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE ub.unit_id = ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) >= ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) <= ?
    `, [session.user.unitId, moveInDate, moveOutDate]);

    const summary = summaryResult[0] || {
      total_amount: 0,
      paid_amount: 0,
      unpaid_amount: 0,
      total_count: 0,
      paid_count: 0,
      unpaid_count: 0
    };

    // 2. 필터된 결과의 총 개수 조회 (페이징용)
    const countResult = await query<{ count: number }[]>(`
      SELECT COUNT(*) as count
      FROM unit_bills ub
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      WHERE ub.unit_id = ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) >= ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) <= ?
      ${statusCondition}
    `, [session.user.unitId, moveInDate, moveOutDate]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // 3. 청구서 목록 조회 (페이징 및 필터 적용)
    const bills = await query<UnitBill[]>(`
      SELECT
        ub.id,
        mb.bill_year,
        mb.bill_month,
        ub.total_amount,
        ub.basic_fee,
        ub.power_fee,
        ub.vat,
        ub.payment_status,
        ub.payment_date,
        ub.due_date,
        u.unit_number
      FROM unit_bills ub
      JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
      JOIN units u ON ub.unit_id = u.id
      WHERE ub.unit_id = ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) >= ?
      AND DATE(CONCAT(mb.bill_year, '-', LPAD(mb.bill_month, 2, '0'), '-01')) <= ?
      ${statusCondition}
      ORDER BY mb.bill_year DESC, mb.bill_month DESC
      LIMIT ? OFFSET ?
    `, [session.user.unitId, moveInDate, moveOutDate, limit, offset]);

    return NextResponse.json({
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary: {
        totalAmount: Number(summary.total_amount) || 0,
        paidAmount: Number(summary.paid_amount) || 0,
        unpaidAmount: Number(summary.unpaid_amount) || 0,
        totalCount: Number(summary.total_count) || 0,
        paidCount: Number(summary.paid_count) || 0,
        unpaidCount: Number(summary.unpaid_count) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching user bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
