import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { configService } from '@/lib/services/config-service';

// GET: 설정 내보내기 (JSON 형태로)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await configService.export();

    // 파일 다운로드로 응답
    const jsonString = JSON.stringify(configs, null, 2);
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

    return new Response(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="app-configs-${timestamp}.json"`
      }
    });
  } catch (error) {
    console.error('Failed to export settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export settings'
    }, { status: 500 });
  }
}