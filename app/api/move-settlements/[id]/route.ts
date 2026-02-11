import { NextRequest, NextResponse } from 'next/server';
import { moveSettlementService } from '@/lib/services/move-settlement.service';
import { RegisterIncomingTenantRequest } from '@/types/move-settlement';

// 이사 정산 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await moveSettlementService.getSettlementDetail(parseInt(id));

    if (!detail) {
      return NextResponse.json(
        { success: false, message: '이사 정산을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('이사 정산 상세 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 이사 정산 수정 (입주자 등록, 상태 변경)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settlementId = parseInt(id);
    const body = await request.json();

    // 입주자 등록
    if (body.action === 'registerIncomingTenant') {
      const tenantRequest: RegisterIncomingTenantRequest = {
        name: body.name,
        contact: body.contact,
        email: body.email,
        moveInDate: body.moveInDate,
        moveInReading: body.moveInReading,
      };

      if (!tenantRequest.name || !tenantRequest.moveInDate || tenantRequest.moveInReading == null) {
        return NextResponse.json(
          { success: false, message: '입주자 이름, 입주일, 계량기값은 필수입니다.' },
          { status: 400 }
        );
      }

      const result = await moveSettlementService.registerIncomingTenant(
        settlementId,
        tenantRequest
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // 상태 변경
    if (body.action === 'updateStatus') {
      const status = body.status as 'completed' | 'cancelled';
      if (!['completed', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { success: false, message: '유효하지 않은 상태값입니다.' },
          { status: 400 }
        );
      }

      const result = await moveSettlementService.updateSettlementStatus(settlementId, status);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: '유효하지 않은 action입니다.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('이사 정산 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
