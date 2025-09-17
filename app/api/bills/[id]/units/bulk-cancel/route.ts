import { NextRequest, NextResponse } from 'next/server';
import { execute, transaction } from '@/lib/db-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { unitBillIds } = body;

    if (!unitBillIds || !Array.isArray(unitBillIds) || unitBillIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '납부 취소할 항목을 선택해주세요.' },
        { status: 400 }
      );
    }

    const monthlyBillId = parseInt(params.id);

    // 트랜잭션으로 일괄 처리
    const result = await transaction(async (conn) => {
      let cancelledCount = 0;

      for (const unitBillId of unitBillIds) {
        // unit_bills 테이블 업데이트 (납부 상태를 pending으로 변경)
        const updateResult = await conn.execute(
          `UPDATE unit_bills
           SET payment_status = 'pending',
               payment_date = NULL,
               payment_method = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
           AND monthly_bill_id = ?
           AND payment_status = 'paid'`,
          [unitBillId, monthlyBillId]
        );

        if (updateResult.affectedRows > 0) {
          cancelledCount++;

          // bill_history에 변경 이력 추가
          await conn.execute(
            `INSERT INTO bill_history (unit_bill_id, action, new_values, changed_at)
             VALUES (?, 'cancelled', ?, CURRENT_TIMESTAMP)`,
            [unitBillId, JSON.stringify({
              payment_status: 'pending',
              payment_date: null,
              payment_method: null
            })]
          );
        }
      }

      return {
        cancelledCount,
        totalRequested: unitBillIds.length
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.cancelledCount}개 호실의 납부가 취소되었습니다.`,
      cancelledCount: result.cancelledCount,
      totalRequested: result.totalRequested
    });

  } catch (error) {
    console.error('Bulk cancel processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '납부 취소 처리 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}