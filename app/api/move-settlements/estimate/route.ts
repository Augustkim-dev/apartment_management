import { NextRequest, NextResponse } from 'next/server';
import { estimationService } from '@/lib/services/estimation.service';

// 추정 금액 미리보기 (저장 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.unitId || body.meterReading == null) {
      return NextResponse.json(
        { success: false, message: '호실 ID와 계량기값은 필수입니다.' },
        { status: 400 }
      );
    }

    const result = await estimationService.estimatePreview(
      body.unitId,
      body.meterReading
    );

    return NextResponse.json({
      success: true,
      estimation: result,
    });
  } catch (error: any) {
    console.error('추정 금액 미리보기 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
