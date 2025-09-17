import { NextRequest, NextResponse } from 'next/server';
import { UnitBillsService } from '@/lib/services/unit-bills.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthlyBillId = searchParams.get('monthlyBillId');
    const unitNumber = searchParams.get('unitNumber');

    const service = new UnitBillsService();

    if (monthlyBillId) {
      // 특정 월의 모든 호실 청구서 조회
      const bills = await service.getMonthlyUnitBills(parseInt(monthlyBillId));

      return NextResponse.json({
        success: true,
        data: bills,
        count: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)
      });
    }

    if (unitNumber) {
      // 특정 호실의 청구 이력 조회
      const history = await service.getUnitBillHistory(unitNumber);

      return NextResponse.json({
        success: true,
        unitNumber,
        data: history,
        count: history.length
      });
    }

    // 미납 청구서 조회
    const unpaidBills = await service.getUnpaidBills();

    return NextResponse.json({
      success: true,
      type: 'unpaid',
      data: unpaidBills,
      count: unpaidBills.length,
      totalAmount: unpaidBills.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)
    });

  } catch (error: any) {
    console.error('Unit bills API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 납부 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitBillId, status, paymentDate } = body;

    if (!unitBillId || !status) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const service = new UnitBillsService();
    const result = await service.updatePaymentStatus(
      unitBillId,
      status,
      paymentDate ? new Date(paymentDate) : undefined
    );

    return NextResponse.json({
      success: result,
      message: result ? '납부 상태가 업데이트되었습니다.' : '업데이트에 실패했습니다.'
    });

  } catch (error: any) {
    console.error('Unit bills PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}