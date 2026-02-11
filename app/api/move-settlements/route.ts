import { NextRequest, NextResponse } from 'next/server';
import { moveSettlementService } from '@/lib/services/move-settlement.service';
import { MoveOutSettlementRequest, MoveSettlementListFilters } from '@/types/move-settlement';

// 이사 정산 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: MoveSettlementListFilters = {
      unitNumber: searchParams.get('unitNumber') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: (searchParams.get('status') as MoveSettlementListFilters['status']) || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const result = await moveSettlementService.getSettlements(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('이사 정산 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 이사 정산 생성 (퇴거 처리)
export async function POST(request: NextRequest) {
  try {
    const body: MoveOutSettlementRequest = await request.json();

    // 필수값 검증
    if (!body.unitId || !body.settlementDate || body.meterReading == null) {
      return NextResponse.json(
        { success: false, message: '호실 ID, 정산 일시, 계량기값은 필수입니다.' },
        { status: 400 }
      );
    }

    const result = await moveSettlementService.createMoveOutSettlement(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('이사 정산 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
