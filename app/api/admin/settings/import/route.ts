import { NextRequest, NextResponse } from 'next/server';
import { configService } from '@/lib/services/config-service';

// POST: 설정 가져오기 (JSON 파일 업로드)
export async function POST(request: NextRequest) {
  try {
    // TODO: 인증 확인 추가 필요
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File is required'
      }, { status: 400 });
    }

    // 파일 내용 읽기
    const text = await file.text();
    let configs;

    try {
      configs = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON file'
      }, { status: 400 });
    }

    // 유효성 검증
    if (!Array.isArray(configs)) {
      return NextResponse.json({
        success: false,
        error: 'File must contain an array of configurations'
      }, { status: 400 });
    }

    // 설정 가져오기
    await configService.import(configs);

    // 캐시 초기화
    configService.clearCache();

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${configs.length} configurations`,
      count: configs.length
    });
  } catch (error) {
    console.error('Failed to import settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import settings'
    }, { status: 500 });
  }
}