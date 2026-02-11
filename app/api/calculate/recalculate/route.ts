import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db-utils';
import { BillCalculator } from '@/lib/calculation/bill-calculator';
import { UnitBillsService } from '@/lib/services/unit-bills.service';
import { CalculationInput } from '@/types/calculation';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { year, month, billId, force } = body;

    // Step 1: billId로부터 year/month 조회
    if (billId && (!year || !month)) {
      const bills = await query<RowDataPacket[]>(
        'SELECT bill_year, bill_month FROM monthly_bills WHERE id = ?',
        [billId]
      );
      if (bills.length === 0) {
        return NextResponse.json(
          { success: false, error: '청구서를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      year = bills[0].bill_year;
      month = bills[0].bill_month;
    }

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'year/month 또는 billId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Step 2: 최신 parsed_pdf_data 조회
    const monthStr = String(month);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0)
      .toISOString().split('T')[0];

    // billing_period 기반 조회 시도
    let pdfResults = await query<RowDataPacket[]>(
      `SELECT * FROM parsed_pdf_data
       WHERE billing_period_start >= ? AND billing_period_end <= ?
       ORDER BY parsed_at DESC LIMIT 1`,
      [startDate, endDate]
    );

    // fallback: file_name 패턴 매칭
    if (pdfResults.length === 0) {
      pdfResults = await query<RowDataPacket[]>(
        `SELECT * FROM parsed_pdf_data
         WHERE file_name LIKE ? OR file_name LIKE ?
         ORDER BY parsed_at DESC LIMIT 1`,
        [`%${year}.${monthStr}월%`, `%${year}년_${monthStr}월%`]
      );
    }

    // Step 3: 최신 parsed_excel_data 조회
    const excelResults = await query<RowDataPacket[]>(
      `SELECT * FROM parsed_excel_data
       WHERE file_name LIKE ? OR file_name LIKE ?
       ORDER BY parsed_at DESC LIMIT 1`,
      [`%${year}.${monthStr}월%`, `%${year}년_${monthStr}월%`]
    );

    // Step 4: 데이터 존재 여부 검증
    if (pdfResults.length === 0) {
      return NextResponse.json({
        success: false,
        missingData: 'pdf',
        message: '한전 청구서 데이터가 없습니다. PDF 데이터를 먼저 입력해주세요.',
      });
    }

    if (excelResults.length === 0) {
      return NextResponse.json({
        success: false,
        missingData: 'excel',
        message: '호실별 사용량 데이터가 없습니다. Excel 데이터를 먼저 입력해주세요.',
      });
    }

    // Step 5: 기존 납부 완료 호실 확인
    if (!force) {
      const paidCheck = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as paidCount FROM unit_bills ub
         JOIN monthly_bills mb ON ub.monthly_bill_id = mb.id
         WHERE mb.bill_year = ? AND mb.bill_month = ? AND ub.payment_status = 'paid'`,
        [year, month]
      );
      const paidCount = paidCheck[0]?.paidCount || 0;
      if (paidCount > 0) {
        return NextResponse.json({
          success: false,
          hasPaidBills: true,
          paidCount,
          message: `이미 납부 완료된 호실이 ${paidCount}개 있습니다. 재계산하면 납부 상태가 초기화됩니다.`,
        });
      }
    }

    // Step 6: PDF 데이터 변환
    const pdfRow = pdfResults[0];
    const totalCharges = {
      basicFee: Number(pdfRow.basic_fee) || 0,
      powerFee: Number(pdfRow.power_fee) || 0,
      climateFee: Number(pdfRow.climate_fee) || 0,
      fuelFee: Number(pdfRow.fuel_fee) || 0,
      powerFactorFee: Number(pdfRow.power_factor_fee) || 0,
      vat: Number(pdfRow.vat) || 0,
      powerFund: Number(pdfRow.power_fund) || 0,
      roundDown: Number(pdfRow.round_down) || 0,
      totalAmount: Number(pdfRow.total_amount) || 0,
    };
    const pdfTotalUsage = Number(pdfRow.total_usage) || 0;

    // Step 7: Excel 데이터 변환
    const excelRow = excelResults[0];
    let unitDataArray = excelRow.unit_data;
    if (typeof unitDataArray === 'string') {
      unitDataArray = JSON.parse(unitDataArray);
    }

    const unitUsages = (unitDataArray as any[])
      .map((item: any) => ({
        unitNumber: String(item.unitNumber || item['호'] || ''),
        moveInDate: item.moveInDate || item['이사일'] || '',
        previousReading: Number(item.previousReading || item['전기누적값'] || 0),
        currentReading: Number(item.currentReading || item['전기기준값'] || 0),
        usage: Number(item.usage || item['전기사용량'] || 0),
      }))
      .filter((unit: any) => unit.unitNumber && unit.usage > 0);

    // Step 8: monthly_bills 생성 (기존 것 삭제 후 재생성)
    const existing = await query<RowDataPacket[]>(
      'SELECT id FROM monthly_bills WHERE bill_year = ? AND bill_month = ?',
      [year, month]
    );

    if (existing.length > 0) {
      await execute(
        'DELETE FROM monthly_bills WHERE bill_year = ? AND bill_month = ?',
        [year, month]
      );
    }

    const billingPeriodStart = pdfRow.billing_period_start
      ? new Date(pdfRow.billing_period_start).toISOString().slice(0, 19).replace('T', ' ')
      : `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const billingPeriodEnd = pdfRow.billing_period_end
      ? new Date(pdfRow.billing_period_end).toISOString().slice(0, 19).replace('T', ' ')
      : new Date(Number(year), Number(month), 0).toISOString().slice(0, 19).replace('T', ' ');

    // 납부기한: 청구기간 종료 + 10일
    const dueDateObj = pdfRow.billing_period_end
      ? new Date(pdfRow.billing_period_end)
      : new Date(Number(year), Number(month), 0);
    dueDateObj.setDate(dueDateObj.getDate() + 10);
    const dueDate = dueDateObj.toISOString().slice(0, 19).replace('T', ' ');

    const billResult = await execute(
      `INSERT INTO monthly_bills (
        bill_year, bill_month, total_amount, total_usage,
        basic_fee, power_fee, climate_fee, fuel_fee,
        vat, power_fund, tv_license_fee, round_down,
        billing_period_start, billing_period_end, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        year, month,
        totalCharges.totalAmount, pdfTotalUsage,
        totalCharges.basicFee, totalCharges.powerFee,
        totalCharges.climateFee, totalCharges.fuelFee,
        totalCharges.vat, totalCharges.powerFund,
        Number(pdfRow.tv_license_fee) || 0,
        totalCharges.roundDown,
        billingPeriodStart, billingPeriodEnd, dueDate,
      ]
    );

    const monthlyBillId = billResult.insertId;

    // Step 9: BillCalculator 실행
    const billingPeriod = {
      start: pdfRow.billing_period_start
        ? new Date(pdfRow.billing_period_start)
        : new Date(Number(year), Number(month) - 1, 1),
      end: pdfRow.billing_period_end
        ? new Date(pdfRow.billing_period_end)
        : new Date(Number(year), Number(month), 0),
      displayText: `${year}년 ${month}월`,
    };

    const calculationInput: CalculationInput & { pdfTotalUsage?: number } = {
      totalCharges,
      unitUsages,
      billingPeriod,
      pdfTotalUsage,
    };

    const calculator = new BillCalculator({
      roundingUnit: 10,
      toleranceAmount: 10,
      excludeVacant: true,
      debug: false,
      validationMode: 'unit-only',
    });

    const result = await calculator.calculate(calculationInput);

    // Step 10: unit_bills 저장
    const unitBillsService = new UnitBillsService();
    const saveResult = await unitBillsService.saveCalculationResults(
      monthlyBillId,
      result,
      {
        notes: `${year}년 ${month}월 전기료 재계산`,
      }
    );

    // parsed 데이터에 monthly_bill_id 연결
    await execute(
      'UPDATE parsed_pdf_data SET monthly_bill_id = ? WHERE id = ?',
      [monthlyBillId, pdfRow.id]
    );
    await execute(
      'UPDATE parsed_excel_data SET monthly_bill_id = ? WHERE id = ?',
      [monthlyBillId, excelRow.id]
    );

    console.log(`Recalculated ${year}-${month}: ${saveResult.savedCount} unit bills, total ${saveResult.totalAmount}`);

    return NextResponse.json({
      success: true,
      monthlyBillId,
      unitBillCount: saveResult.savedCount,
      totalAmount: saveResult.totalAmount,
      message: `${year}년 ${month}월 청구서가 재계산되었습니다. (${saveResult.savedCount}개 호실)`,
    });
  } catch (error: any) {
    console.error('Recalculate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재계산 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
