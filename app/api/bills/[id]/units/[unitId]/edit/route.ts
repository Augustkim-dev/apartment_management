import { NextRequest, NextResponse } from 'next/server';
import { UnitBillsService } from '@/lib/services/unit-bills.service';
import { UnitBillEditRequest } from '@/types/unit-bill-edit';

const unitBillsService = new UnitBillsService();

/**
 * GET /api/bills/[id]/units/[unitId]/edit
 * 호실별 청구서 편집을 위한 데이터 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
    const monthlyBillId = parseInt(id);
    const unitBillId = parseInt(unitId);

    // 유효성 검사
    if (isNaN(monthlyBillId) || isNaN(unitBillId)) {
      return NextResponse.json(
        { error: '잘못된 ID 형식입니다.' },
        { status: 400 }
      );
    }

    // 데이터 조회
    const editData = await unitBillsService.getUnitBillEditData(monthlyBillId, unitBillId);

    if (!editData) {
      return NextResponse.json(
        { error: '청구서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(editData);
  } catch (error) {
    console.error('Error fetching unit bill edit data:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bills/[id]/units/[unitId]/edit
 * 호실별 청구서 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
    const monthlyBillId = parseInt(id);
    const unitBillId = parseInt(unitId);

    // 유효성 검사 - ID
    if (isNaN(monthlyBillId) || isNaN(unitBillId)) {
      return NextResponse.json(
        { error: '잘못된 ID 형식입니다.' },
        { status: 400 }
      );
    }

    // Request body 파싱
    const body: UnitBillEditRequest = await request.json();
    console.log('API 라우트 - 받은 데이터:', {
      monthlyBillId,
      unitBillId,
      editMode: body.editMode,
      usageAmount: body.usageAmount,
      usageRate: body.usageRate,
      totalAmount: body.totalAmount,
      editReason: body.editReason
    });

    // 유효성 검사 - 필수 항목
    if (!body.editReason || body.editReason.trim() === '') {
      return NextResponse.json(
        { error: '수정 사유를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!body.usageAmount || body.usageAmount <= 0) {
      return NextResponse.json(
        { error: '사용량은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    if (!body.totalAmount || body.totalAmount <= 0) {
      return NextResponse.json(
        { error: '총 청구액은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    if (!body.editMode || !['proportional', 'manual'].includes(body.editMode)) {
      return NextResponse.json(
        { error: '유효하지 않은 편집 모드입니다.' },
        { status: 400 }
      );
    }

    // 유효성 검사 - 검침 값
    if (body.currentReading !== undefined && body.previousReading !== undefined) {
      if (body.currentReading < body.previousReading) {
        return NextResponse.json(
          { error: '당월 지침이 전월 지침보다 작을 수 없습니다.' },
          { status: 400 }
        );
      }
    }

    // TODO: 실제 사용자 ID는 세션에서 가져와야 함
    const userId = 1;

    // 업데이트 실행
    console.log('서비스 호출 전 - 파라미터:', { unitBillId, monthlyBillId, userId });
    const result = await unitBillsService.updateUnitBill(
      unitBillId,
      monthlyBillId,
      body,
      userId
    );
    console.log('서비스 호출 후 - 결과:', result);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      console.error('업데이트 실패:', result);
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating unit bill:', error);
    return NextResponse.json(
      {
        error: '청구서 수정 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
