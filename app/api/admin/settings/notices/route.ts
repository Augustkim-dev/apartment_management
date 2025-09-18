import { NextRequest, NextResponse } from 'next/server';
import { configService, Notice } from '@/lib/services/config-service';

// GET: 납부 안내 목록 조회
export async function GET() {
  try {
    // TODO: 인증 확인 추가 필요
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const notices = await configService.getNotices();

    return NextResponse.json({
      success: true,
      data: notices
    });
  } catch (error) {
    console.error('Failed to get notices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get notices'
    }, { status: 500 });
  }
}

// POST: 납부 안내 추가
export async function POST(request: NextRequest) {
  try {
    // TODO: 인증 확인 추가 필요
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { text, type = 'info', active = true } = body;

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 });
    }

    // 기존 안내 목록 가져오기
    const currentNoticesJson = await configService.get('notices.payment_notices');
    let notices: Notice[] = currentNoticesJson || [];

    // 새 안내 추가
    const newNotice: Notice = {
      order: notices.length + 1,
      text,
      type: type as 'info' | 'warning' | 'important',
      active
    };

    notices.push(newNotice);

    // 업데이트
    await configService.updateNotices(notices);

    return NextResponse.json({
      success: true,
      data: newNotice
    });
  } catch (error) {
    console.error('Failed to add notice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add notice'
    }, { status: 500 });
  }
}

// PUT: 납부 안내 수정 (전체 목록 교체)
export async function PUT(request: NextRequest) {
  try {
    // TODO: 인증 확인 추가 필요
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { notices } = body;

    if (!Array.isArray(notices)) {
      return NextResponse.json({
        success: false,
        error: 'Notices must be an array'
      }, { status: 400 });
    }

    // 유효성 검증
    for (const notice of notices) {
      if (!notice.text || typeof notice.order !== 'number') {
        return NextResponse.json({
          success: false,
          error: 'Invalid notice format'
        }, { status: 400 });
      }
    }

    // 업데이트
    await configService.updateNotices(notices);

    return NextResponse.json({
      success: true,
      message: 'Notices updated successfully'
    });
  } catch (error) {
    console.error('Failed to update notices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update notices'
    }, { status: 500 });
  }
}

// DELETE: 납부 안내 삭제
export async function DELETE(request: NextRequest) {
  try {
    // TODO: 인증 확인 추가 필요
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const order = searchParams.get('order');

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order parameter is required'
      }, { status: 400 });
    }

    const orderNum = parseInt(order);

    // 기존 안내 목록 가져오기
    const currentNoticesJson = await configService.get('notices.payment_notices');
    let notices: Notice[] = currentNoticesJson || [];

    // 해당 순서의 안내 제거
    notices = notices.filter(n => n.order !== orderNum);

    // 순서 재정렬
    notices = notices.map((notice, index) => ({
      ...notice,
      order: index + 1
    }));

    // 업데이트
    await configService.updateNotices(notices);

    return NextResponse.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete notice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete notice'
    }, { status: 500 });
  }
}