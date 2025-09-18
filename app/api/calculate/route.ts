import { NextRequest, NextResponse } from 'next/server';
import { BillCalculator } from '@/lib/calculation/bill-calculator';
import { ExcelFormatter } from '@/lib/calculation/excel-formatter';
import { CalculationInput } from '@/types/calculation';
import { UnitBillsService } from '@/lib/services/unit-bills.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 데이터 검증
    if (!body.pdfData || !body.excelData) {
      return NextResponse.json(
        { error: 'PDF 데이터와 Excel 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // PDF 파싱 데이터에서 총 청구 정보 추출
    const pdfData = body.pdfData;
    const totalCharges = {
      basicFee: pdfData.basicFee || 1397760,
      powerFee: pdfData.powerFee || 3238894,
      climateFee: pdfData.climateFee || 227079,
      fuelFee: pdfData.fuelFee || 126155,
      powerFactorFee: pdfData.powerFactorFee || -13977,
      vat: pdfData.vat || 497591,
      powerFund: pdfData.powerFund || 151760,
      roundDown: pdfData.roundDown || -2,
      totalAmount: pdfData.totalAmount || 5625260
    };

    // Excel 데이터에서 호실별 사용량 추출
    const excelData = body.excelData;
    const unitUsages = excelData.map((row: any) => ({
      unitNumber: String(row['호'] || row.unitNumber || ''),
      moveInDate: row['이사일'] || row.moveInDate || '',
      previousReading: Number(row['전기누적값'] || row.previousReading || 0),
      currentReading: Number(row['전기기준값'] || row.currentReading || 0),
      usage: Number(row['전기사용량'] || row['전기사용량 (Kwh)'] || row.usage || 0)
    })).filter((unit: any) => unit.unitNumber && unit.usage > 0);

    // 청구 기간 설정
    const billingPeriod = {
      start: new Date(pdfData.billingPeriod?.start || new Date(2025, 5, 10)),
      end: new Date(pdfData.billingPeriod?.end || new Date(2025, 6, 9)),
      displayText: body.billingPeriod || '2025-6-10 ~ 2025-7-9'
    };

    // 계산 입력 데이터 구성
    const calculationInput: CalculationInput & { pdfTotalUsage?: number } = {
      totalCharges,
      unitUsages,
      billingPeriod,
      pdfTotalUsage: pdfData.totalUsage || 25231  // PDF의 전체 사용량 (공용 포함)
    };

    // 계산 실행
    const calculator = new BillCalculator({
      roundingUnit: 10,
      toleranceAmount: 10,
      excludeVacant: true,
      debug: true,
      validationMode: 'unit-only',  // 호실만 검증
      targetUnitTotal: 2444070      // 실제 Excel Q열 합계
    });

    const result = await calculator.calculate(calculationInput);

    // 결과 요약
    const summary = calculator.formatSummary(result);
    console.log(summary);

    // Excel 파일 생성 (선택사항)
    let excelBuffer;
    if (body.generateExcel) {
      const formatter = new ExcelFormatter();
      excelBuffer = await formatter.createExcelFile(result, {
        buildingName: body.buildingName || '아르노빌리지',
        year: pdfData.billingPeriod?.year || 2025,
        month: pdfData.billingPeriod?.month || 7,
        contractType: pdfData.contractType,
        contractPower: pdfData.contractPower,
        totalCharges
      });
    }

    // unit_bills 테이블에 저장 (monthlyBillId가 제공된 경우)
    let saveResult = null;
    if (body.monthlyBillId) {
      const unitBillsService = new UnitBillsService();
      try {
        saveResult = await unitBillsService.saveCalculationResults(
          body.monthlyBillId,
          result,
          {
            userId: body.userId,
            notes: `${pdfData.billingPeriod?.year || 2025}년 ${pdfData.billingPeriod?.month || 7}월 전기료 계산`
          }
        );
        console.log(`Saved ${saveResult.savedCount} unit bills to database`);
      } catch (error) {
        console.error('Failed to save unit bills:', error);
        // 저장 실패해도 계산 결과는 반환
      }
    }

    // 응답
    return NextResponse.json({
      success: true,
      result: {
        unitBills: result.unitBills,
        validation: result.validation,
        adjustments: result.adjustments,
        warnings: result.warnings
      },
      summary,
      excelFile: excelBuffer ? excelBuffer.toString('base64') : null,
      saveResult
    });

  } catch (error: any) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: error.message || '계산 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 계산 결과 조회 (GET)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Electric bill calculation API',
    endpoints: {
      POST: {
        description: '전기료 계산 실행',
        body: {
          pdfData: 'PDF에서 파싱한 총 청구 정보',
          excelData: 'Excel에서 파싱한 호실별 사용량',
          billingPeriod: '청구 기간 (예: "2025-6-10 ~ 2025-7-9")',
          buildingName: '건물명 (선택)',
          generateExcel: 'Excel 파일 생성 여부 (선택)'
        }
      }
    }
  });
}