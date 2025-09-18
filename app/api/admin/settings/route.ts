import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { configService } from '@/lib/services/config-service';

// GET: 설정값 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let data;
    if (category) {
      // 특정 카테고리만 조회
      data = await configService.getByCategory(category);
    } else {
      // 전체 설정 조회
      data = await configService.getAll();
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get settings'
    }, { status: 500 });
  }
}

// PUT: 설정값 업데이트
export async function PUT(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { configs } = body; // { key: value } 형태의 객체

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body'
      }, { status: 400 });
    }

    // 설정값 일괄 업데이트
    await configService.setMultiple(configs);

    // 캐시 초기화
    configService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update settings'
    }, { status: 500 });
  }
}