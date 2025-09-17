import { NextResponse } from 'next/server';
import { ParseStorageService } from '@/lib/services/parse-storage';
import { KepcoInvoiceData } from '@/types/bill';

export async function GET() {
  try {
    // 테스트용 샘플 데이터 생성
    const sampleData: KepcoInvoiceData = {
      customerNumber: '1234567890',
      invoiceNumber: '202401-001',
      billingPeriod: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      },
      previousReading: 10000,
      currentReading: 15000,
      totalUsage: 5000,
      basicFee: 50000,
      powerFee: 450000,
      climateFee: 25000,
      fuelFee: -5000,
      vat: 52000,
      powerFund: 18000,
      tvLicenseFee: 2500,
      roundDown: -500,
      totalAmount: 592000,
      dueDate: new Date('2024-02-15'),
      issueDate: new Date('2024-02-01'),
    };

    // 테스트용 버퍼 생성 (매번 다른 내용으로)
    const timestamp = Date.now();
    const testBuffer = Buffer.from(`Test PDF Content ${timestamp}`);
    
    // DB에 저장
    const storageService = new ParseStorageService();
    const pdfId = await storageService.savePdfData(
      sampleData,
      `test-invoice-${timestamp}.pdf`,
      testBuffer,
      'Sample raw text from PDF',
      ['테스트 경고: 이것은 샘플 데이터입니다.'],
      1 // 테스트 사용자 ID
    );

    return NextResponse.json({
      success: true,
      message: '테스트 PDF 데이터가 저장되었습니다.',
      pdfId,
      data: sampleData,
    });
  } catch (error: any) {
    console.error('Test PDF error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}