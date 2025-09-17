import { NextResponse } from 'next/server';
import { execute } from '@/lib/db-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { status } = await request.json();
    const { unitId: unitBillId } = await params;

    // 납부 상태 업데이트
    const paymentDate = status === 'paid' ? new Date() : null;

    await execute(`
      UPDATE unit_bills
      SET payment_status = ?, payment_date = ?
      WHERE id = ?
    `, [status, paymentDate, unitBillId]);

    return NextResponse.json({
      success: true,
      message: '납부 상태가 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('Payment status update error:', error);
    return NextResponse.json(
      { error: '납부 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}