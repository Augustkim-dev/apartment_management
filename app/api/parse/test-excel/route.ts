import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { ParseStorageService } from '@/lib/services/parse-storage';
import { UnitUsageData } from '@/types/bill';

export async function GET() {
  try {
    // 샘플 Excel 데이터 생성
    const data = [
      ['호실', '전월지침', '당월지침', '사용량', '비고'],
      ['101', 1000, 1150, 150, ''],
      ['102', 950, 1080, 130, ''],
      ['103', 1200, 1380, 180, ''],
      ['104', 0, 0, 0, '공실'],
      ['105', 1100, 1250, 150, ''],
      ['106', 900, 1020, 120, ''],
      ['201', 1050, 1200, 150, ''],
      ['202', 980, 1110, 130, ''],
      ['203', 1150, 1320, 170, ''],
      ['204', 1000, 1160, 160, ''],
      ['205', 950, 1100, 150, ''],
      ['206', 1100, 1280, 180, ''],
    ];

    // 워크북 생성
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Buffer로 변환
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 파싱된 데이터 생성
    const unitData: UnitUsageData[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[3] > 0) { // 사용량이 있는 경우만
        unitData.push({
          unitNumber: String(row[0]),
          previousReading: Number(row[1]),
          currentReading: Number(row[2]),
          usage: Number(row[3]),
          notes: row[4] ? String(row[4]) : undefined,
        });
      }
    }
    
    // DB에 저장
    const timestamp = Date.now();
    const storageService = new ParseStorageService();
    const excelId = await storageService.saveExcelData(
      unitData,
      `test-usage-${timestamp}.xlsx`,
      Buffer.from(buffer),
      'Sheet1',
      { unit: 0, previous: 1, current: 2, usage: 3, notes: 4 },
      ['테스트 Excel 데이터입니다.'],
      1 // 테스트 사용자 ID
    );

    return NextResponse.json({
      success: true,
      message: '테스트 Excel 데이터가 저장되었습니다.',
      excelId,
      summary: {
        totalUnits: unitData.length,
        totalUsage: unitData.reduce((sum, unit) => sum + unit.usage, 0),
        averageUsage: unitData.reduce((sum, unit) => sum + unit.usage, 0) / unitData.length,
      },
      data: unitData,
    });
  } catch (error: any) {
    console.error('Test Excel error:', error);
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