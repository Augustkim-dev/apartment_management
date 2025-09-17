import * as XLSX from 'xlsx';
import { CalculationResult, ExcelRowData, UnitBillCalculation } from '@/types/calculation';

/**
 * Excel 출력 포맷터
 */
export class ExcelFormatter {
  /**
   * 계산 결과를 Excel 파일로 변환
   */
  async createExcelFile(
    result: CalculationResult,
    metadata: {
      buildingName: string;
      year: number;
      month: number;
      contractType?: string;
      contractPower?: number;
      totalCharges: any;
    }
  ): Promise<Buffer> {
    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 시트명 설정
    const sheetName = `${metadata.year}.${String(metadata.month).padStart(2, '0')}월_계산`;

    // 데이터 준비
    const sheetData = this.prepareSheetData(result, metadata);

    // 워크시트 생성
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // 셀 스타일 설정 (너비 조정)
    worksheet['!cols'] = [
      { wch: 8 },   // 호
      { wch: 15 },  // 이사일
      { wch: 20 },  // 검침일자
      { wch: 12 },  // 전기누적값
      { wch: 12 },  // 전기기준값
      { wch: 12 },  // 전기사용량
      { wch: 12 },  // 기본료
      { wch: 12 },  // 전력량요금
      { wch: 12 },  // 기후환경요금
      { wch: 12 },  // 연료비조정액
      { wch: 12 },  // 역률요금
      { wch: 12 },  // 합계
      { wch: 12 },  // 부가세
      { wch: 12 },  // 전력기금
      { wch: 15 },  // 청구액
    ];

    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Buffer로 변환
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  }

  /**
   * 시트 데이터 준비
   */
  private prepareSheetData(
    result: CalculationResult,
    metadata: any
  ): any[][] {
    const data: any[][] = [];

    // 1. 제목 행
    const titleText = `${metadata.buildingName} ${metadata.month}월분 (${metadata.year}년 ${metadata.month-1}월 10일 ~ ${metadata.year}년 ${metadata.month}월 9일 까지)`;
    data.push([
      titleText,
      metadata.totalCharges.totalAmount,
      '', '', '', '', '', '', '', '', '', '', ''
    ]);

    // 2. 계약 정보 행
    data.push([
      `계약 종별 : ${metadata.contractType || '일반용(을) 고압A'}`,
      `계약전력 : ${metadata.contractPower || 700}Kw`,
      '',
      '기본료',
      '전력량요금',
      '기후환경요금',
      '연료비조정액',
      '역률요금',
      '합계',
      '부가세',
      '전력기금',
      '청구액'
    ]);

    // 3. 헤더 행
    data.push([
      '호',
      '이사일',
      '검침 일자',
      '전기누적값',
      '전기기준값',
      '전기사용량 (Kwh)',
      metadata.totalCharges.basicFee,
      metadata.totalCharges.powerFee,
      metadata.totalCharges.climateFee,
      metadata.totalCharges.fuelFee,
      metadata.totalCharges.powerFactorFee,
      metadata.totalCharges.basicFee + metadata.totalCharges.powerFee +
        metadata.totalCharges.climateFee + metadata.totalCharges.fuelFee +
        metadata.totalCharges.powerFactorFee,
      metadata.totalCharges.vat,
      metadata.totalCharges.powerFund
    ]);

    // 4. 전체 합계 행 (첫 번째 데이터 행)
    const totalUsage = result.unitBills.reduce((sum, bill) => sum + bill.usage, 0);
    const totalBasicFee = result.unitBills.reduce((sum, bill) => sum + bill.basicFee, 0);
    const totalPowerFee = result.unitBills.reduce((sum, bill) => sum + bill.powerFee, 0);
    const totalClimateFee = result.unitBills.reduce((sum, bill) => sum + bill.climateFee, 0);
    const totalFuelFee = result.unitBills.reduce((sum, bill) => sum + bill.fuelFee, 0);
    const totalPowerFactorFee = result.unitBills.reduce((sum, bill) => sum + bill.powerFactorFee, 0);
    const totalVat = result.unitBills.reduce((sum, bill) => sum + bill.vat, 0);
    const totalPowerFund = result.unitBills.reduce((sum, bill) => sum + bill.powerFund, 0);

    data.push([
      '',
      '',
      result.unitBills[0]?.billingPeriod || '',
      result.unitBills.reduce((sum, bill) => sum + bill.previousReading, 0),
      result.unitBills.reduce((sum, bill) => sum + bill.currentReading, 0),
      totalUsage,
      '', // 비율 컬럼 (계산됨)
      totalBasicFee / metadata.totalCharges.basicFee,
      totalPowerFee / metadata.totalCharges.powerFee,
      totalClimateFee / metadata.totalCharges.climateFee,
      totalFuelFee / metadata.totalCharges.fuelFee,
      totalPowerFactorFee / metadata.totalCharges.powerFactorFee,
      '',
      totalVat / metadata.totalCharges.vat,
      totalPowerFund / metadata.totalCharges.powerFund
    ]);

    // 5. 각 호실별 데이터
    result.unitBills.forEach(bill => {
      data.push([
        bill.unitNumber,
        bill.moveInDate || '',
        '', // 검침일자는 전체 행에서 상속
        bill.previousReading,
        bill.currentReading,
        bill.usage,
        bill.totalAmount, // 임시로 총액을 먼저 표시
        bill.basicFee,
        bill.powerFee,
        bill.climateFee,
        bill.fuelFee,
        bill.powerFactorFee,
        bill.subtotal,
        bill.vat,
        bill.powerFund
      ]);
    });

    // 6. 마지막 합계 행
    data.push([]);
    data.push([
      '합계',
      '',
      '',
      '',
      '',
      totalUsage,
      '',
      totalBasicFee,
      totalPowerFee,
      totalClimateFee,
      totalFuelFee,
      totalPowerFactorFee,
      totalBasicFee + totalPowerFee + totalClimateFee + totalFuelFee + totalPowerFactorFee,
      totalVat,
      totalPowerFund,
      result.validation.calculatedTotal
    ]);

    return data;
  }

  /**
   * 간단한 CSV 형식으로 출력
   */
  toCSV(result: CalculationResult): string {
    const headers = [
      '호실',
      '사용량(kWh)',
      '기본료',
      '전력량요금',
      '기후환경요금',
      '연료비조정액',
      '역률요금',
      '부가세',
      '전력기금',
      '청구액'
    ];

    const rows = result.unitBills.map(bill => [
      bill.unitNumber,
      bill.usage,
      bill.basicFee,
      bill.powerFee,
      bill.climateFee,
      bill.fuelFee,
      bill.powerFactorFee,
      bill.vat,
      bill.powerFund,
      bill.totalAmount
    ]);

    // 합계 행 추가
    const totals = [
      '합계',
      result.unitBills.reduce((sum, b) => sum + b.usage, 0),
      result.unitBills.reduce((sum, b) => sum + b.basicFee, 0),
      result.unitBills.reduce((sum, b) => sum + b.powerFee, 0),
      result.unitBills.reduce((sum, b) => sum + b.climateFee, 0),
      result.unitBills.reduce((sum, b) => sum + b.fuelFee, 0),
      result.unitBills.reduce((sum, b) => sum + b.powerFactorFee, 0),
      result.unitBills.reduce((sum, b) => sum + b.vat, 0),
      result.unitBills.reduce((sum, b) => sum + b.powerFund, 0),
      result.validation.calculatedTotal
    ];

    rows.push(totals);

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}