import { NextRequest, NextResponse } from 'next/server';
import { execute, transaction } from '@/lib/db-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { unitBillIds, paymentMethod = 'bank_transfer' } = body;

    if (!unitBillIds || !Array.isArray(unitBillIds) || unitBillIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '납부 처리할 항목을 선택해주세요.' },
        { status: 400 }
      );
    }

    const monthlyBillId = parseInt(params.id);
    const paymentDate = new Date().toISOString().split('T')[0];

    // 트랜잭션으로 일괄 처리
    const result = await transaction(async (conn) => {
      let processedCount = 0;

      for (const unitBillId of unitBillIds) {
        // unit_bills 테이블 업데이트
        const updateResult = await conn.execute(
          `UPDATE unit_bills
           SET payment_status = 'paid',
               payment_date = ?,
               payment_method = ?,
               unpaid_amount = 0,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
           AND monthly_bill_id = ?
           AND payment_status != 'paid'`,
          [paymentDate, paymentMethod, unitBillId, monthlyBillId]
        );

        if (updateResult.affectedRows > 0) {
          processedCount++;

          // unpaid_history 테이블 업데이트 (해당 호실의 미납 이력)
          await conn.execute(
            `UPDATE unpaid_history uh
             JOIN unit_bills ub ON uh.unit_id = ub.unit_id
             SET uh.is_paid = TRUE,
                 uh.paid_date = ?,
                 uh.updated_at = CURRENT_TIMESTAMP
             WHERE ub.id = ?
             AND uh.is_paid = FALSE`,
            [paymentDate, unitBillId]
          );

          // bill_history에 변경 이력 추가
          await conn.execute(
            `INSERT INTO bill_history (unit_bill_id, action, new_values, changed_at)
             VALUES (?, 'paid', ?, CURRENT_TIMESTAMP)`,
            [unitBillId, JSON.stringify({
              payment_status: 'paid',
              payment_date: paymentDate,
              payment_method: paymentMethod
            })]
          );
        }
      }

      return {
        processedCount,
        totalRequested: unitBillIds.length
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.processedCount}개 호실의 납부 처리가 완료되었습니다.`,
      processedCount: result.processedCount,
      totalRequested: result.totalRequested
    });

  } catch (error) {
    console.error('Bulk payment processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '납부 처리 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}