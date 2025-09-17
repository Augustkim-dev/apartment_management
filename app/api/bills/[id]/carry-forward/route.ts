import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const monthlyBillId = parseInt(params.id);

    // 현재 월별 청구서 정보 조회
    const currentBill = await query(
      `SELECT bill_year, bill_month
       FROM monthly_bills
       WHERE id = ?`,
      [monthlyBillId]
    );

    if (currentBill.length === 0) {
      return NextResponse.json(
        { success: false, error: '청구서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { bill_year, bill_month } = currentBill[0];

    // 이전 달 계산
    let prevYear = bill_year;
    let prevMonth = bill_month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = bill_year - 1;
    }

    // 이전 달 미납 청구서 조회
    const previousUnpaidBills = await query(
      `SELECT ub.*, u.unit_number
       FROM unit_bills ub
       JOIN units u ON ub.unit_id = u.id
       JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
       WHERE mb.bill_year = ?
       AND mb.bill_month = ?
       AND ub.payment_status IN ('pending', 'overdue')`,
      [prevYear, prevMonth]
    );

    if (previousUnpaidBills.length === 0) {
      return NextResponse.json({
        success: true,
        message: '이월할 미납금이 없습니다.',
        carriedForwardCount: 0
      });
    }

    // 트랜잭션으로 미납 이월 처리
    const result = await transaction(async (conn) => {
      let carriedForwardCount = 0;

      for (const unpaidBill of previousUnpaidBills) {
        // 현재 월의 해당 호실 청구서 업데이트
        const updateResult = await conn.execute(
          `UPDATE unit_bills
           SET unpaid_amount = unpaid_amount + ?,
               previous_month_total = ?,
               notes = CONCAT(IFNULL(notes, ''), ?)
           WHERE monthly_bill_id = ?
           AND unit_id = ?`,
          [
            unpaidBill.total_amount,
            unpaidBill.total_amount,
            `\n${prevYear}년 ${prevMonth}월 미납금 ${unpaidBill.total_amount}원 이월`,
            monthlyBillId,
            unpaidBill.unit_id
          ]
        );

        if (updateResult.affectedRows > 0) {
          carriedForwardCount++;

          // unpaid_history에 미납 이력 추가
          await conn.execute(
            `INSERT INTO unpaid_history
             (unit_id, unit_bill_id, bill_year, bill_month, unpaid_amount, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              unpaidBill.unit_id,
              unpaidBill.id,
              prevYear,
              prevMonth,
              unpaidBill.total_amount,
              `${prevYear}년 ${prevMonth}월 청구액 미납`
            ]
          );

          // 이전 달 청구서 상태를 'overdue'로 업데이트
          await conn.execute(
            `UPDATE unit_bills
             SET payment_status = 'overdue'
             WHERE id = ?
             AND payment_status = 'pending'`,
            [unpaidBill.id]
          );
        }
      }

      return { carriedForwardCount };
    });

    return NextResponse.json({
      success: true,
      message: `${result.carriedForwardCount}개 호실의 미납금이 이월되었습니다.`,
      carriedForwardCount: result.carriedForwardCount,
      unpaidBills: previousUnpaidBills.map(bill => ({
        unitNumber: bill.unit_number,
        amount: bill.total_amount
      }))
    });

  } catch (error) {
    console.error('Carry forward error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '미납금 이월 처리 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}