import { NextRequest, NextResponse } from 'next/server';
import { UnitUsageParser } from '@/lib/parsers/excel-parser-flexible';
import { ParseStorageService } from '@/lib/services/parse-storage';

export async function POST(request: NextRequest) {
  try {
    // 인증 체크 (현재는 임시로 스킵, Phase 5에서 구현)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('excel')) as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Excel 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Excel 파싱
    const parser = new UnitUsageParser();
    const result = await parser.parse(buffer);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // DB에 파싱 데이터 저장
    const storageService = new ParseStorageService();
    
    // 파일명에 타임스탬프 추가하여 중복 방지
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    let excelId;
    let isReplacement = false;
    
    try {
      // 먼저 일반 저장 시도
      try {
        excelId = await storageService.saveExcelData(
          result.data!,
          fileName,
          buffer,
          'Sheet1', // 시트명은 파서에서 추출
          {}, // 컬럼 매핑 정보
          result.warnings,
          userId ? parseInt(userId) : undefined,
          false // replaceExisting = false
        );
        console.log('Saved to database with ID:', excelId);
      } catch (e: any) {
        // 중복 파일인 경우 교체 모드로 재시도
        if (e.message.includes('동일한 Excel')) {
          console.log('Duplicate file detected, replacing existing data...');
          isReplacement = true;
          
          excelId = await storageService.saveExcelData(
            result.data!,
            fileName,
            buffer,
            'Sheet1', // 시트명은 파서에서 추출
            {}, // 컬럼 매핑 정보
            result.warnings,
            userId ? parseInt(userId) : undefined,
            true // replaceExisting = true
          );
          console.log('Replaced existing data with new ID:', excelId);
        } else {
          throw e; // 다른 오류는 그대로 throw
        }
      }
    } catch (e: any) {
      console.error('Database save error:', e);
      return NextResponse.json(
        { success: false, error: `데이터베이스 저장 오류: ${e.message}` },
        { status: 500 }
      );
    }

    // 총 사용량 계산
    const totalUsage = result.data!.reduce((sum, unit) => sum + unit.usage, 0);

    return NextResponse.json({
      success: true,
      data: result.data,
      excelId,
      summary: {
        totalUnits: result.data!.length,
        totalUsage,
        averageUsage: totalUsage / result.data!.length,
      },
      warnings: result.warnings,
      message: isReplacement 
        ? 'Excel 파일이 재업로드되어 기존 데이터가 교체되었습니다.' 
        : 'Excel 파싱 및 저장이 완료되었습니다.',
      isReplacement,
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}