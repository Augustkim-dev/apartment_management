import { NextRequest, NextResponse } from 'next/server';
import { UnitBillsService } from '@/lib/services/unit-bills.service';
import { SettlementFilters } from '@/types/settlement';

/**
 * GET /api/settlements
 * 정산 관리: 전체 호실의 청구 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: SettlementFilters = {
      unitNumber: searchParams.get('unitNumber') || undefined,
      userName: searchParams.get('userName') || undefined,
      phoneNumber: searchParams.get('phoneNumber') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      paymentStatus: (searchParams.get('paymentStatus') as any) || 'all',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    };

    const service = new UnitBillsService();
    const result = await service.getAllSettlements(filters);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Settlements API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '정산 데이터 조회 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
