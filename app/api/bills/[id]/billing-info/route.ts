import { NextResponse } from 'next/server';
import { execute } from '@/lib/db-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params;
    const data = await request.json();
    const { billingPeriodStart, billingPeriodEnd, dueDate } = data;

    // 입력 검증
    if (!billingPeriodStart || !billingPeriodEnd || !dueDate) {
      return NextResponse.json(
        { error: '청구기간 시작일, 종료일, 납부기한은 필수입니다.' },
        { status: 400 }
      );
    }

    // 날짜 형식 변환 (ISO string to MySQL format)
    const formatDateForMySQL = (dateStr: string): string => {
      return new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ');
    };

    const formattedStartDate = formatDateForMySQL(billingPeriodStart);
    const formattedEndDate = formatDateForMySQL(billingPeriodEnd);
    const formattedDueDate = formatDateForMySQL(dueDate);

    // monthly_bills 테이블 업데이트
    await execute(
      `UPDATE monthly_bills
       SET billing_period_start = ?,
           billing_period_end = ?,
           due_date = ?
       WHERE id = ?`,
      [formattedStartDate, formattedEndDate, formattedDueDate, billId]
    );

    // unit_bills 테이블의 due_date도 함께 업데이트
    await execute(
      `UPDATE unit_bills
       SET due_date = ?
       WHERE monthly_bill_id = ?`,
      [formattedDueDate, billId]
    );

    return NextResponse.json({
      success: true,
      message: '청구 정보가 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('Billing info update error:', error);
    return NextResponse.json(
      { error: '청구 정보 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
