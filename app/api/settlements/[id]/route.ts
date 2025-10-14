import { NextRequest, NextResponse } from 'next/server';
import { UnitBillsService } from '@/lib/services/unit-bills.service';
import { PaymentUpdateRequest } from '@/types/settlement';

/**
 * PATCH /api/settlements/[id]
 * 특정 청구서의 납부 정보 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unitBillId = parseInt(params.id);

    if (isNaN(unitBillId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 청구서 ID입니다.' },
        { status: 400 }
      );
    }

    const body: PaymentUpdateRequest = await request.json();

    const service = new UnitBillsService();
    const result = await service.updatePaymentDetails(unitBillId, {
      paymentStatus: body.paymentStatus,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod
    });

    if (result) {
      return NextResponse.json({
        success: true,
        message: '납부 정보가 업데이트되었습니다.'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '업데이트에 실패했습니다.' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Settlement update API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '납부 정보 업데이트 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
