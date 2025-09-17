import { NextRequest, NextResponse } from 'next/server';
import { ParseStorageService } from '@/lib/services/parse-storage';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data || !data.totalAmount) {
      return NextResponse.json(
        { success: false, error: 'PDF 데이터가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // 날짜 처리
    let startDate = null;
    let endDate = null;

    if (data.billYear && data.billMonth) {
      startDate = new Date(data.billYear, data.billMonth - 1, 10);
      endDate = new Date(data.billYear, data.billMonth, 9);
    } else if (data.billingPeriod?.start && data.billingPeriod?.end) {
      startDate = new Date(data.billingPeriod.start);
      endDate = new Date(data.billingPeriod.end);
    }

    // 필수 필드들을 기본값으로 채우기 (undefined를 null로 변환)
    const pdfDataComplete = {
      customerNumber: data.customerNumber ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      billingPeriod: {
        start: startDate,
        end: endDate,
      },
      previousReading: data.previousReading ?? null,
      currentReading: data.currentReading ?? null,
      totalUsage: data.totalUsage ?? 0,
      basicFee: data.basicFee ?? 0,
      powerFee: data.powerFee ?? 0,
      climateFee: data.climateFee ?? 0,
      fuelFee: data.fuelFee ?? 0,
      vat: data.vat ?? 0,
      powerFund: data.powerFund ?? 0,
      tvLicenseFee: data.tvLicenseFee ?? null,
      roundDown: data.roundDown ?? 0,
      totalAmount: data.totalAmount ?? 0,
      dueDate: data.dueDate ?? null,
      powerFactorFee: data.powerFactorFee ?? null,
      ...data // 나머지 필드 포함
    };

    // DB에 PDF 파싱 데이터 저장
    const storageService = new ParseStorageService();

    // PDF 데이터 저장 (파일 버퍼는 임시로 생성)
    const fileName = `pdf_${Date.now()}.pdf`;
    const fileBuffer = Buffer.from(JSON.stringify(data)); // 실제 PDF가 아닌 데이터를 저장
    const rawText = JSON.stringify(data); // 원본 텍스트로 JSON 사용

    const pdfId = await storageService.savePdfData(
      pdfDataComplete,
      fileName,
      fileBuffer,
      rawText,      // rawText
      [],           // warnings
      null,         // userId
      true          // replaceExisting
    );

    console.log('PDF data saved to database with ID:', pdfId);

    return NextResponse.json({
      success: true,
      data: data,
      pdfId,
      message: 'PDF 데이터가 저장되었습니다.'
    });
  } catch (error: any) {
    console.error('PDF save error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'PDF 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}