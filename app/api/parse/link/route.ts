import { NextRequest, NextResponse } from 'next/server';
import { ParseStorageService } from '@/lib/services/parse-storage';

export async function POST(request: NextRequest) {
  try {
    const { pdfId, excelId, year, month } = await request.json();

    if (!pdfId || !excelId || !year || !month) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const storageService = new ParseStorageService();
    const monthlyBillId = await storageService.linkToMonthlyBill(
      pdfId,
      excelId,
      year,
      month
    );

    return NextResponse.json({
      success: true,
      monthlyBillId,
      message: '월별 청구서가 생성되었습니다.',
    });
  } catch (error: any) {
    console.error('Link error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}