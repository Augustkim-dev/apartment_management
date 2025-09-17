import { NextRequest, NextResponse } from 'next/server';
import { KepcoInvoiceParser } from '@/lib/parsers/pdf-parser-simple';
import { ParseStorageService } from '@/lib/services/parse-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('PDF upload API called');
    
    // 인증 체크 (현재는 임시로 스킵, Phase 5에서 구현)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    // FormData에서 파일 추출
    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error('FormData parse error:', e);
      return NextResponse.json(
        { success: false, error: 'FormData 파싱 실패' },
        { status: 400 }
      );
    }
    
    const file = formData.get('pdf') as File;
    
    if (!file) {
      console.error('No PDF file in request');
      return NextResponse.json(
        { success: false, error: 'PDF 파일이 없습니다.' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, 'Size:', file.size);

    // 파일을 Buffer로 변환
    let buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log('Buffer created, size:', buffer.length);
    } catch (e) {
      console.error('Buffer conversion error:', e);
      return NextResponse.json(
        { success: false, error: 'PDF 파일 변환 실패' },
        { status: 400 }
      );
    }

    // PDF 파싱
    console.log('Starting PDF parsing...');
    const parser = new KepcoInvoiceParser();
    let result;
    try {
      result = await parser.parse(buffer);
      console.log('PDF parsing result:', result);
    } catch (e) {
      console.error('PDF parsing error:', e);
      return NextResponse.json(
        { success: false, error: `PDF 파싱 오류: ${e}` },
        { status: 400 }
      );
    }

    if (!result.success) {
      console.error('PDF parsing failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // DB에 파싱 데이터 저장
    console.log('Saving to database...');
    const storageService = new ParseStorageService();
    let pdfId;
    let isReplacement = false;
    
    try {
      // 파일명에 타임스탬프 추가하여 중복 방지
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      
      // 먼저 일반 저장 시도
      try {
        pdfId = await storageService.savePdfData(
          result.data!,
          fileName,
          buffer,
          '', // raw text는 파서에서 추출
          result.warnings,
          userId ? parseInt(userId) : undefined,
          false // replaceExisting = false
        );
        console.log('Saved to database with ID:', pdfId);
      } catch (e: any) {
        // 중복 파일인 경우 교체 모드로 재시도
        if (e.message.includes('동일한 PDF')) {
          console.log('Duplicate file detected, replacing existing data...');
          isReplacement = true;
          
          pdfId = await storageService.savePdfData(
            result.data!,
            fileName,
            buffer,
            '', // raw text는 파서에서 추출
            result.warnings,
            userId ? parseInt(userId) : undefined,
            true // replaceExisting = true
          );
          console.log('Replaced existing data with new ID:', pdfId);
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

    return NextResponse.json({
      success: true,
      data: result.data,
      pdfId,
      warnings: result.warnings,
      message: isReplacement 
        ? 'PDF 파일이 재업로드되어 기존 데이터가 교체되었습니다.' 
        : 'PDF 파싱 및 저장이 완료되었습니다.',
      isReplacement,
    });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}